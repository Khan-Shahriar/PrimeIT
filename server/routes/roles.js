const express = require("express");
const { pool } = require("../db");
const { requireAuth, requireAuthorizationManager } = require("../middleware/auth");
const { listRoles, getRoleById, getRoleMembers } = require("../repositories/roleRepository");
const { listPermissions, getPermissionsForRole } = require("../repositories/permissionRepository");

const router = express.Router();
const SYSTEM_ROLE_NAMES = new Set(["ceo", "developer", "admin", "hr", "member"]);

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/", requireAuth, requireAuthorizationManager, async (req, res) => {
    try {
        return res.json({ success: true, roles: await listRoles() });
    } catch (error) {
        console.error("Get roles error:", error);
        return res.status(500).json({ success: false, message: "Failed to load roles" });
    }
});

router.get("/permissions", requireAuth, requireAuthorizationManager, async (req, res) => {
    try {
        return res.json({ success: true, permissions: await listPermissions() });
    } catch (error) {
        console.error("Get permissions error:", error);
        return res.status(500).json({ success: false, message: "Failed to load permissions" });
    }
});

router.get("/permissions/all", requireAuth, requireAuthorizationManager, async (req, res) => {
    try {
        return res.json({ success: true, permissions: await listPermissions() });
    } catch (error) {
        console.error("Get permissions error:", error);
        return res.status(500).json({ success: false, message: "Failed to load permissions" });
    }
});

router.get("/:id", requireAuth, requireAuthorizationManager, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid role ID" });
    try {
        const role = await getRoleById(id);
        if (!role) return res.status(404).json({ success: false, message: "Role not found" });
        const permissions = await getPermissionsForRole(id);
        return res.json({ success: true, role, permissions });
    } catch (error) {
        console.error("Get role error:", error);
        return res.status(500).json({ success: false, message: "Failed to load role" });
    }
});

router.get("/:id/permissions", requireAuth, requireAuthorizationManager, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid role ID" });
    try {
        const role = await getRoleById(id);
        if (!role) return res.status(404).json({ success: false, message: "Role not found" });
        return res.json({ success: true, role, permissions: await getPermissionsForRole(id) });
    } catch (error) {
        console.error("Get role permissions error:", error);
        return res.status(500).json({ success: false, message: "Failed to load role permissions" });
    }
});

router.get("/:id/members", requireAuth, requireAuthorizationManager, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid role ID" });
    try {
        const role = await getRoleById(id);
        if (!role) return res.status(404).json({ success: false, message: "Role not found" });
        return res.json({ success: true, members: await getRoleMembers(id) });
    } catch (error) {
        console.error("Get role members error:", error);
        return res.status(500).json({ success: false, message: "Failed to load role members" });
    }
});

router.post("/", requireAuth, requireAuthorizationManager, async (req, res) => {
    try {
        const name = String(req.body.name || "").trim().toLowerCase().replace(/\s+/g, "_");
        const description = String(req.body.description || "").trim();
        if (!/^[a-z][a-z0-9_]{2,49}$/.test(name)) {
            return res.status(400).json({ success: false, message: "Role name must contain 3–50 lowercase letters, numbers, or underscores" });
        }
        if (SYSTEM_ROLE_NAMES.has(name)) {
            return res.status(409).json({ success: false, message: "This role name is reserved" });
        }
        if (description.length > 255) {
            return res.status(400).json({ success: false, message: "Description cannot exceed 255 characters" });
        }
        const [result] = await pool.query(
            "INSERT INTO roles (name, description, type, status, is_system) VALUES (?, ?, 'custom', 'active', 0)",
            [name, description || null]
        );
        const role = await getRoleById(result.insertId);
        return res.status(201).json({ success: true, message: "Custom role created successfully", role });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ success: false, message: "A role with this name already exists" });
        }
        console.error("Create role error:", error);
        return res.status(500).json({ success: false, message: "Failed to create role" });
    }
});

