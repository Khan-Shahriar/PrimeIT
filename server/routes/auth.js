const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");
const profileUpload = require("../middleware/profileUpload");
const {
    COOKIE_NAME,
    getAuthCookieOptions
} = require("../utils/authCookie");

const {
    validateSignup,
    validateLogin
} = require("../utils/validation");

const router = express.Router();

const PASSWORD_RESET_EXPIRY_MINUTES = 15;
const PASSWORD_RESET_RESPONSE = "If an account exists for that email, password reset instructions have been sent.";
const PASSWORD_RESET_ERROR = "This password reset link is invalid or has expired. Please request a new one.";

function getJwtExpiresIn(rememberMe) {
    return rememberMe ? "30d" : "1d";
}

function isJwtSecretConfigured() {
    return typeof process.env.JWT_SECRET === "string" && process.env.JWT_SECRET.length >= 32;
}

function normalizeEmail(email) {
    return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function hashResetToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

router.post("/signup", async (req, res) => {
    try {
        const { full_name, email, password, phone, department, position } = req.body;

        const validation = validateSignup({ fullName: full_name, email, password });
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: "Please correct the validation errors",
                errors: validation.errors
            });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const [existingUsers] = await pool.query(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [normalizedEmail]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ success: false, message: "An account with this email already exists" });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const [result] = await pool.query(
            `INSERT INTO users
            (full_name, email, password_hash, phone, department, position)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [full_name.trim(), normalizedEmail, passwordHash, phone || null, department || null, position || null]
        );

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: { id: result.insertId, full_name: full_name.trim(), email: normalizedEmail }
        });
    } catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({ success: false, message: "Unable to create account" });
    }
});

router.post("/login", async (req, res) => {
    try {
        if (!isJwtSecretConfigured()) {
            console.error("JWT_SECRET must be configured with at least 32 characters.");
            return res.status(500).json({ success: false, message: "Authentication service is not configured" });
        }

        const { email, password } = req.body;
        const rememberMe = req.body?.rememberMe === true;
        const validation = validateLogin({ email, password });

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: "Please correct the validation errors",
                errors: validation.errors
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const [users] = await pool.query(
            `SELECT id, full_name, email, password_hash, phone, bio, profile_photo,
                    department, position, role, status
             FROM users WHERE email = ? LIMIT 1`,
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const user = users[0];
        if (user.status !== "active") {
            return res.status(403).json({ success: false, message: "Your account is inactive" });
        }

        const passwordMatches = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatches) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: getJwtExpiresIn(rememberMe) }
        );

        res.cookie(COOKIE_NAME, token, getAuthCookieOptions(rememberMe));

        return res.json({
            success: true,
            message: "Login successful",
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                bio: user.bio,
                profile_photo: user.profile_photo,
                department: user.department,
                position: user.position,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ success: false, message: "Unable to login" });
    }
});

router.post("/forgot-password", async (req, res) => {
    const genericResponse = () => res.status(200).json({
        success: true,
        message: PASSWORD_RESET_RESPONSE
    });

    try {
        const email = normalizeEmail(req.body?.email);

        if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return genericResponse();
        }

        const [users] = await pool.query(
            "SELECT id, status FROM users WHERE email = ? LIMIT 1",
            [email]
        );

        if (users.length === 0 || users[0].status !== "active") {
            return genericResponse();
        }

        const user = users[0];
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashResetToken(rawToken);
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

        await pool.query(
            "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
            [user.id]
        );

        await pool.query(
            `INSERT INTO password_reset_tokens
                (user_id, token_hash, expires_at)
             VALUES (?, ?, ?)`,
            [user.id, tokenHash, expiresAt]
        );

        // Email delivery is intentionally added in the email-integration part of Step 3.
        // The raw reset token is never stored in the database or returned by this API.
        void rawToken;

        return genericResponse();
    } catch (error) {
        console.error("Forgot password error:", error);
        return genericResponse();
    }
});

router.post("/reset-password", async (req, res) => {
    const invalidResponse = () => res.status(400).json({
        success: false,
        message: PASSWORD_RESET_ERROR
    });

    try {
        const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
        const newPassword = typeof req.body?.new_password === "string" ? req.body.new_password : "";

        if (!token || token.length !== 64 || !/^[a-f0-9]{64}$/i.test(token)) {
            return invalidResponse();
        }

        if (newPassword.length < 8 || newPassword.length > 128) {
            return res.status(400).json({
                success: false,
                message: "Password must be between 8 and 128 characters."
            });
        }

        const tokenHash = hashResetToken(token);
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const [tokens] = await connection.query(
                `SELECT id, user_id
                 FROM password_reset_tokens
                 WHERE token_hash = ?
                   AND used_at IS NULL
                   AND expires_at > NOW()
                 LIMIT 1
                 FOR UPDATE`,
                [tokenHash]
            );

            if (tokens.length === 0) {
                await connection.rollback();
                return invalidResponse();
            }

            const resetToken = tokens[0];
            const [users] = await connection.query(
                "SELECT id, password_hash, status FROM users WHERE id = ? LIMIT 1 FOR UPDATE",
                [resetToken.user_id]
            );

            if (users.length === 0 || users[0].status !== "active") {
                await connection.rollback();
                return invalidResponse();
            }

            const newPasswordHash = await bcrypt.hash(newPassword, 12);

            await connection.query(
                "UPDATE users SET password_hash = ? WHERE id = ?",
                [newPasswordHash, resetToken.user_id]
            );

            await connection.query(
                "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
                [resetToken.user_id]
            );

            await connection.commit();

            return res.json({
                success: true,
                message: "Password reset successfully. Please sign in with your new password."
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({ success: false, message: "Unable to reset password. Please try again." });
    }
});

router.get("/me", requireAuth, async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT id, full_name, email, phone, bio, profile_photo,
                    department, position, role, status, created_at
             FROM users WHERE id = ? LIMIT 1`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const user = users[0];
        if (user.status !== "active") {
            return res.status(403).json({ success: false, message: "Your account is inactive" });
        }

        return res.json({ success: true, user });
    } catch (error) {
        console.error("Get current user error:", error);
        return res.status(500).json({ success: false, message: "Unable to retrieve user" });
    }
});

