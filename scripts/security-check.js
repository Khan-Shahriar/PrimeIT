"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const failures = [];
const warnings = [];

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireText(relativePath, text, label = text) {
    const content = read(relativePath);
    if (!content.includes(text)) failures.push(relativePath + ": missing " + label);
}

function walk(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(fullPath) : [fullPath];
    });
}

requireText("server/app.js", "helmet(");
requireText("server/app.js", "app.disable(\"x-powered-by\")");
requireText("server/app.js", "express.json({ limit:");
requireText("server/app.js", "requestTargetLimit");
requireText("server/app.js", "csrfProtection");
requireText("server/app.js", "apiLimiter");
requireText("server/app.js", "TRACE");
requireText("server/app.js", "frameAncestors");
requireText("server/utils/jwt.js", 'algorithms: ["HS256"]');
requireText("server/utils/jwt.js", "issuer");
requireText("server/utils/jwt.js", "audience");
requireText("server/utils/authCookie.js", "httpOnly: true");
requireText("server/utils/authCookie.js", "sameSite:");
requireText("server/middleware/profileUpload.js", "memoryStorage()");
requireText("server/middleware/galleryUpload.js", "memoryStorage()");
requireText("server/services/profileStorageService.js", "path.relative");
requireText("server/services/galleryStorageService.js", "path.relative");
requireText("server/middleware/requestLogger.js", "path: req.path");
requireText("server/controllers/authController.js", "invalidateTokens");
requireText("server/routes/auth.js", 'router.post("/logout", requireAuth');

const lock = JSON.parse(read("package-lock.json"));
const bodyParserVersion = lock.packages?.["node_modules/body-parser"]?.version;
if (!bodyParserVersion) {
    failures.push("package-lock.json: body-parser version not found");
} else {
    const parts = bodyParserVersion.split(".").map(Number);
    const vulnerable = parts[0] < 2 || (parts[0] === 2 && parts[1] < 3);
    if (vulnerable) failures.push("package-lock.json: body-parser is below 2.3.0");
}

const sourceFiles = [
    ...walk(path.join(root, "server")),
    ...walk(path.join(root, "js"))
].filter(file => file.endsWith(".js"));

for (const file of sourceFiles) {
    const relative = path.relative(root, file);
    const content = fs.readFileSync(file, "utf8");
    try {
        new vm.Script(content, { filename: relative });
    } catch (error) {
        failures.push(relative + ": syntax error: " + error.message);
    }
    if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(content)) {
        failures.push(relative + ": dynamic code execution pattern found");
    }
    if (/process\.env\.[A-Z0-9_]+\s*=/.test(content)) {
        warnings.push(relative + ": runtime environment mutation pattern found");
    }
}

const gitignore = read(".gitignore");
if (!/(^|\n)\.env(\r?\n|$)/m.test(gitignore)) failures.push(".gitignore: .env is not ignored");
if (!/(^|\n)uploads\/\*(\r?\n|$)/m.test(gitignore)) warnings.push(".gitignore: uploads are not globally ignored");

if (failures.length) {
    console.error("PrimeIt security check failed:");
    failures.forEach(item => console.error("FAIL " + item));
    warnings.forEach(item => console.warn("WARN " + item));
    process.exitCode = 1;
} else {
    console.log("PrimeIt security static check passed.");
    warnings.forEach(item => console.warn("WARN " + item));
}
