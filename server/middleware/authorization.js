const { pool } = require("../db");

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
        if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ success: false, message: "You do not have permission to access this resource" });
        next();
    };
}

function requireFullAccess(req, res, next) {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
    if (!["ceo", "developer"].includes(req.user.role)) return res.status(403).json({ success: false, message: "Full access permission required" });
    next();
}

function requirePermission(permissionName) {
    return async (req, res, next) => {
        try {
            if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
            if (["ceo", "developer"].includes(req.user.role)) return next();
            const [permissions] = await pool.query("SELECT p.id FROM role_permissions rp INNER JOIN roles r ON rp.role_id = r.id INNER JOIN permissions p ON rp.permission_id = p.id WHERE r.name = ? AND p.name = ? LIMIT 1", [req.user.role, permissionName]);
            if (!permissions.length) return res.status(403).json({ success: false, message: "You do not have the required permission" });
            next();
        } catch (error) {
            console.error("Permission authorization error:", error.message);
            res.status(500).json({ success: false, message: "Unable to verify permissions" });
        }
    };
}

module.exports = { requireRole, requireFullAccess, requirePermission };