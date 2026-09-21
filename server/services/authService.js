const crypto = require("crypto");
const { pool } = require("../db");
const authRepository = require("../repositories/authRepository");
const { hashPassword, verifyPassword } = require("../utils/password");
const { createAccessToken } = require("../utils/jwt");
const { sendPasswordResetEmail, sendEmailVerificationEmail } = require("../utils/email");

const RESET_MINUTES = 15;
const VERIFY_MINUTES = 30;
const GENERIC_RESET_MESSAGE = "If an account exists for that email, password reset instructions have been sent.";

function normalizeEmail(email) { return typeof email === "string" ? email.trim().toLowerCase() : ""; }
function createOpaqueToken() { return crypto.randomBytes(32).toString("hex"); }
function hashOpaqueToken(token) { return crypto.createHash("sha256").update(token).digest("hex"); }

function publicUser(user) {
    return { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, bio: user.bio, profile_photo: user.profile_photo, department: user.department, position: user.position, role: user.role, status: user.status, email_verified: Boolean(user.email_verified), created_at: user.created_at, updated_at: user.updated_at };
}

function assertActive(user) {
    if (!user || user.status !== "active") { const e = new Error("Authentication required"); e.statusCode = 401; throw e; }
}

function assertVerified(user) {
    if (String(process.env.REQUIRE_EMAIL_VERIFICATION || "").toLowerCase() === "true" && !user.email_verified) {
        const e = new Error("Please verify your email address before signing in."); e.statusCode = 403; e.code = "EMAIL_NOT_VERIFIED"; throw e;
    }
}

async function authenticate(email, password) {
    const user = await authRepository.findUserByEmail(normalizeEmail(email));
    if (!user || user.status !== "active") { const e = new Error("Invalid email or password"); e.statusCode = 401; throw e; }
    if (!await verifyPassword(password, user.password_hash)) { const e = new Error("Invalid email or password"); e.statusCode = 401; throw e; }
    assertVerified(user);
    return { token: createAccessToken({ userId: user.id, tokenVersion: user.auth_token_version }), user: publicUser(user) };
}

async function getCurrentUser(userId) { const user = await authRepository.getUserForAuth(userId); assertActive(user); return publicUser(user); }

async function createAccount(data) {
    const email = normalizeEmail(data.email);
    if (await authRepository.findUserByEmail(email)) { const e = new Error("An account with this email already exists"); e.statusCode = 409; throw e; }
    const userId = await authRepository.createUser({ ...data, email, passwordHash: await hashPassword(data.password), emailVerified: false });
    const rawToken = createOpaqueToken();
    await authRepository.updateVerification(userId, hashOpaqueToken(rawToken), new Date(Date.now() + VERIFY_MINUTES * 60000));
    try {
        const user = await authRepository.findUserById(userId);
        await sendEmailVerificationEmail({ to: user.email, fullName: user.full_name, token: rawToken });
    } catch (error) { console.error("Verification email delivery error:", error.message); }
    return { id: userId, email };
}

async function requestPasswordReset(email) {
    const user = await authRepository.findUserByEmail(normalizeEmail(email));
    if (!user || user.status !== "active") return;
    const rawToken = createOpaqueToken();
    const tokenHash = hashOpaqueToken(rawToken);
    await pool.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL", [user.id]);
    await pool.query("INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)", [user.id, tokenHash, new Date(Date.now() + RESET_MINUTES * 60000)]);
    try { await sendPasswordResetEmail({ to: user.email, fullName: user.full_name, token: rawToken }); }
    catch (error) { await pool.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ? AND used_at IS NULL", [tokenHash]); console.error("Password reset email delivery error:", error.message); }
}

async function resetPassword(token, newPassword) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const tokenHash = hashOpaqueToken(token);
        const [tokens] = await connection.query("SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1 FOR UPDATE", [tokenHash]);
        if (!tokens.length) { const e = new Error("This password reset link is invalid or has expired. Please request a new one."); e.statusCode = 400; throw e; }
        const [users] = await connection.query("SELECT id, status FROM users WHERE id = ? LIMIT 1 FOR UPDATE", [tokens[0].user_id]);
        if (!users.length || users[0].status !== "active") { const e = new Error("This password reset link is invalid or has expired. Please request a new one."); e.statusCode = 400; throw e; }
        const passwordHash = await hashPassword(newPassword);
        await connection.query("UPDATE users SET password_hash = ?, auth_token_version = COALESCE(auth_token_version, 0) + 1 WHERE id = ?", [passwordHash, tokens[0].user_id]);
        await connection.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL", [tokens[0].user_id]);
        await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
}

async function verifyEmail(token) {
    const user = await authRepository.findVerificationUser(hashOpaqueToken(token));
    if (!user) { const e = new Error("This email verification link is invalid or has expired."); e.statusCode = 400; throw e; }
    await authRepository.consumeVerification(user.id);
}

module.exports = { normalizeEmail, publicUser, authenticate, getCurrentUser, createAccount, requestPasswordReset, resetPassword, verifyEmail, GENERIC_RESET_MESSAGE };