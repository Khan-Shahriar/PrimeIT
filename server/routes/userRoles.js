const express = require("express");
const { pool } = require("../db");
const { requireAuth, requireAuthorizationManager } = require("../middleware/auth");
const { getRoleById, getUserRoles } = require("../repositories/roleRepository");
const { getAuthorizationContext } = require("../services/authorizationService");

const router = express.Router();

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/:userId/roles", requireAuth, requireAuthorizationManager, async (req, res) => {
    const userId = parseId(req.params.userId);
    if (!userId) return res.status(400).json({ success: false, message: "Invalid user ID" });
    try {
        const [users] = await pool.query("SELECT id, full_name, email, status FROM users WHERE id = ? LIMIT 1", [userId]);
        if (!users.length) return res.status(404).json({ success: false, message: "User not found" });
        return res.json({ success: true, user: users[0], roles: await getUserRoles(userId) });
    } catch (error) {
        console.error("Get user roles error:", error);
        return res.status(500).json({ success: false, message: "Failed to load user roles" });
    }
});

router.put("/:userId/roles", requireAuth, requireAuthorizationManager, async (req, res) => {
    const userId = parseId(req.params.userId);
    if (!userId) return res.status(400).json({ success: false, message: "Invalid user ID" });
    if (!Array.isArray(req.body.roleIds) || !req.body.roleIds.length) {
        return res.status(400).json({ success: false, message: "At least one role is required" });
    }

    const roleIds = [...new Set(req.body.roleIds.map(Number))];
    if (roleIds.some(id => !Number.isInteger(id) || id <= 0)) {
        return res.status(400).json({ success: false, message: "Invalid role ID" });
    }

    const connection = await pool.getConnection();
    try {
        const [users] = await connection.query("SELECT id, status FROM users WHERE id = ? LIMIT 1", [userId]);
        if (!users.length) return res.status(404).json({ success: false, message: "User not found" });
        if (users[0].status !== "active") return res.status(409).json({ success: false, message: "Inactive users cannot receive roles" });

        const placeholders = roleIds.map(() => "?").join(",");
        const [roles] = await connection.query(
            "SELECT id, name, type, status, is_system FROM roles WHERE id IN (" + placeholders + ")",
            roleIds
        );
        if (roles.length !== roleIds.length) return res.status(400).json({ success: false, message: "One or more roles are invalid" });
        if (roles.some(role => role.status !== "active")) return res.status(400).json({ success: false, message: "Inactive or archived roles cannot be assigned" });

        const protectedRole = roles.find(role => role.name === "ceo" || role.name === "developer");
        if (protectedRole && !req.authorization?.isAuthorizationManager) {
            return res.status(403).json({ success: false, message: "Protected roles require authorization-management access" });
        }

        if (userId === Number(req.user.id) && roles.some(role => role.name === "ceo" || role.name === "developer")) {
            return res.status(403).json({ success: false, message: "Self-promotion to a protected role is not allowed" });
        }

        const current = await getAuthorizationContext(userId, connection);
        if (current.roles.some(role => role.name === "ceo") && !roles.some(role => role.name === "ceo")) {
            const [ceos] = await connection.query(
                "SELECT COUNT(*) AS count FROM user_roles ur INNER JOIN roles r ON r.id = ur.role_id WHERE r.name = 'ceo' AND r.status = 'active'"
            );
            if (Number(ceos[0].count) <= 1) {
                return res.status(409).json({ success: false, message: "The final CEO role cannot be removed" });
            }
        }

        await connection.beginTransaction();
        await connection.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);
        await connection.query(
            "INSERT INTO user_roles (user_id, role_id) VALUES ?",
            [roleIds.map(roleId => [userId, roleId])]
        );

        const primaryRole = roles.find(role => role.name === "ceo") ||
            roles.find(role => role.name === "developer") ||
            roles.find(role => role.name === "admin") ||
            roles.find(role => role.name === "hr") ||
            roles[0];

        await connection.query(
            "UPDATE users SET role = ? WHERE id = ?",
            [primaryRole.name, userId]
        );

        await connection.commit();
        return res.json({ success: true, message: "User roles updated successfully", roles: await getUserRoles(userId) });
    } catch (error) {
        try { await connection.rollback(); } catch {}
        console.error("Update user roles error:", error);
        return res.status(500).json({ success: false, message: "Failed to update user roles" });
    } finally {
        connection.release();
    }
});

module.exports = router;
