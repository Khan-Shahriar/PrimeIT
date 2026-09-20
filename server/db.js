const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

async function testDatabaseConnection() {
    let connection;

    try {
        connection = await pool.getConnection();
        await connection.query("SELECT 1");
        console.log("MySQL database connected");
    } catch (error) {
        console.error("MySQL connection failed:", error.message);
        throw error;
    } finally {
        connection?.release();
    }
}

async function closeDatabasePool() {
    await pool.end();
    console.log("MySQL connection pool closed");
}

module.exports = {
    pool,
    testDatabaseConnection,
    closeDatabasePool
};
