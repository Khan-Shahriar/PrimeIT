const { pool } = require("../db");

async function findUserByEmail(email) {
    const [rows] = await pool.query("SELECT id, full_name, email, password_hash, phone, bio, profile_photo, department, position, role, status, email_verified, email_verification_token_hash, email_verification_expires_at, auth_token_version, created_at, updated_at FROM users WHERE email = ? LIMIT 1", [email]);
    return rows[0] || null;
}

async function findUserById(id) {
    const [rows] = await pool.query("SELECT id, full_name, email, password_hash, phone, bio, profile_photo, department, position, role, status, email_verified, email_verification_token_hash, email_verification_expires_at, auth_token_version, created_at, updated_at FROM users WHERE id = ? LIMIT 1", [id]);
    return rows[0] || null;
}

async function getUserForAuth(id) {
    const [rows] = await pool.query("SELECT id, full_name, email, phone, bio, profile_photo, department, position, role, status, email_verified, auth_token_version, created_at, updated_at FROM users WHERE id = ? LIMIT 1", [id]);
    return rows[0] || null;
}

async function createUser(data) {
    const [result] = await pool.query("INSERT INTO users (full_name, email, password_hash, phone, department, position, role, status, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.fullName, data.email, data.passwordHash, data.phone || null, data.department || null, data.position || null, data.role || "member", data.status || "active", data.emailVerified ? 1 : 0]);
    return result.insertId;
}

async function updateVerification(userId, tokenHash, expiresAt) {
    await pool.query("UPDATE users SET email_verification_token_hash = ?, email_verification_expires_at = ? WHERE id = ?", [tokenHash, expiresAt, userId]);
}

async function findVerificationUser(tokenHash) {
    const [rows] = await pool.query("SELECT id, status, email_verified FROM users WHERE email_verification_token_hash = ? AND email_verification_expires_at > NOW() LIMIT 1", [tokenHash]);
    return rows[0] || null;
}

async function consumeVerification(userId) {
    await pool.query("UPDATE users SET email_verified = 1, email_verification_token_hash = NULL, email_verification_expires_at = NULL WHERE id = ?", [userId]);
}

async function updatePassword(userId, passwordHash) {
    await pool.query("UPDATE users SET password_hash = ?, auth_token_version = COALESCE(auth_token_version, 0) + 1 WHERE id = ?", [passwordHash, userId]);
}

module.exports = { findUserByEmail, findUserById, getUserForAuth, createUser, updateVerification, findVerificationUser, consumeVerification, updatePassword };