router.put("/me", requireAuth, async (req, res) => {
    try {
        const { full_name, phone, bio } = req.body;
        const normalizedName = typeof full_name === "string" ? full_name.trim() : "";
        const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
        const normalizedBio = typeof bio === "string" ? bio.trim() : "";
        const errors = {};

        if (normalizedName.length < 2 || normalizedName.length > 100) errors.full_name = "Full name must be between 2 and 100 characters.";
        if (normalizedPhone.length > 30) errors.phone = "Phone number must not exceed 30 characters.";
        if (normalizedBio.length > 1000) errors.bio = "Bio must not exceed 1000 characters.";

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ success: false, message: "Please correct the validation errors", errors });
        }

        const [result] = await pool.query(
            `UPDATE users SET full_name = ?, phone = ?, bio = ? WHERE id = ?`,
            [normalizedName, normalizedPhone || null, normalizedBio || null, req.user.id]
        );

        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "User not found" });

        const [users] = await pool.query(
            `SELECT id, full_name, email, phone, bio, profile_photo,
                    department, position, role, status, created_at
             FROM users WHERE id = ? LIMIT 1`,
            [req.user.id]
        );

        return res.json({ success: true, message: "Profile updated successfully", user: users[0] });
    } catch (error) {
        console.error("Update current user profile error:", error);
        return res.status(500).json({ success: false, message: "Unable to update profile" });
    }
});

router.post("/me/photo", requireAuth, (req, res, next) => {
    profileUpload.single("profile_photo")(req, res, (error) => {
        if (error) {
            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ success: false, message: "Profile photo must be 2 MB or smaller." });
            }
            return res.status(400).json({ success: false, message: error.message || "Invalid profile photo." });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "Profile photo is required" });

        const photoPath = `/uploads/profiles/${req.file.filename}`;
        const [users] = await pool.query("SELECT id FROM users WHERE id = ? LIMIT 1", [req.user.id]);
        if (users.length === 0) return res.status(404).json({ success: false, message: "User not found" });

        await pool.query("UPDATE users SET profile_photo = ? WHERE id = ?", [photoPath, req.user.id]);
        return res.json({ success: true, message: "Profile photo uploaded successfully", profile_photo: photoPath });
    } catch (error) {
        console.error("Profile photo upload error:", error);
        return res.status(500).json({ success: false, message: "Unable to upload profile photo" });
    }
}, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "Profile photo is required" });

        const photoPath = `/uploads/profiles/${req.file.filename}`;
        const [users] = await pool.query("SELECT id FROM users WHERE id = ? LIMIT 1", [req.user.id]);
        if (users.length === 0) return res.status(404).json({ success: false, message: "User not found" });

        await pool.query("UPDATE users SET profile_photo = ? WHERE id = ?", [photoPath, req.user.id]);
        return res.json({ success: true, message: "Profile photo uploaded successfully", profile_photo: photoPath });
    } catch (error) {
        console.error("Profile photo upload error:", error);
        return res.status(500).json({ success: false, message: "Unable to upload profile photo" });
    }
});

router.put("/me/password", requireAuth, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (typeof current_password !== "string" || typeof new_password !== "string") {
            return res.status(400).json({ success: false, message: "Current password and new password are required" });
        }
        if (new_password.length < 8) return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
        if (new_password.length > 128) return res.status(400).json({ success: false, message: "New password must not exceed 128 characters" });
        if (current_password === new_password) return res.status(400).json({ success: false, message: "New password must be different from current password" });

        const [users] = await pool.query(
            "SELECT id, password_hash, status FROM users WHERE id = ? LIMIT 1",
            [req.user.id]
        );
        if (users.length === 0) return res.status(404).json({ success: false, message: "User not found" });

        const user = users[0];
        if (user.status !== "active") return res.status(403).json({ success: false, message: "Your account is inactive" });

        const passwordMatches = await bcrypt.compare(current_password, user.password_hash);
        if (!passwordMatches) return res.status(401).json({ success: false, message: "Current password is incorrect" });

        const newPasswordHash = await bcrypt.hash(new_password, 12);
        await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newPasswordHash, req.user.id]);
        return res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
        console.error("Change password error:", error);
        return res.status(500).json({ success: false, message: "Unable to change password" });
    }
});

router.post("/logout", (req, res) => {
    res.clearCookie(COOKIE_NAME, getAuthCookieOptions(false));
    return res.json({ success: true, message: "Logout successful" });
});

module.exports = router;
