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

app.use(
    helmet({
        crossOriginResourcePolicy: false
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
    if (/(^|\/)\.(env|git|gitignore)|(^|\/)server(\.js)?$|package(-lock)?\.json$/.test(pathname)) {
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

app.use("/uploads/gallery", express.static(config.gallery.uploadDir, staticOptions));
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
app.use("/api/v1/auth", authLimiter);

app.use("/api/v1", apiRoutes);

// Legacy health endpoint retained for existing tooling/frontend compatibility.
app.get("/api/health", getHealth);

/*
 * Legacy API aliases are retained so the existing PrimeIt frontend
 * continues to work while the canonical API moves to /api/v1.
 */
app.use("/api/auth/forgot-password", passwordRecoveryLimiter);
app.use("/api/auth/reset-password", passwordRecoveryLimiter);
app.use("/api/auth/verify-email", verificationLimiter);
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/members", require("./routes/members"));
app.use("/api/roles", require("./routes/roles"));

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
