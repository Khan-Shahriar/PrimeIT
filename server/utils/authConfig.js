function assertAuthenticationConfiguration() {
    const jwtSecret = process.env.JWT_SECRET;
    if (typeof jwtSecret !== "string" || jwtSecret.length < 32) {
        throw new Error("JWT_SECRET must be configured with at least 32 characters.");
    }

    const sameSite = (process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
    if (!["lax", "strict", "none"].includes(sameSite)) {
        throw new Error("COOKIE_SAME_SITE must be lax, strict, or none.");
    }

    if (sameSite === "none" && process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "true") {
        throw new Error("COOKIE_SECURE=true is required when COOKIE_SAME_SITE=none in production.");
    }

    const bcryptRounds = Number(process.env.BCRYPT_ROUNDS || 12);
    if (!Number.isInteger(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 15) {
        throw new Error("BCRYPT_ROUNDS must be an integer between 10 and 15.");
    }

    if (process.env.NODE_ENV === "production") {
        if (!process.env.CLIENT_ORIGIN?.trim()) throw new Error("CLIENT_ORIGIN must be configured in production.");
        if (!process.env.RESEND_API_KEY?.trim()) throw new Error("RESEND_API_KEY must be configured in production.");
        if (!process.env.EMAIL_FROM?.trim()) throw new Error("EMAIL_FROM must be configured in production.");
        if (!process.env.APP_BASE_URL?.trim()) throw new Error("APP_BASE_URL must be configured in production.");
        try {
            const base = new URL(process.env.APP_BASE_URL);
            if (!["http:", "https:"].includes(base.protocol)) throw new Error();
        } catch {
            throw new Error("APP_BASE_URL must be a valid HTTP or HTTPS URL.");
        }
    }
}

module.exports = { assertAuthenticationConfiguration };
