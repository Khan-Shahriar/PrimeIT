require("dotenv").config();

const mysql = require("mysql2/promise");

(async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log("\n=== ANNOUNCEMENT ROW COUNT ===");
        const [count] = await connection.query(
            "SELECT COUNT(*) AS total FROM announcements"
        );
        console.table(count);

        console.log("\n=== EXISTING ANNOUNCEMENTS ===");
        const [rows] = await connection.query(`
            SELECT
                id,
                title,
                content,
                status,
                priority,
                created_by,
                published_at,
                created_at,
                updated_at
            FROM announcements
            ORDER BY id ASC
        `);
        console.table(rows);

        console.log("\n=== ANNOUNCEMENT FOREIGN KEYS ===");
        const [foreignKeys] = await connection.query(`
            SELECT
                CONSTRAINT_NAME,
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'announcements'
              AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        console.table(foreignKeys);

        console.log("\n=== STATUS VALUES ===");
        const [statuses] = await connection.query(`
            SELECT status, COUNT(*) AS total
            FROM announcements
            GROUP BY status
            ORDER BY status
        `);
        console.table(statuses);

        console.log("\nInspection completed.");
    } catch (error) {
        console.error("\n=== INSPECTION FAILED ===");
        console.error("CODE:", error.code);
        console.error("MESSAGE:", error.message);
        console.error("SQLMESSAGE:", error.sqlMessage);
        process.exitCode = 1;
    } finally {
        await connection.end();
    }
})();
