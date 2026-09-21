const {
    getAuthorizationContext,
    assertPermission,
    assertAuthorizationManager
} = require("../services/authorizationService");

function unauthorized(res) {
    return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource"
    });
}

function requireRole(...allowedRoles) {
    return async (req, res, next) => {
        if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
        try {
            const context = await getAuthorizationContext(req.user.id);
            req.authorization = context;
            if (!allowedRoles.some(role => context.roleKeys.has(String(role).toLowerCase()))) {
                return unauthorized(res);
            }
            return next();
        } catch (error) {
            console.error("Role authorization error:", error.message);
            return unauthorized(res);
        }
    };
}

function requireFullAccess(req, res, next) {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
    return requireAuthorizationManager(req, res, next);
}

function requireAuthorizationManager(req, res, next) {
    assertAuthorizationManager(req.user.id)
        .then(context => {
            req.authorization = context;
            next();
        })
        .catch(error => {
            if (error.code === "AUTHORIZATION_FORBIDDEN") return unauthorized(res);
            console.error("Authorization manager lookup error:", error.message);
            return unauthorized(res);
        });
}

function requirePermission(permission) {
    return async (req, res, next) => {
        if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
        try {
            const context = await assertPermission(req.user.id, permission);
            req.authorization = context;
            return next();
        } catch (error) {
            if (error.code === "AUTHORIZATION_FORBIDDEN") return unauthorized(res);
            console.error("Permission authorization error:", error.message);
            return unauthorized(res);
        }
    };
}

module.exports = {
    requireRole,
    requireFullAccess,
    requireAuthorizationManager,
    requirePermission
};
