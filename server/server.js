require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { testDatabaseConnection } = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 8080);

/* =========================================================
   PRODUCTION CONFIGURATION VALIDATION
========================================================= */

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error("❌ JWT_SECRET must be configured with at least 32 characters.");
    process.exit(1);
}

/* =========================================================
   SECURITY
========================================================= */

app.use(
    helmet({
        crossOriginResourcePolicy: false
    })
);

/* =========================================================
   CORS
========================================================= */

const configuredOrigin = process.env.CLIENT_ORIGIN?.trim();

app.use(
    cors({
        origin: configuredOrigin || true,
        credentials: true
    })
);

/* =========================================================
   BODY PARSING
========================================================= */

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

/* =========================================================
   COOKIES
========================================================= */

app.use(cookieParser());

/* =========================================================
   RATE LIMITING
========================================================= */

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

/* =========================================================
   STATIC FILES
========================================================= */

app.use("/uploads", express.static("uploads"));
app.use("/assets", express.static("assets"));
app.use("/css", express.static("css"));
app.use("/js", express.static("js"));
app.use("/public", express.static("public"));
app.use("/member", express.static("member"));
app.use("/admin", express.static("admin"));

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", async (req, res) => {
    res.json({
        success: true,
        message: "PrimeIt API is running",
        timestamp: new Date().toISOString()
    });
});

/* =========================================================
   API ROUTES
========================================================= */

app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/members", require("./routes/members"));
app.use("/api/roles", require("./routes/roles"));

/* =========================================================
   404 API HANDLER
========================================================= */

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((err, req, res, next) => {
    console.error("❌ Server error:", err);
    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

/* =========================================================
   START SERVER
========================================================= */

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
