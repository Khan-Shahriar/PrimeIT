const { pool } = require("../db");

const REQUEST_FIELDS = `
    lr.id AS requestId,
    lr.user_id AS userId,
    u.full_name AS memberName,
    u.email AS memberEmail,
    u.department AS department,
    u.position AS position,
    lr.leave_type AS leaveType,
    lr.start_date AS startDate,
    lr.end_date AS endDate,
    lr.days AS duration,
    lr.reason AS reason,
    lr.status AS status,
    lr.submitted_at AS submittedAt,
    lr.reviewed_at AS reviewedAt,
    lr.reviewed_by AS reviewedById,
    reviewer.full_name AS reviewedBy,
    lr.reviewer_comment AS reviewerComment,
    lr.cancelled_at AS cancelledAt,
    lr.updated_at AS updatedAt
`;

async function ensureBalances(userId, year, connection = pool) {
    await connection.query(
        `INSERT IGNORE INTO leave_balances (user_id, leave_type, year)
         SELECT ?, types.leave_type, ?
         FROM (
             SELECT 'holiday' AS leave_type
             UNION ALL SELECT 'casual'
             UNION ALL SELECT 'sick'
         ) types`,
        [userId, year]
    );
}

async function findRequestById(id, connection = pool) {
    const [rows] = await connection.query(
        `SELECT ${REQUEST_FIELDS}
         FROM leave_requests lr
         INNER JOIN users u ON u.id = lr.user_id
         LEFT JOIN users reviewer ON reviewer.id = lr.reviewed_by
         WHERE lr.id = ?
         LIMIT 1`,
        [id]
    );
    return rows[0] || null;
}

async function listForUser(userId, { limit = 100, offset = 0 } = {}, connection = pool) {
    const [rows] = await connection.query(
        `SELECT ${REQUEST_FIELDS}
         FROM leave_requests lr
         INNER JOIN users u ON u.id = lr.user_id
         LEFT JOIN users reviewer ON reviewer.id = lr.reviewed_by
         WHERE lr.user_id = ?
         ORDER BY lr.submitted_at DESC, lr.id DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
    );
    return rows;
}

async function countForUser(userId, connection = pool) {
    const [[row]] = await connection.query(
        "SELECT COUNT(*) AS total FROM leave_requests WHERE user_id = ?",
        [userId]
    );
    return Number(row.total);
}

async function findActiveOverlap(userId, startDate, endDate, connection = pool) {
    const [rows] = await connection.query(
        `SELECT id
         FROM leave_requests
         WHERE user_id = ?
           AND status IN ('Pending','Approved')
           AND start_date <= ?
           AND end_date >= ?
         LIMIT 1`,
        [userId, endDate, startDate]
    );
    return rows[0] || null;
}

async function getBalance(userId, leaveType, year, connection = pool) {
    const [[row]] = await connection.query(
        `SELECT
            lb.leave_type AS leaveType,
            lb.year,
            lb.allowance,
            lb.adjustment,
            COALESCE(SUM(CASE WHEN lr.status = 'Approved' THEN lr.days ELSE 0 END), 0) AS approvedUsed,
            COALESCE(SUM(CASE WHEN lr.status = 'Pending' THEN lr.days ELSE 0 END), 0) AS pendingUsed
         FROM leave_balances lb
         LEFT JOIN leave_requests lr
           ON lr.user_id = lb.user_id
          AND lr.leave_type = lb.leave_type
          AND YEAR(lr.start_date) = lb.year
         WHERE lb.user_id = ?
           AND lb.leave_type = ?
           AND lb.year = ?
         GROUP BY lb.id, lb.leave_type, lb.year, lb.allowance, lb.adjustment`,
        [userId, leaveType, year]
    );
    if (!row) return null;
    const total = Number(row.allowance) + Number(row.adjustment);
    const approvedUsed = Number(row.approvedUsed);
    const pendingUsed = Number(row.pendingUsed);
    return {
        leaveType: row.leaveType,
        year: Number(row.year),
        total,
        used: approvedUsed,
        pending: pendingUsed,
        remaining: Math.max(0, total - approvedUsed - pendingUsed)
    };
}

async function getBalancesForUser(userId, year, connection = pool) {
    await ensureBalances(userId, year, connection);
    const result = {};
    for (const type of ["holiday", "casual", "sick"]) {
        result[type] = await getBalance(userId, type, year, connection);
    }
    return result;
}

async function getAllBalances(year, connection = pool) {
    const [rows] = await connection.query(
        `SELECT
            u.id AS userId,
            u.full_name AS memberName,
            lb.leave_type AS leaveType,
            lb.allowance,
            lb.adjustment,
            COALESCE(SUM(CASE WHEN lr.status = 'Approved' THEN lr.days ELSE 0 END), 0) AS approvedUsed,
            COALESCE(SUM(CASE WHEN lr.status = 'Pending' THEN lr.days ELSE 0 END), 0) AS pendingUsed
         FROM users u
         CROSS JOIN (
             SELECT 'holiday' AS leave_type
             UNION ALL SELECT 'casual'
             UNION ALL SELECT 'sick'
         ) types
         LEFT JOIN leave_balances lb
           ON lb.user_id = u.id
          AND lb.leave_type = types.leave_type
          AND lb.year = ?
         LEFT JOIN leave_requests lr
           ON lr.user_id = u.id
          AND lr.leave_type = types.leave_type
          AND YEAR(lr.start_date) = ?
         WHERE u.status = 'active'
         GROUP BY u.id, u.full_name, lb.leave_type, lb.allowance, lb.adjustment, types.leave_type
         ORDER BY u.full_name ASC, types.leave_type ASC`,
        [year, year]
    );
    return rows.map(row => {
        const total = Number(row.allowance ?? 6) + Number(row.adjustment ?? 0);
        const used = Number(row.approvedUsed);
        const pending = Number(row.pendingUsed);
        return {
            userId: Number(row.userId),
            memberName: row.memberName,
            leaveType: row.leaveType || row.leave_type,
            total,
            used,
            pending,
            remaining: Math.max(0, total - used - pending)
        };
    });
}

async function createRequest(data, connection = pool) {
    const [result] = await connection.query(
        `INSERT INTO leave_requests
         (user_id, leave_type, start_date, end_date, days, reason)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.userId, data.leaveType, data.startDate, data.endDate, data.days, data.reason]
    );
    return findRequestById(result.insertId, connection);
}

