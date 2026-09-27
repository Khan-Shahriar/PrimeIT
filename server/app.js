require("dotenv").config();

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { getConfig, assertDatabaseConfiguration } = require("./config/env");
const requestLogger = require("./middleware/requestLogger");
const notFoundHandler = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const apiRoutes = require("./routes");
const { getHealth } = require("./controllers/systemController");

const config = getConfig();
assertDatabaseConfiguration(config);

const app = express();

app.disable("x-powered-by");

app.use((req, res, next) => {
    const method = String(req.method || "").toUpperCase();
    if (["TRACE", "TRACK", "CONNECT", "DEBUG"].includes(method)) {
        return res.status(405).set("Allow", "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS").end();
    }
    next();
});

app.use(
    helmet({
        crossOriginResourcePolicy: false,
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                objectSrc: ["'none'"],
                scriptSrc: ["'self'"],
                scriptSrcAttr: ["'none'"],
                styleSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "blob:"],
                fontSrc: ["'self'", "data:"],
                connectSrc: ["'self'"],
                mediaSrc: ["'self'", "blob:"],
                workerSrc: ["'self'", "blob:"],
                manifestSrc: ["'self'"],
                frameSrc: ["'none'"],
                childSrc: ["'self'", "blob:"],
                upgradeInsecureRequests: []
            }
        }
    })
);

if (config.clientOrigin) {
    let configuredOrigin;
    try {
        configuredOrigin = new URL(config.clientOrigin).origin;
    } catch {
        throw new Error("CLIENT_ORIGIN must be a valid absolute URL.");
    }

    app.use(
        cors({
            origin: configuredOrigin,
            credentials: true,
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
        })
    );
}

app.use(requestLogger);
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));
app.use(cookieParser());

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.API_RATE_LIMIT_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later.",
        errors: []
    }
});

function sameOriginRequest(req) {
    const configuredOrigin = config.clientOrigin;
    if (!configuredOrigin) return true;
    const origin = req.get("origin");
    if (origin) return origin === configuredOrigin;
    const referer = req.get("referer");
    if (referer) {
        try { return new URL(referer).origin === configuredOrigin; } catch { return false; }
    }
    return true;
}

function csrfProtection(req, res, next) {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    if (!req.cookies || !Object.prototype.hasOwnProperty.call(req.cookies, require("./utils/authCookie").COOKIE_NAME)) return next();
    if (!sameOriginRequest(req)) {
        return res.status(403).json({
            success: false,
            message: "Cross-site request blocked.",
            errors: []
        });
    }
    return next();
}

function requestTargetLimit(req, res, next) {
    if (req.originalUrl.length > Number(process.env.MAX_REQUEST_TARGET_LENGTH || 4096)) {
        return res.status(414).json({
            success: false,
            message: "Request target is too large.",
            errors: []
        });
    }
    next();
}

app.use(requestTargetLimit);
app.use(csrfProtection);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication attempts. Please try again later.",
        errors: []
    }
});

const passwordRecoveryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many password recovery requests. Please try again later.",
        errors: []
    }
});

const sensitiveAccountLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many account security requests. Please try again later.",
        errors: []
    }
});

const verificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many verification requests. Please try again later.",
        errors: []
    }
});

function denySensitiveStaticFiles(req, res, next) {
    const pathname = req.path || "";
    if (/(^|\/)\.(env|git|gitignore)|(^|\/)server(\.js)?$|package(-lock)?\.json$|^\/uploads\/gallery(?:\/|$)/i.test(pathname)) {
        return res.status(404).end();
    }
    next();
}

app.use(denySensitiveStaticFiles);

const staticOptions = {
    dotfiles: "deny",
    index: false,
    fallthrough: true
};

const mediaLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false });
app.use("/media/gallery", mediaLimiter, require("./routes/galleryMedia"));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), staticOptions));
app.use("/assets", express.static(path.join(process.cwd(), "assets"), staticOptions));
app.use("/css", express.static(path.join(process.cwd(), "css"), staticOptions));
app.use("/js", express.static(path.join(process.cwd(), "js"), staticOptions));
app.use("/public", express.static(path.join(process.cwd(), "public"), staticOptions));
app.use("/member", express.static(path.join(process.cwd(), "member"), staticOptions));
app.use("/admin", express.static(path.join(process.cwd(), "admin"), staticOptions));

app.use("/api/v1/auth/forgot-password", passwordRecoveryLimiter);
app.use("/api/v1/auth/reset-password", passwordRecoveryLimiter);
app.use("/api/v1/auth/verify-email", verificationLimiter);
app.use("/api/v1/auth/me/password", sensitiveAccountLimiter);
app.use("/api/v1/auth/me/photo", sensitiveAccountLimiter);
app.use("/api/v1/auth", authLimiter);

app.use("/api/v1", apiLimiter, apiRoutes);

// Legacy health endpoint retained for existing tooling/frontend compatibility.
app.get("/api/health", getHealth);

/*
 * Legacy API aliases are retained so the existing PrimeIt frontend
 * continues to work while the canonical API moves to /api/v1.
 */
app.use("/api", apiLimiter);\napp.use("/api/auth/forgot-password", passwordRecoveryLimiter);
app.use("/api/auth/reset-password", passwordRecoveryLimiter);
app.use("/api/auth/verify-email", verificationLimiter);
app.use("/api/auth/me/password", sensitiveAccountLimiter);
app.use("/api/auth/me/photo", sensitiveAccountLimiter);
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/members", require("./routes/members"));
app.use("/api/roles", require("./routes/roles"));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
