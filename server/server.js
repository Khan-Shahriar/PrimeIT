require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { testDatabaseConnection } = require("./db");
const { assertAuthenticationConfiguration } = require("./utils/authConfig");

const app = express();
const PORT = Number(process.env.PORT || 8080);

try {
    assertAuthenticationConfiguration();
} catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
}

app.use(
    helmet({
        crossOriginResourcePolicy: false
    })
);

const configuredOrigin = process.env.CLIENT_ORIGIN?.trim();

app.use(
    cors({
        origin: configuredOrigin || true,
        credentials: true
    })
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cookieParser());

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many authentication attempts. Please try again later."
    }
});

const passwordRecoveryLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many password recovery requests. Please try again later."
    }
});

app.use("/uploads", express.static("uploads"));
app.use("/assets", express.static("assets"));
app.use("/css", express.static("css"));
app.use("/js", express.static("js"));
app.use("/public", express.static("public"));
app.use("/member", express.static("member"));
app.use("/admin", express.static("admin"));

app.get("/api/health", async (req, res) => {
    res.json({
        success: true,
        message: "PrimeIt API is running",
        timestamp: new Date().toISOString()
    });
});

app.use("/api/auth/forgot-password", passwordRecoveryLimiter);
app.use("/api/auth/reset-password", passwordRecoveryLimiter);
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/members", require("./routes/members"));
app.use("/api/roles", require("./routes/roles"));

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

app.use((err, req, res, next) => {
    console.error("❌ Server error:", err);
    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

async function startServer() {
    try {
        await testDatabaseConnection();

        app.listen(PORT, () => {
            console.log("");
            console.log("========================================");
            console.log("        PRIMEIT SERVER STARTED");
            console.log("========================================");
            console.log(`🌐 http://localhost:${PORT}`);
            console.log(`❤️  http://localhost:${PORT}/api/health`);
            console.log("========================================");
            console.log("");
        });
    } catch (error) {
        console.error("❌ Server startup failed.");
        process.exit(1);
    }
}

startServer();
