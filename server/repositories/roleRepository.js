const { pool } = require("../db");

async function getRoleById(roleId, connection = pool) {
    const [rows] = await connection.query(
        `SELECT id, name, description, type, status, is_system, created_at, updated_at
         FROM roles WHERE id = ? LIMIT 1`,
        [roleId]
    );
    return rows[0] || null;
}

async function getRoleByName(name, connection = pool) {
    const [rows] = await connection.query(
        `SELECT id, name, description, type, status, is_system, created_at, updated_at
         FROM roles WHERE name = ? LIMIT 1`,
        [String(name).trim().toLowerCase()]
    );
    return rows[0] || null;
}

async function listRoles(connection = pool) {
    const [rows] = await connection.query(
        `SELECT id, name, description, type, status, is_system, created_at, updated_at
         FROM roles
         ORDER BY is_system DESC, name ASC`
    );
    return rows;
}

async function getUserRoles(userId, connection = pool) {
    const [rows] = await connection.query(
        `SELECT r.id, r.name, r.description, r.type, r.status, r.is_system
         FROM user_roles ur
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = ? AND r.status = 'active'
         ORDER BY r.id ASC`,
        [userId]
    );
    return rows;
}

async function getRoleMembers(roleId, connection = pool) {
    const [rows] = await connection.query(
        `SELECT u.id, u.full_name AS name, u.email, u.status
         FROM user_roles ur
         INNER JOIN users u ON u.id = ur.user_id
         WHERE ur.role_id = ?
         ORDER BY u.full_name ASC`,
        [roleId]
    );
    return rows;
}

async function replaceUserRoles(userId, roleIds, connection) {
    await connection.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);
    if (!roleIds.length) return;
    const values = roleIds.map(roleId => [userId, roleId]);
    await connection.query(
        "INSERT INTO user_roles (user_id, role_id) VALUES ?",
        [values]
    );
}

module.exports = {
    getRoleById,
    getRoleByName,
    listRoles,
    getUserRoles,
    getRoleMembers,
    replaceUserRoles
};
