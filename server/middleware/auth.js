const jwt = require("jsonwebtoken");

const { pool } = require("../db");

const COOKIE_NAME = "primeit_token";


/* =========================================================
   AUTHENTICATION
   Verify JWT and identify the logged-in user
========================================================= */

function requireAuth(req, res, next) {
    try {
        const token = req.cookies?.[COOKIE_NAME];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("❌ JWT_SECRET is not configured.");

            return res.status(500).json({
                success: false,
                message: "Authentication service is not configured"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

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
   Allow only specific roles
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

    const fullAccessRoles = [
        "ceo",
        "developer"
    ];

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


            /* =================================================
               CEO AND DEVELOPER HAVE FULL ACCESS
            ================================================= */

            const fullAccessRoles = [
                "ceo",
                "developer"
            ];

            if (fullAccessRoles.includes(req.user.role)) {
                return next();
            }


            /* =================================================
               CHECK DATABASE PERMISSION
            ================================================= */

            const [permissions] = await pool.query(
                `SELECT p.id
                 FROM role_permissions rp
                 INNER JOIN roles r
                     ON rp.role_id = r.id
                 INNER JOIN permissions p
                     ON rp.permission_id = p.id
                 WHERE r.name = ?
                   AND p.name = ?
                 LIMIT 1`,
                [
                    req.user.role,
                    permissionName
                ]
            );


            /* =================================================
               PERMISSION NOT FOUND
            ================================================= */

            if (permissions.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have the required permission"
                });
            }


            /* =================================================
               PERMISSION GRANTED
            ================================================= */

            next();

        } catch (error) {

            console.error(
                "Permission authorization error:",
                error
            );

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