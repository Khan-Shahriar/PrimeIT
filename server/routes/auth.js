const express = require("express");
const { pool } = require("../db");
const { requireAuth } = require("../middleware/auth");
const profileUpload = require("../middleware/profileUpload");
const { clearAuthCookie } = require("../utils/authCookie");
const asyncHandler = require("../middleware/asyncHandler");
const validate = require("../middleware/validate");
const validators = require("../validators/authValidators");
const authController = require("../controllers/authController");
const { hashPassword, verifyPassword } = require("../utils/password");

const router = express.Router();

function validationMiddleware(fn) {
    return validate({
        body: body => {
            const errors = fn(body);
            return Object.keys(errors).length
                ? Object.entries(errors).map(([field, message]) => ({ field, message }))
                : true;
        }
    });
}

router.post("/signup", validationMiddleware(validators.signup), asyncHandler(authController.signup));
router.post("/login", validationMiddleware(validators.login), asyncHandler(authController.login));
router.post("/logout", asyncHandler(authController.logout));
router.get("/me", requireAuth, asyncHandler(authController.me));
router.post("/verify-email", validationMiddleware(validators.verifyEmail), asyncHandler(authController.verifyEmail));
router.post("/forgot-password", validationMiddleware(validators.forgotPassword), asyncHandler(authController.forgotPassword));
router.post("/reset-password", validationMiddleware(validators.resetPassword), asyncHandler(authController.resetPassword));

router.put("/me", requireAuth, asyncHandler(async (req, res) => {
    const fullName = typeof req.body.full_name === "string" ? req.body.full_name.trim() : "";
    const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
    const bio = typeof req.body.bio === "string" ? req.body.bio.trim() : "";
    const errors = {};
    if (fullName.length < 2 || fullName.length > 100) errors.full_name = "Full name must be between 2 and 100 characters.";
    if (phone.length > 30) errors.phone = "Phone number must not exceed 30 characters.";
    if (bio.length > 1000) errors.bio = "Bio must not exceed 1000 characters.";
    if (Object.keys(errors).length) return res.status(400).json({ success: false, message: "Please correct the validation errors", errors });

    const [result] = await pool.query(
        "UPDATE users SET full_name = ?, phone = ?, bio = ? WHERE id = ?",
        [fullName, phone || null, bio || null, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "User not found" });

    const [users] = await pool.query(
        "SELECT id, full_name, email, phone, bio, profile_photo, department, position, role, status, email_verified, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
        [req.user.id]
    );
    return res.json({ success: true, message: "Profile updated successfully", user: users[0] });
}));

router.post("/me/photo", requireAuth, (req, res, next) => {
    profileUpload.single("profile_photo")(req, res, error => {
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.code === "LIMIT_FILE_SIZE"
                    ? "Profile photo must be 2 MB or smaller."
                    : (error.message || "Invalid profile photo.")
            });
        }
        next();
    });
}, asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "Profile photo is required" });
    const photoPath = "/uploads/profiles/" + req.file.filename;
    await pool.query("UPDATE users SET profile_photo = ? WHERE id = ?", [photoPath, req.user.id]);
    return res.json({ success: true, message: "Profile photo uploaded successfully", profile_photo: photoPath });
}));

router.put("/me/password", requireAuth, asyncHandler(async (req, res) => {
    const currentPassword = req.body.current_password;
    const newPassword = req.body.new_password;
    const confirmation = req.body.confirm_password;

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
        return res.status(400).json({ success: false, message: "Current password and new password are required" });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
        return res.status(400).json({ success: false, message: "New password must be between 8 and 128 characters" });
    }
    if (confirmation !== undefined && confirmation !== newPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match" });
    }
    if (currentPassword === newPassword) {
        return res.status(400).json({ success: false, message: "New password must be different from current password" });
    }

    const [users] = await pool.query("SELECT password_hash, status FROM users WHERE id = ? LIMIT 1", [req.user.id]);
    if (!users.length || users[0].status !== "active") return res.status(401).json({ success: false, message: "Authentication required" });
    if (!await verifyPassword(currentPassword, users[0].password_hash)) {
        return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    await pool.query(
        "UPDATE users SET password_hash = ?, auth_token_version = COALESCE(auth_token_version, 0) + 1 WHERE id = ?",
        [await hashPassword(newPassword), req.user.id]
    );
    clearAuthCookie(res);
    return res.json({ success: true, message: "Password changed successfully. Please sign in again." });
}));

module.exports = router;
