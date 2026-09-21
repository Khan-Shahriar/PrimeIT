const crypto = require("crypto");
const jwt = require("jsonwebtoken");

function getJwtConfiguration() {
    const secret = process.env.JWT_SECRET;
    if (typeof secret !== "string" || secret.length < 32) throw new Error("JWT_SECRET must be configured with at least 32 characters.");
    return {
        secret,
        expiresIn: process.env.JWT_EXPIRES_IN?.trim() || "8h",
        issuer: process.env.JWT_ISSUER?.trim() || "primeit",
        audience: process.env.JWT_AUDIENCE?.trim() || "primeit-web"
    };
}

function createAccessToken({ userId, tokenVersion = 0 }) {
    const { secret, expiresIn, issuer, audience } = getJwtConfiguration();
    return jwt.sign({ sub: String(userId), typ: "access", ver: Number(tokenVersion) || 0 }, secret, {
        expiresIn, issuer, audience, algorithm: "HS256", jwtid: crypto.randomUUID()
    });
}

function verifyAccessToken(token) {
    const { secret, issuer, audience } = getJwtConfiguration();
    return jwt.verify(token, secret, { issuer, audience, algorithms: ["HS256"] });
}

module.exports = { createAccessToken, verifyAccessToken, getJwtConfiguration };