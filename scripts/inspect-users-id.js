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
        const [columns] = await connection.query(
            "SHOW COLUMNS FROM users LIKE 'id'"
        );

        console.log("\n=== USERS.ID SCHEMA ===");
        console.table(columns);

        const [createTable] = await connection.query(
            "SHOW CREATE TABLE users"
        );

        console.log("\n=== USERS TABLE DEFINITION ===");
        console.log(createTable[0]["Create Table"]);
    } catch (error) {
        console.error("\n=== SCHEMA CHECK FAILED ===");
        console.error("CODE:", error.code);
        console.error("MESSAGE:", error.message);
        console.error("SQLMESSAGE:", error.sqlMessage);
        process.exitCode = 1;
    } finally {
        await connection.end();
    }
})();
