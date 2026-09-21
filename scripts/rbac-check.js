require("dotenv").config();

const { pool } = require("../server/db");

async function main() {
    const requiredTables = ["roles", "permissions", "role_permissions", "user_roles"];
    const [tables] = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (?, ?, ?, ?)",
        requiredTables
    );
    const found = new Set(tables.map(row => row.table_name));
    const missing = requiredTables.filter(name => !found.has(name));

    if (missing.length) {
        console.error("RBAC schema missing:", missing.join(", "));
        process.exitCode = 1;
        return;
    }

    const [[roleCount]] = await pool.query("SELECT COUNT(*) AS count FROM roles");
    const [[permissionCount]] = await pool.query("SELECT COUNT(*) AS count FROM permissions");
    const [[rolePermissionDuplicates]] = await pool.query(
        "SELECT COUNT(*) AS count FROM (SELECT role_id, permission_id FROM role_permissions GROUP BY role_id, permission_id HAVING COUNT(*) > 1) x"
    );
    const [[userRoleDuplicates]] = await pool.query(
        "SELECT COUNT(*) AS count FROM (SELECT user_id, role_id FROM user_roles GROUP BY user_id, role_id HAVING COUNT(*) > 1) x"
    );
    const [[inactiveRoleAssignments]] = await pool.query(
        "SELECT COUNT(*) AS count FROM user_roles ur INNER JOIN roles r ON r.id = ur.role_id WHERE r.status <> 'active'"
    );
    const [[orphanRolePermissions]] = await pool.query(
        "SELECT COUNT(*) AS count FROM role_permissions rp LEFT JOIN roles r ON r.id = rp.role_id LEFT JOIN permissions p ON p.id = rp.permission_id WHERE r.id IS NULL OR p.id IS NULL"
    );

    const checks = [
        ["roles", Number(roleCount.count) > 0],
        ["permissions", Number(permissionCount.count) > 0],
        ["duplicate role_permissions", Number(rolePermissionDuplicates.count) === 0],
        ["duplicate user_roles", Number(userRoleDuplicates.count) === 0],
        ["inactive role assignments", Number(inactiveRoleAssignments.count) === 0],
        ["orphan authorization relationships", Number(orphanRolePermissions.count) === 0]
    ];

    for (const [label, passed] of checks) {
        console.log((passed ? "PASS " : "FAIL ") + label);
        if (!passed) process.exitCode = 1;
    }

    console.log("RBAC roles:", roleCount.count);
    console.log("RBAC permissions:", permissionCount.count);
    console.log("RBAC schema check complete.");
}

main()
    .catch(error => {
        console.error("RBAC check failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
