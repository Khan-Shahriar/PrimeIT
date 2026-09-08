require("dotenv").config();

const { pool } = require("./db");

async function setCEO() {
    try {
        const [result] = await pool.query(
            `UPDATE users
             SET role = 'ceo'
             WHERE id = 1`
        );

        console.log(`Updated rows: ${result.affectedRows}`);

        const [users] = await pool.query(
            `SELECT id, full_name, email, role
             FROM users
             WHERE id = 1`
        );

        console.table(users);

    } catch (error) {
        console.error("❌ Failed:", error.message);
    } finally {
        await pool.end();
    }
}

setCEO();