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
        console.log("\n=== ANNOUNCEMENTS SCHEMA REPAIR ===");

        console.log("1. Removing legacy foreign key...");
        await connection.query(`
            ALTER TABLE announcements
            DROP FOREIGN KEY announcements_ibfk_1
        `);

        console.log("2. Removing legacy priority column...");
        await connection.query(`
            ALTER TABLE announcements
            DROP COLUMN priority
        `);

        console.log("3. Renaming created_by to author_id...");
        await connection.query(`
            ALTER TABLE announcements
            CHANGE COLUMN created_by author_id INT UNSIGNED NULL
        `);

        console.log("4. Adding Section 33 columns...");
        await connection.query(`
            ALTER TABLE announcements
            ADD COLUMN summary VARCHAR(500) NULL AFTER title,
            ADD COLUMN category VARCHAR(80) NOT NULL DEFAULT 'General' AFTER content,
            ADD COLUMN audience VARCHAR(80) NOT NULL DEFAULT 'All Members' AFTER category,
            ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0 AFTER published_at,
            ADD COLUMN is_important TINYINT(1) NOT NULL DEFAULT 0 AFTER is_pinned
        `);

        console.log("5. Updating status enum to canonical Section 33 values...");
        await connection.query(`
            ALTER TABLE announcements
            MODIFY COLUMN status
            ENUM('Draft','Published','Archived')
            NOT NULL DEFAULT 'Draft'
        `);

        console.log("6. Adding Section 33 indexes...");
        await connection.query(`
            ALTER TABLE announcements
            ADD KEY idx_announcements_status_published (status, published_at),
            ADD KEY idx_announcements_category (category),
            ADD KEY idx_announcements_pinned (is_pinned),
            ADD KEY idx_announcements_author (author_id)
        `);

        console.log("7. Adding canonical foreign key...");
        await connection.query(`
            ALTER TABLE announcements
            ADD CONSTRAINT fk_announcements_author
            FOREIGN KEY (author_id)
            REFERENCES users(id)
            ON DELETE SET NULL
        `);

        console.log("\nSchema repair completed successfully.");

        console.log("\n=== FINAL TABLE DEFINITION ===");
        const [result] = await connection.query(
            "SHOW CREATE TABLE announcements"
        );
        console.log(result[0]["Create Table"]);

        console.log("\n=== FINAL COLUMNS ===");
        const [columns] = await connection.query(
            "SHOW COLUMNS FROM announcements"
        );
        console.table(columns);

    } catch (error) {
        console.error("\n=== SCHEMA REPAIR FAILED ===");
        console.error("CODE:", error.code);
        console.error("MESSAGE:", error.message);
        console.error("SQLMESSAGE:", error.sqlMessage);
        process.exitCode = 1;
    } finally {
        await connection.end();
    }
})();
