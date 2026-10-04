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
            "SHOW TABLES LIKE 'announcements'"
        );

        console.log("\n=== ANNOUNCEMENTS TABLE CHECK ===");
        console.log(tables);

        if (!tables.length) {
            console.log("\nRESULT: announcements table DOES NOT EXIST");
            return;
        }

        const [columns] = await connection.query(
            "SHOW COLUMNS FROM announcements"
        );

        console.log("\n=== ANNOUNCEMENTS COLUMNS ===");
        console.table(columns);

        const [createTable] = await connection.query(
            "SHOW CREATE TABLE announcements"
        );

        console.log("\n=== ANNOUNCEMENTS TABLE DEFINITION ===");
        console.log(createTable[0]["Create Table"]);
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
