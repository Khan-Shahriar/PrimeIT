const { pool } = require("../db");

async function listPermissions(connection = pool) {
    const [rows] = await connection.query(
        `SELECT id, name, description, module, action, status, created_at, updated_at
         FROM permissions
         WHERE status = 'active'
         ORDER BY module ASC, action ASC, name ASC`
    );
    return rows;
}

async function getPermissionsForRole(roleId, connection = pool) {
    const [rows] = await connection.query(
        `SELECT p.id, p.name, p.description, p.module, p.action
         FROM role_permissions rp
         INNER JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = ? AND p.status = 'active'
         ORDER BY p.module ASC, p.action ASC, p.name ASC`,
        [roleId]
    );
    return rows;
}

async function getEffectivePermissions(userId, connection = pool) {
    const [rows] = await connection.query(
        `SELECT DISTINCT p.id, p.name, p.description, p.module, p.action
         FROM user_roles ur
         INNER JOIN roles r ON r.id = ur.role_id
         INNER JOIN role_permissions rp ON rp.role_id = r.id
         INNER JOIN permissions p ON p.id = rp.permission_id
         WHERE ur.user_id = ?
           AND r.status = 'active'
           AND p.status = 'active'
         ORDER BY p.module ASC, p.action ASC, p.name ASC`,
        [userId]
    );
    return rows;
}

module.exports = {
    listPermissions,
    getPermissionsForRole,
    getEffectivePermissions
};
