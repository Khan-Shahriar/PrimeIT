const { assertPermission, getAuthorizationContext } = require("./authorizationService");

async function assertSelfOrPermission(userId, targetUserId, permission) {
    const context = await getAuthorizationContext(userId);
    if (Number(userId) === Number(targetUserId)) return context;
    if (context.isFullAccess || context.permissionKeys.has(permission)) return context;
    const error = new Error("FORBIDDEN");
    error.code = "AUTHORIZATION_FORBIDDEN";
    throw error;
}

async function assertOwnResource(userId, ownerUserId) {
    if (Number(userId) === Number(ownerUserId)) return;
    const error = new Error("FORBIDDEN");
    error.code = "AUTHORIZATION_FORBIDDEN";
    throw error;
}

module.exports = {
    assertSelfOrPermission,
    assertOwnResource,
    assertPermission
};
