const { pool } = require("../db");

function parse(row) {
    if (!row) return null;
    return { ...row, data: typeof row.data === "string" ? JSON.parse(row.data) : row.data };
}
async function list(type, includeArchived = false, connection = pool) {
    let sql = "SELECT id, record_type AS recordType, title, status, sort_order AS sortOrder, data, created_at AS createdAt, updated_at AS updatedAt FROM office_information WHERE record_type = ?";
    if (!includeArchived) sql += " AND status <> 'archived'";
    sql += " ORDER BY sort_order ASC, id ASC";
    const [rows] = await connection.query(sql, [type]);
    return rows.map(parse);
}
async function getById(id, connection = pool) {
    const [rows] = await connection.query("SELECT id, record_type AS recordType, title, status, sort_order AS sortOrder, data, created_at AS createdAt, updated_at AS updatedAt FROM office_information WHERE id=? LIMIT 1", [id]);
    return parse(rows[0]);
}
async function create(record, connection = pool) {
    const [result] = await connection.query("INSERT INTO office_information (record_type,title,status,sort_order,data,created_by,updated_by) VALUES (?,?,?,?,?,?,?)", [record.recordType, record.title || null, record.status, record.sortOrder || 0, JSON.stringify(record.data || {}), record.userId, record.userId]);
    return getById(result.insertId, connection);
}
async function update(id, record, connection = pool) {
    await connection.query("UPDATE office_information SET title=?,status=?,sort_order=?,data=?,updated_by=? WHERE id=?", [record.title || null, record.status, record.sortOrder || 0, JSON.stringify(record.data || {}), record.userId, id]);
    return getById(id, connection);
}
async function archive(id, userId, connection = pool) {
    const [result] = await connection.query("UPDATE office_information SET status='archived',updated_by=? WHERE id=?", [userId, id]);
    return result.affectedRows > 0;
}
module.exports = { list, getById, create, update, archive };
