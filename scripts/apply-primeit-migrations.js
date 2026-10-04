require("dotenv").config();
const fs = require("fs");
const mysql = require("mysql2/promise");

const files = [
    "sql/section-30-gallery.sql",
    "sql/section-34-leave.sql",
    "sql/section-35-holidays.sql"
];

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    console.log(`Connected to MySQL database: ${process.env.DB_NAME}`);

    try {
        for (const file of files) {
            console.log(`Applying ${file}...`);
            const sql = fs.readFileSync(file, "utf8");
            await connection.query(sql);
            console.log(`PASS: ${file}`);
        }

        const [tables] = await connection.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = ?
              AND table_name IN (
                  'gallery_media',
                  'leave_balances',
                  'leave_requests',
                  'holidays'
              )
            ORDER BY table_name
        `, [process.env.DB_NAME]);

        console.log("\nPrimeIt migration verification:");
        for (const table of tables) {
            console.log(`PASS: ${table.TABLE_NAME || table.table_name}`);
        }

        const required = [
            "gallery_media",
            "leave_balances",
            "leave_requests",
            "holidays"
        ];

        const found = new Set(
            tables.map(row => row.TABLE_NAME || row.table_name)
        );

        const missing = required.filter(table => !found.has(table));

        if (missing.length) {
            throw new Error(`Missing tables after migration: ${missing.join(", ")}`);
        }

        console.log("\nPrimeIt database migrations completed successfully.");
    } finally {
        await connection.end();
    }
}

main().catch(error => {
    console.error("\nMigration failed:", error.message);
    process.exitCode = 1;
});