async function updateStatus(id, { status, reviewerId = null, reviewerComment = null }, connection = pool) {
    await connection.query(
        `UPDATE leave_requests
         SET status = ?,
             reviewed_at = NOW(),
             reviewed_by = ?,
             reviewer_comment = ?
         WHERE id = ?`,
        [status, reviewerId, reviewerComment, id]
    );
    return findRequestById(id, connection);
}

async function cancelRequest(id, connection = pool) {
    await connection.query(
        `UPDATE leave_requests
         SET status = 'Cancelled', cancelled_at = NOW()
         WHERE id = ?`,
        [id]
    );
    return findRequestById(id, connection);
}

async function getStats(year, connection = pool) {
    const [[totals]] = await connection.query(
        `SELECT
            COUNT(*) AS total,
            SUM(status = 'Pending') AS pending,
            SUM(status = 'Approved') AS approved,
            SUM(status = 'Rejected') AS rejected
         FROM leave_requests
         WHERE YEAR(start_date) = ?`,
        [year]
    );
    return {
        total: Number(totals.total || 0),
        pending: Number(totals.pending || 0),
        approved: Number(totals.approved || 0),
        rejected: Number(totals.rejected || 0)
    };
}

async function listAdmin({ limit = 100, offset = 0, status = "", leaveType = "", department = "" } = {}, connection = pool) {
    const conditions = [];
    const values = [];

    if (status) { conditions.push("lr.status = ?"); values.push(status); }
    if (leaveType) { conditions.push("lr.leave_type = ?"); values.push(leaveType); }
    if (department) { conditions.push("u.department = ?"); values.push(department); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await connection.query(
        `SELECT ${REQUEST_FIELDS}
         FROM leave_requests lr
         INNER JOIN users u ON u.id = lr.user_id
         LEFT JOIN users reviewer ON reviewer.id = lr.reviewed_by
         ${where}
         ORDER BY lr.submitted_at DESC, lr.id DESC
         LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );
    const [[countRow]] = await connection.query(
        `SELECT COUNT(*) AS total
         FROM leave_requests lr
         INNER JOIN users u ON u.id = lr.user_id
         ${where}`,
        values
    );
    return { items: rows, total: Number(countRow.total) };
}

module.exports = {
    ensureBalances,
    findRequestById,
    listForUser,
    countForUser,
    findActiveOverlap,
    getBalance,
    getBalancesForUser,
    getAllBalances,
    createRequest,
    updateStatus,
    cancelRequest,
    getStats,
    listAdmin
};
