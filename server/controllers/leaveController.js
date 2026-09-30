const leaveService = require("../services/leaveService");

function pagination(query = {}) {
    const limit = Number(query.limit ?? 100);
    const offset = Number(query.offset ?? 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0 || offset > 1000000) {
        const error = new Error("Invalid pagination parameters");
        error.statusCode = 400;
        throw error;
    }
    return { limit, offset };
}

async function listMine(req, res) {
    const { limit, offset } = pagination(req.query);
    const [requests, total] = await Promise.all([
        leaveService.listMemberRequests(req.user.id, { limit, offset }),
        leaveService.listMemberRequests(req.user.id, { limit: 1, offset: 0 }).then(() => null)
    ]);
    return res.json({ success: true, requests, pagination: { limit, offset, total: total ?? requests.length } });
}

async function getBalance(req, res) {
    const year = req.query.year === undefined ? new Date().getFullYear() : Number(req.query.year);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ success: false, message: "Invalid year." });
    }
    const balance = await leaveService.getMemberBalance(req.user.id, year);
    return res.json({ success: true, balance, year });
}

async function create(req, res) {
    const request = await leaveService.createRequest(req.user.id, req.body);
    return res.status(201).json({ success: true, message: "Leave request submitted successfully.", request });
}

async function cancel(req, res) {
    const request = await leaveService.cancelOwnRequest(req.user.id, req.params.id);
    return res.json({ success: true, message: "Leave request cancelled successfully.", request });
}

async function listAdmin(req, res) {
    const { limit, offset } = pagination(req.query);
    const result = await leaveService.getAdminData({
        limit,
        offset,
        status: String(req.query.status || "").trim(),
        leaveType: String(req.query.leaveType || "").trim().toLowerCase(),
        department: String(req.query.department || "").trim(),
        year: Number(req.query.year || new Date().getFullYear())
    });
    return res.json({
        success: true,
        requests: result.requests.items,
        pagination: { limit, offset, total: result.requests.total },
        stats: result.stats,
        balances: result.balances
    });
}

async function review(req, res) {
    const request = await leaveService.reviewRequest(
        req.user.id,
        req.params.id,
        req.body?.decision,
        req.body?.reviewerComment
    );
    return res.json({ success: true, message: "Leave request reviewed successfully.", request });
}

module.exports = { listMine, getBalance, create, cancel, listAdmin, review };
