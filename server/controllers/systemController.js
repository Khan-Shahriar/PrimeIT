const { getHealthData } = require("../services/systemService");

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
        const health = await getHealthData();

        return res.status(200).json({
            success: true,
            data: {
                ...health,
                responseTimeMs: Date.now() - startedAt
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
