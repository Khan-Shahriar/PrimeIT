const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");

const {
    validateSignup,
    validateLogin
} = require("../utils/validation");

const router = express.Router();

/* =========================================================
   SIGNUP
========================================================= */

router.post("/signup", async (req, res) => {
    try {
        const {
            full_name,
            email,
            password,
            phone,
            department,
            position
        } = req.body;

        const validation = validateSignup({
            fullName: full_name,
            email,
            password
        });

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: "Please correct the validation errors",
                errors: validation.errors
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [existingUsers] = await pool.query(
            "SELECT id FROM users WHERE email = ? LIMIT 1",
            [normalizedEmail]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const [result] = await pool.query(
            `INSERT INTO users
            (full_name, email, password_hash, phone, department, position)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                full_name.trim(),
                normalizedEmail,
                passwordHash,
                phone || null,
                department || null,
                position || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: {
                id: result.insertId,
                full_name: full_name.trim(),
                email: normalizedEmail
            }
        });

    } catch (error) {
        console.error("Signup error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create account"
        });
    }
});


/* =========================================================
   LOGIN
========================================================= */

router.post("/login", async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        const validation = validateLogin({
            email,
            password
        });

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: "Please correct the validation errors",
                errors: validation.errors
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [users] = await pool.query(
            `SELECT
                id,
                full_name,
                email,
                password_hash,
                phone,
                bio,
                profile_photo,
                department,
                position,
                role,
                status
             FROM users
             WHERE email = ?
             LIMIT 1`,
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        if (user.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive"
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.cookie("primeit_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

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

        return res.status(500).json({
            success: false,
            message: "Unable to login"
        });
    }
});


/* =========================================================
   CURRENT USER
========================================================= */

router.get("/me", requireAuth, async (req, res) => {
    try {
        const [users] = await pool.query(
            `SELECT
                id,
                full_name,
                email,
                phone,
                bio,
                profile_photo,
                department,
                position,
                role,
                status,
                created_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = users[0];

        if (user.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive"
            });
        }

        return res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error("Get current user error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve user"
        });
    }
});


/* =========================================================
   LOGOUT
========================================================= */

router.post("/logout", (req, res) => {
    res.clearCookie("primeit_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    });

    return res.json({
        success: true,
        message: "Logout successful"
    });
});


module.exports = router;