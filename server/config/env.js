const DEFAULT_PORT = 8080;

function parsePort(value) {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer between 1 and 65535.");
    return port;
}

function getConfig() {
    const nodeEnv = (process.env.NODE_ENV || "development").trim().toLowerCase();
    return {
        nodeEnv,
        isProduction: nodeEnv === "production",
        port: parsePort(process.env.PORT || DEFAULT_PORT),
        clientOrigin: process.env.CLIENT_ORIGIN?.trim() || "",
        bodyLimit: process.env.API_BODY_LIMIT?.trim() || "1mb",
        database: {
            host: process.env.DB_HOST?.trim(),
            port: Number(process.env.DB_PORT || 3306),
            user: process.env.DB_USER?.trim(),
            password: process.env.DB_PASSWORD ?? "",
            name: process.env.DB_NAME?.trim()
        },
        auth: {
            jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || "8h",
            cookieName: process.env.COOKIE_NAME?.trim() || "primeit_token",
            requireEmailVerification: String(process.env.REQUIRE_EMAIL_VERIFICATION || "false").toLowerCase() === "true"
        }
    };
}

function assertDatabaseConfiguration(config) {
    const { host, port, user, name } = config.database;
    if (!host || !user || !name) throw new Error("DB_HOST, DB_USER and DB_NAME must be configured.");
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("DB_PORT must be an integer between 1 and 65535.");
}

module.exports = { getConfig, assertDatabaseConfiguration };