router.patch("/:id", requireAuth, requireAuthorizationManager, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid role ID" });
    try {
        const role = await getRoleById(id);
        if (!role) return res.status(404).json({ success: false, message: "Role not found" });
        if (role.is_system || role.type === "system") {
            return res.status(403).json({ success: false, message: "System roles cannot be modified" });
        }

        const fields = [];
        const values = [];
        if (req.body.name !== undefined) {
            const name = String(req.body.name).trim().toLowerCase().replace(/\s+/g, "_");
            if (!/^[a-z][a-z0-9_]{2,49}$/.test(name) || SYSTEM_ROLE_NAMES.has(name)) {
                return res.status(400).json({ success: false, message: "Invalid or reserved role name" });
            }
            fields.push("name = ?");
            values.push(name);
        }
        if (req.body.description !== undefined) {
            const description = String(req.body.description).trim();
            if (description.length > 255) return res.status(400).json({ success: false, message: "Description cannot exceed 255 characters" });
            fields.push("description = ?");
            values.push(description || null);
        }
        if (req.body.status !== undefined) {
            const status = String(req.body.status).toLowerCase();
            if (!["active", "inactive", "archived"].includes(status)) {
                return res.status(400).json({ success: false, message: "Invalid role status" });
            }
            fields.push("status = ?");
            values.push(status);
        }
        if (!fields.length) return res.status(400).json({ success: false, message: "No valid role changes supplied" });
        values.push(id);
        await pool.query("UPDATE roles SET " + fields.join(", ") + " WHERE id = ?", values);
        return res.json({ success: true, message: "Role updated successfully", role: await getRoleById(id) });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "A role with this name already exists" });
        console.error("Update role error:", error);
        return res.status(500).json({ success: false, message: "Failed to update role" });
    }
});

router.patch("/:id/status", requireAuth, requireAuthorizationManager, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid role ID" });
    req.body = { ...req.body, status: req.body.status };
    return router.handle({ ...req, url: "/" + id, originalUrl: req.originalUrl, method: "PATCH" }, res);
});

router.put("/:id/permissions", requireAuth, requireAuthorizationManager, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid role ID" });
    if (!Array.isArray(req.body.permissions)) return res.status(400).json({ success: false, message: "Permissions must be an array" });

    const connection = await pool.getConnection();
    try {
        const [roles] = await connection.query("SELECT id, name, type, status, is_system FROM roles WHERE id = ? LIMIT 1", [id]);
        if (!roles.length) return res.status(404).json({ success: false, message: "Role not found" });
        const role = roles[0];
        if (role.is_system || role.type === "system") return res.status(403).json({ success: false, message: "System role permissions are protected" });

        const permissionIds = [...new Set(req.body.permissions.map(Number))];
        if (permissionIds.some(idValue => !Number.isInteger(idValue) || idValue <= 0)) {
            return res.status(400).json({ success: false, message: "Invalid permission ID" });
        }

        if (permissionIds.length) {
            const placeholders = permissionIds.map(() => "?").join(",");
            const [valid] = await connection.query(
                "SELECT id FROM permissions WHERE id IN (" + placeholders + ") AND status = 'active'",
                permissionIds
            );
            if (valid.length !== permissionIds.length) return res.status(400).json({ success: false, message: "One or more permissions are invalid or inactive" });
        }

        await connection.beginTransaction();
        await connection.query("DELETE FROM role_permissions WHERE role_id = ?", [id]);
        if (permissionIds.length) {
            await connection.query(
                "INSERT INTO role_permissions (role_id, permission_id) VALUES ?",
                [permissionIds.map(permissionId => [id, permissionId])]
            );
        }
        await connection.commit();
        return res.json({ success: true, message: "Role permissions updated successfully", role, permissionIds });
    } catch (error) {
        try { await connection.rollback(); } catch {}
        console.error("Update role permissions error:", error);
        return res.status(500).json({ success: false, message: "Failed to update role permissions" });
    } finally {
        connection.release();
    }
});

router.delete("/:id", requireAuth, requireAuthorizationManager, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid role ID" });
    const connection = await pool.getConnection();
    try {
        const role = await getRoleById(id, connection);
        if (!role) return res.status(404).json({ success: false, message: "Role not found" });
        if (role.is_system || role.type === "system") return res.status(403).json({ success: false, message: "System roles cannot be deleted" });
        const [members] = await connection.query("SELECT 1 FROM user_roles WHERE role_id = ? LIMIT 1", [id]);
        if (members.length) return res.status(409).json({ success: false, message: "Role is assigned to users; archive it or remove assignments first" });
        await connection.beginTransaction();
        await connection.query("DELETE FROM role_permissions WHERE role_id = ?", [id]);
        await connection.query("DELETE FROM roles WHERE id = ?", [id]);
        await connection.commit();
        return res.json({ success: true, message: "Role deleted successfully" });
    } catch (error) {
        try { await connection.rollback(); } catch {}
        console.error("Delete role error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete role" });
    } finally {
        connection.release();
    }
});

module.exports = router;
