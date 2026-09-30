const { pool } = require("../db");
const leaveRepository = require("../repositories/leaveRepository");

const LEAVE_TYPES = new Set(["holiday", "casual", "sick"]);
const STATUSES = new Set(["Pending", "Approved", "Rejected", "Cancelled"]);
const MAX_DAYS = 31;

function makeError(message, statusCode = 400, errors = null) {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (errors) error.errors = errors;
    return error;
}

function normalizeId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw makeError("Invalid leave request ID.", 400);
    return id;
}

function normalizeDate(value, field) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw makeError(`Invalid ${field} date.`, 400, { [field]: `Use YYYY-MM-DD format.` });
    }
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        throw makeError(`Invalid ${field} date.`, 400, { [field]: `Use a valid calendar date.` });
    }
    return value;
}

function calculateDays(startDate, endDate) {
    const start = new Date(`${startDate}T00:00:00Z`).getTime();
    const end = new Date(`${endDate}T00:00:00Z`).getTime();
    return Math.floor((end - start) / 86400000) + 1;
}

function validateCreateInput(input = {}) {
    const errors = {};
    const leaveType = String(input.leaveType || "").trim().toLowerCase();
    if (!LEAVE_TYPES.has(leaveType)) errors.leaveType = "Invalid leave type.";

    let startDate = "";
    let endDate = "";
    try { startDate = normalizeDate(input.startDate, "startDate"); } catch (error) { Object.assign(errors, error.errors || { startDate: error.message }); }
    try { endDate = normalizeDate(input.endDate, "endDate"); } catch (error) { Object.assign(errors, error.errors || { endDate: error.message }); }

    const days = startDate && endDate ? calculateDays(startDate, endDate) : 0;
    if (startDate && endDate && days <= 0) errors.endDate = "End date cannot be before the start date.";
    if (days > MAX_DAYS) errors.endDate = `Leave requests cannot exceed ${MAX_DAYS} calendar days.`;

    const reason = typeof input.reason === "string" ? input.reason.trim() : "";
    if (!reason) errors.reason = "Reason is required.";
    else if (reason.length > 1000) errors.reason = "Reason must not exceed 1000 characters.";

    if (Object.keys(errors).length) throw makeError("Please correct the leave request.", 400, errors);
    return { leaveType, startDate, endDate, days, reason };
}

async function getMemberData(userId, connection = pool) {
    const [rows] = await connection.query(
        "SELECT id, full_name AS fullName, department, position, status FROM users WHERE id = ? LIMIT 1",
        [userId]
    );
    return rows[0] || null;
}

async function createRequest(userId, input) {
    const data = validateCreateInput(input);
    const year = Number(data.startDate.slice(0, 4));
    if (year !== new Date().getFullYear()) {
        throw makeError("Leave requests can only be submitted for the current year.", 400);
    }

    const member = await getMemberData(userId);
    if (!member || member.status !== "active") throw makeError("Active member account required.", 403);

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await leaveRepository.ensureBalances(userId, year, connection);

        const overlap = await leaveRepository.findActiveOverlap(userId, data.startDate, data.endDate, connection);
        if (overlap) throw makeError("This leave period overlaps an existing pending or approved request.", 409);

        const balance = await leaveRepository.getBalance(userId, data.leaveType, year, connection);
        if (!balance) throw makeError("Leave balance is unavailable.", 409);
        if (data.days > balance.remaining) {
            throw makeError(`Insufficient ${data.leaveType} leave balance. Remaining: ${balance.remaining} day(s).`, 409);
        }

        const request = await leaveRepository.createRequest({ userId, ...data }, connection);
        await connection.commit();
        return request;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function listMemberRequests(userId, options) {
    return leaveRepository.listForUser(userId, options);
}

async function getMemberBalance(userId, year = new Date().getFullYear()) {
    return leaveRepository.getBalancesForUser(userId, Number(year));
}

async function cancelOwnRequest(userId, requestId) {
    const id = normalizeId(requestId);
    const request = await leaveRepository.findRequestById(id);
    if (!request) throw makeError("Leave request not found.", 404);
    if (Number(request.userId) !== Number(userId)) throw makeError("You can only cancel your own leave request.", 403);
    if (request.status !== "Pending") throw makeError("Only pending leave requests can be cancelled.", 409);
    return leaveRepository.cancelRequest(id);
}

async function reviewRequest(reviewerId, requestId, decision, reviewerComment = "") {
    const id = normalizeId(requestId);
    const normalizedDecision = String(decision || "").trim().toLowerCase();
    if (!["approve", "reject"].includes(normalizedDecision)) throw makeError("Invalid leave decision.", 400);

    const comment = typeof reviewerComment === "string" ? reviewerComment.trim() : "";
    if (comment.length > 1000) throw makeError("Reviewer comment must not exceed 1000 characters.", 400);

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const request = await leaveRepository.findRequestById(id, connection);
        if (!request) throw makeError("Leave request not found.", 404);
        if (request.status !== "Pending") throw makeError("Only pending leave requests can be reviewed.", 409);

        if (normalizedDecision === "approve") {
            const year = Number(String(request.startDate).slice(0, 4));
            await leaveRepository.ensureBalances(request.userId, year, connection);
            const balance = await leaveRepository.getBalance(request.userId, request.leaveType, year, connection);
            if (!balance || Number(request.duration) > balance.remaining) {
                throw makeError("The requested leave no longer fits the member's remaining balance.", 409);
            }
        }

        const updated = await leaveRepository.updateStatus(id, {
            status: normalizedDecision === "approve" ? "Approved" : "Rejected",
            reviewerId,
            reviewerComment: comment || null
        }, connection);
        await connection.commit();
        return updated;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function getAdminData(options = {}) {
    const year = Number(options.year || new Date().getFullYear());
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw makeError("Invalid year.", 400);
    const [requests, stats, balances] = await Promise.all([
        leaveRepository.listAdmin(options),
        leaveRepository.getStats(year),
        leaveRepository.getAllBalances(year)
    ]);
    return { requests, stats, balances };
}

module.exports = {
    createRequest,
    listMemberRequests,
    getMemberBalance,
    cancelOwnRequest,
    reviewRequest,
    getAdminData,
    LEAVE_TYPES,
    STATUSES
};
