function assertAuthenticationConfiguration() {
    const jwtSecret = process.env.JWT_SECRET;

    if (typeof jwtSecret !== "string" || jwtSecret.length < 32) {
        throw new Error("JWT_SECRET must be configured with at least 32 characters.");
    }

    if (process.env.NODE_ENV === "production") {
        if (process.env.CLIENT_ORIGIN) {
            try {
                new URL(process.env.CLIENT_ORIGIN);
            } catch {
                throw new Error("CLIENT_ORIGIN must be a valid absolute URL.");
            }
        }

        if (!process.env.RESEND_API_KEY?.trim()) {
            throw new Error("RESEND_API_KEY must be configured in production.");
        }

        if (!process.env.EMAIL_FROM?.trim()) {
            throw new Error("EMAIL_FROM must be configured in production.");
        }

        const appBaseUrl = process.env.APP_BASE_URL?.trim();
        if (!appBaseUrl) {
            throw new Error("APP_BASE_URL must be configured in production.");
        }

        try {
            const parsedBaseUrl = new URL(appBaseUrl);
            if (!["http:", "https:"].includes(parsedBaseUrl.protocol)) {
                throw new Error();
            }
        } catch {
            throw new Error("APP_BASE_URL must be a valid HTTP or HTTPS URL.");
        }
    }
}

module.exports = { assertAuthenticationConfiguration };
