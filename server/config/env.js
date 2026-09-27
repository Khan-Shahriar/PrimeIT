const path = require("path");

const DEFAULT_PORT = 8080;

function parsePort(value) {
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PORT must be an integer between 1 and 65535.");
    }
    return port;
}

function getConfig() {
    const nodeEnv = (process.env.NODE_ENV || "development").trim().toLowerCase();
    const bodyLimit = process.env.API_BODY_LIMIT?.trim() || "1mb";
    const apiRateLimitMax = Number(process.env.API_RATE_LIMIT_MAX || 300);
    const maxRequestTargetLength = Number(process.env.MAX_REQUEST_TARGET_LENGTH || 4096);
    const maxImageSize = Number(process.env.MAX_IMAGE_SIZE || 10 * 1024 * 1024);
    const maxImageWidth = Number(process.env.MAX_IMAGE_WIDTH || 12000);
    const maxImageHeight = Number(process.env.MAX_IMAGE_HEIGHT || 12000);
    const maxImagePixels = Number(process.env.MAX_IMAGE_PIXELS || 50_000_000);

    if (!/^([1-9][0-9]?)(kb|mb)$/i.test(bodyLimit)) {
        throw new Error("API_BODY_LIMIT must use a value such as 512kb or 1mb.");
    }
    if (!Number.isInteger(apiRateLimitMax) || apiRateLimitMax < 30 || apiRateLimitMax > 5000) {
        throw new Error("API_RATE_LIMIT_MAX must be between 30 and 5000.");
    }
    if (!Number.isInteger(maxRequestTargetLength) || maxRequestTargetLength < 1024 || maxRequestTargetLength > 16384) {
        throw new Error("MAX_REQUEST_TARGET_LENGTH must be between 1024 and 16384.");
    }
    if (!Number.isInteger(maxImageSize) || maxImageSize < 256 * 1024 || maxImageSize > 25 * 1024 * 1024) {
        throw new Error("MAX_IMAGE_SIZE must be between 256KB and 25MB.");
    }
    if (!Number.isInteger(maxImageWidth) || maxImageWidth < 1 || maxImageWidth > 20000) {
        throw new Error("MAX_IMAGE_WIDTH is invalid.");
    }
    if (!Number.isInteger(maxImageHeight) || maxImageHeight < 1 || maxImageHeight > 20000) {
        throw new Error("MAX_IMAGE_HEIGHT is invalid.");
    }
    if (!Number.isSafeInteger(maxImagePixels) || maxImagePixels < 1 || maxImagePixels > 100_000_000) {
        throw new Error("MAX_IMAGE_PIXELS is invalid.");
    }

    return {
        nodeEnv,
        isProduction: nodeEnv === "production",
        port: parsePort(process.env.PORT || DEFAULT_PORT),
        clientOrigin: process.env.CLIENT_ORIGIN?.trim() || "",
        bodyLimit,
        apiRateLimitMax,
        maxRequestTargetLength,
        gallery: {
            uploadDir: process.env.GALLERY_UPLOAD_DIR?.trim() || path.join(process.cwd(), "uploads", "gallery"),
            maxImageSize,
            maxImageWidth,
            maxImageHeight,
            maxImagePixels
        },
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
