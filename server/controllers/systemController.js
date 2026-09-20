const { pool } = require("../db");

async function getApiRoot(req, res) {
    return res.json({
        success: true,
        data: {
            name: "PrimeIt API",
            version: "v1"
        },
        message: "PrimeIt API is running"
    });
}

async function getHealth(req, res) {
    const startedAt = Date.now();

    try {
        await pool.query("SELECT 1");
        return res.status(200).json({
            success: true,
            data: {
                status: "ok",
                database: "ok",
                uptimeSeconds: Math.round(process.uptime() * 100) / 100,
                responseTimeMs: Date.now() - startedAt,
                timestamp: new Date().toISOString()
            },
            message: "PrimeIt API is healthy"
        });
    } catch (error) {
        console.error("Health check database error:", error.message);
        return res.status(503).json({
            success: false,
            data: {
                status: "degraded",
                database: "unavailable",
                timestamp: new Date().toISOString()
            },
            message: "PrimeIt API database is unavailable",
            errors: []
        });
    }
}

module.exports = {
    getApiRoot,
    getHealth
};
