require("dotenv").config();

const fs = require("fs");
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
        let sql = fs.readFileSync(
            "sql/section-35-holidays.sql",
            "utf8"
        );

        sql = sql.replace(/^\uFEFF/, "");

        const statements = sql
            .split(";")
            .map(statement => statement.trim())
            .filter(Boolean);

        console.log(`Found ${statements.length} SQL statements.`);

        for (let i = 0; i < statements.length; i++) {
            console.log(`Running statement ${i + 1}/${statements.length}...`);
            await connection.query(statements[i]);
        }

        console.log("\nMigration completed successfully.");

        const [tables] = await connection.query(
            "SHOW TABLES LIKE 'holidays'"
        );

        console.log("\n=== TABLE CHECK ===");
        console.log(
            tables.length
                ? "holidays table: EXISTS"
                : "holidays table: MISSING"
        );

        if (tables.length) {
            const [rows] = await connection.query(
                "SELECT id, name, holiday_date, holiday_type, recurring, status FROM holidays ORDER BY holiday_date ASC, id ASC"
            );

            console.log("\n=== HOLIDAY DATA ===");
            console.table(rows);
        }
    } catch (error) {
        console.error("\n=== MIGRATION FAILED ===");
        console.error("CODE:", error.code);
        console.error("MESSAGE:", error.message);
        console.error("SQLMESSAGE:", error.sqlMessage);
        process.exitCode = 1;
    } finally {
        await connection.end();
    }
})();
