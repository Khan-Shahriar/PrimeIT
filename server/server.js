require("dotenv").config();

const { assertAuthenticationConfiguration } = require("./utils/authConfig");
const { getConfig } = require("./config/env");
const app = require("./app");
const { testDatabaseConnection, closeDatabasePool } = require("./db");

const config = getConfig();

try {
    assertAuthenticationConfiguration();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}

let server;

async function startServer() {
    try {
        await testDatabaseConnection();

        server = app.listen(config.port, () => {
            console.log("========================================");
            console.log("        PRIMEIT SERVER STARTED");
            console.log("========================================");
            console.log(`Environment: ${config.nodeEnv}`);
            console.log(`HTTP: http://localhost:${config.port}`);
            console.log(`API:  http://localhost:${config.port}/api/v1`);
            console.log(`Health: http://localhost:${config.port}/api/v1/health`);
            console.log("========================================");
        });

        server.on("error", (error) => {
            console.error("HTTP server error:", error.message);
            process.exitCode = 1;
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        await closeDatabasePool().catch(() => {});
        process.exit(1);
    }
}

async function gracefulShutdown(signal) {
    console.log(`${signal} received. Starting graceful shutdown...`);

    if (!server) {
        await closeDatabasePool().catch(() => {});
        return;
    }

    server.close(async (error) => {
        if (error) {
            console.error("HTTP server shutdown error:", error.message);
            process.exitCode = 1;
        }

        await closeDatabasePool().catch((dbError) => {
            console.error("Database shutdown error:", dbError.message);
            process.exitCode = 1;
        });

        console.log("PrimeIt shutdown complete.");
        process.exit();
    });
}

process.once("SIGINT", () => gracefulShutdown("SIGINT"));
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));

startServer();
