const { pool } = require("../db");
const { getUserRoles } = require("../repositories/roleRepository");
const { getEffectivePermissions } = require("../repositories/permissionRepository");

const FULL_ACCESS_ROLES = new Set(["ceo", "developer"]);
const AUTHORIZATION_MANAGER_ROLES = new Set(["ceo", "developer"]);

async function getAuthorizationContext(userId, connection = pool) {
    const roles = await getUserRoles(userId, connection);
    const roleKeys = new Set(roles.map(role => role.name));
    const permissions = await getEffectivePermissions(userId, connection);
    const permissionKeys = new Set(permissions.map(permission => permission.name));

    return {
        userId: Number(userId),
        roles,
        roleKeys,
        permissions,
        permissionKeys,
        isFullAccess: [...roleKeys].some(role => FULL_ACCESS_ROLES.has(role)),
        isAuthorizationManager: [...roleKeys].some(role => AUTHORIZATION_MANAGER_ROLES.has(role))
    };
}

async function hasPermission(userId, permission, connection = pool) {
    const context = await getAuthorizationContext(userId, connection);
    if (context.isFullAccess) return true;
    return context.permissionKeys.has(permission);
}

async function assertPermission(userId, permission, connection = pool) {
    const context = await getAuthorizationContext(userId, connection);
    if (context.isFullAccess || context.permissionKeys.has(permission)) return context;
    const error = new Error("FORBIDDEN");
    error.code = "AUTHORIZATION_FORBIDDEN";
    throw error;
}

async function assertAuthorizationManager(userId, connection = pool) {
    const context = await getAuthorizationContext(userId, connection);
    if (context.isAuthorizationManager) return context;
    const error = new Error("FORBIDDEN");
    error.code = "AUTHORIZATION_FORBIDDEN";
    throw error;
}

async function canManageTargetRole(context, targetRole) {
    if (!targetRole) return false;
    if (!targetRole.is_system) return true;
    return FULL_ACCESS_ROLES.has(targetRole.name);
}

module.exports = {
    FULL_ACCESS_ROLES,
    AUTHORIZATION_MANAGER_ROLES,
    getAuthorizationContext,
    hasPermission,
    assertPermission,
    assertAuthorizationManager,
    canManageTargetRole
};
