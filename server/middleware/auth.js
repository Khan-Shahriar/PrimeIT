const jwt = require("jsonwebtoken");

const { pool } = require("../db");
const { COOKIE_NAME } = require("../utils/authCookie");

/* =========================================================
   AUTHENTICATION
   Verify JWT and confirm the account is still active
========================================================= */

async function requireAuth(req, res, next) {
    try {
        const token = req.cookies?.[COOKIE_NAME];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
            console.error("JWT_SECRET must be configured with at least 32 characters.");
            return res.status(500).json({
                success: false,
                message: "Authentication service is not configured"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded?.id) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired authentication token"
            });
        }

        const [users] = await pool.query(
            "SELECT id, role, status FROM users WHERE id = ? LIMIT 1",
            [decoded.id]
        );

        if (users.length === 0 || users[0].status !== "active") {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        req.user = {
            ...decoded,
            id: users[0].id,
            role: users[0].role
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token"
        });
    }
}

/* =========================================================
   ROLE AUTHORIZATION
========================================================= */

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this resource"
            });
        }

        next();
    };
}

/* =========================================================
   FULL ACCESS ROLES
   CEO and Developer have unrestricted administrative access
========================================================= */

function requireFullAccess(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    const fullAccessRoles = ["ceo", "developer"];

    if (!fullAccessRoles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: "Full access permission required"
        });
    }

    next();
}

/* =========================================================
   PERMISSION AUTHORIZATION
   Check role_permissions in MySQL
========================================================= */

function requirePermission(permissionName) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
            }

            const fullAccessRoles = ["ceo", "developer"];

            if (fullAccessRoles.includes(req.user.role)) {
                return next();
            }

            const [permissions] = await pool.query(
                `SELECT p.id
                 FROM role_permissions rp
                 INNER JOIN roles r ON rp.role_id = r.id
                 INNER JOIN permissions p ON rp.permission_id = p.id
                 WHERE r.name = ?
                   AND p.name = ?
                 LIMIT 1`,
                [req.user.role, permissionName]
            );

            if (permissions.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have the required permission"
                });
            }

            next();
        } catch (error) {
            console.error("Permission authorization error:", error);
            return res.status(500).json({
                success: false,
                message: "Unable to verify permissions"
            });
        }
    };
}

module.exports = {
    COOKIE_NAME,
    requireAuth,
    requireRole,
    requireFullAccess,
    requirePermission
};
