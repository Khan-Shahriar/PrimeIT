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
        const [tables] = await connection.query(
            "SHOW TABLES LIKE 'holidays'"
        );

        console.log("\n=== HOLIDAYS TABLE CHECK ===");
        console.log(tables);

        if (!tables.length) {
            console.log("\nRESULT: holidays table DOES NOT EXIST");
            return;
        }

        const [columns] = await connection.query(
            "SHOW COLUMNS FROM holidays"
        );

        console.log("\n=== HOLIDAYS COLUMNS ===");
        console.table(columns);

        const sql = `
            SELECT
                id,
                name,
                holiday_date AS date,
                YEAR(holiday_date) AS year,
                description,
                holiday_type AS type,
                recurring,
                status,
                created_by AS createdBy,
                created_at AS createdAt,
                updated_at AS updatedAt
            FROM holidays
            ORDER BY holiday_date ASC, id ASC
        `;

        try {
            const [rows] = await connection.query(sql);

            console.log("\n=== DIRECT QUERY ===");
            console.log("DIRECT QUERY: PASS");
            console.log("ROWS:");
            console.table(rows);
        } catch (error) {
            console.log("\n=== DIRECT QUERY ===");
            console.log("DIRECT QUERY: FAIL");
            console.log("CODE:", error.code);
            console.log("MESSAGE:", error.message);
            console.log("SQLMESSAGE:", error.sqlMessage);
        }
    } catch (error) {
        console.log("\n=== DIAGNOSTIC FAILED ===");
        console.log("CODE:", error.code);
        console.log("MESSAGE:", error.message);
        console.log("SQLMESSAGE:", error.sqlMessage);
    } finally {
        await connection.end();
    }
})();
