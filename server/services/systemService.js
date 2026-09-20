const systemRepository = require("../repositories/systemRepository");

async function getHealthData() {
    await systemRepository.checkDatabase();

    return {
        status: "ok",
        database: "ok",
        uptimeSeconds: Math.round(process.uptime() * 100) / 100,
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    getHealthData
};
