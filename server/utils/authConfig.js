function assertAuthenticationConfiguration() {
    const jwtSecret = process.env.JWT_SECRET;

    if (typeof jwtSecret !== "string" || jwtSecret.length < 32) {
        throw new Error("JWT_SECRET must be configured with at least 32 characters.");
    }

    if (process.env.NODE_ENV === "production" && process.env.CLIENT_ORIGIN) {
        try {
            new URL(process.env.CLIENT_ORIGIN);
        } catch {
            throw new Error("CLIENT_ORIGIN must be a valid absolute URL.");
        }
    }
}

module.exports = { assertAuthenticationConfiguration };
