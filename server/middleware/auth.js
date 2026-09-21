const { getUserForAuth } = require("../repositories/authRepository");
const { verifyAccessToken } = require("../utils/jwt");
const { COOKIE_NAME } = require("../utils/authCookie");
const { requireRole, requireFullAccess, requireAuthorizationManager, requirePermission } = require("./authorization");

async function requireAuth(req, res, next) {
    try {
        const token = req.cookies?.[COOKIE_NAME];
        if (!token) return res.status(401).json({ success: false, message: "Authentication required" });
        const decoded = verifyAccessToken(token);
        const userId = Number(decoded?.sub);
        if (!Number.isInteger(userId) || userId <= 0 || decoded?.typ !== "access") return res.status(401).json({ success: false, message: "Invalid or expired authentication token" });
        const user = await getUserForAuth(userId);
        if (!user || user.status !== "active") return res.status(401).json({ success: false, message: "Authentication required" });
        if (Number(decoded.ver || 0) !== Number(user.auth_token_version || 0)) return res.status(401).json({ success: false, message: "Authentication required" });
        req.user = { id: user.id, email: user.email, role: user.role, status: user.status, email_verified: Boolean(user.email_verified) };
        return next();
    } catch {
        return res.status(401).json({ success: false, message: "Invalid or expired authentication token" });
    }
}

module.exports = { COOKIE_NAME, requireAuth, requireRole, requireFullAccess, requireAuthorizationManager, requirePermission };