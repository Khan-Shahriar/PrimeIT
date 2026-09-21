const express = require("express");
const bcrypt = require("bcryptjs");

const { pool } = require("../db");
const { getRoleByName } = require("../repositories/roleRepository");

const {
    requireAuth,
    requirePermission
} = require("../middleware/auth");

const router = express.Router();

function isFullAccessRole(role) {
    return ["ceo", "developer"].includes(String(role || "").toLowerCase());
}




/* =========================================================
   CREATE MEMBER
   Permission: manage_members
========================================================= */

router.post(
    "/",
    requireAuth,
    requirePermission("members.create"),
    async (req, res) => {
        try {
            const {
                full_name,
                email,
                password,
                phone,
                department,
                position,
                role,
                status
            } = req.body;

            const normalizedName = String(full_name || "").trim();
            const normalizedEmail = String(email || "").trim().toLowerCase();
            const rawPassword = String(password || "");
            const normalizedRole = String(role || "member").trim().toLowerCase();
            const normalizedStatus = String(status || "active").trim().toLowerCase();

            /* =====================================================
               VALIDATION
            ===================================================== */

            const errors = {};

            if (!normalizedName) {
                errors.full_name = "Full name is required.";
            } else if (normalizedName.length < 2) {
                errors.full_name = "Full name must be at least 2 characters.";
            } else if (normalizedName.length > 100) {
                errors.full_name = "Full name must not exceed 100 characters.";
            }

            if (!normalizedEmail) {
                errors.email = "Email is required.";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
                errors.email = "Please provide a valid email address.";
            } else if (normalizedEmail.length > 150) {
                errors.email = "Email must not exceed 150 characters.";
            }

            if (!rawPassword) {
                errors.password = "Password is required.";
            } else if (rawPassword.length < 8) {
                errors.password = "Password must be at least 8 characters.";
            } else if (rawPassword.length > 128) {
                errors.password = "Password must not exceed 128 characters.";
            }

            const requestedRole = await getRoleByName(normalizedRole);
            if (!requestedRole || requestedRole.status !== "active") {
                errors.role = "Invalid or inactive role.";
            }

            if (
                requestedRole &&
                requestedRole.is_system &&
                isFullAccessRole(requestedRole.name) &&
                !req.authorization?.isAuthorizationManager
            ) {
                errors.role = "Only CEO or Developer can assign protected roles.";
            }

            const allowedStatuses = [
                "active",
                "inactive"
            ];

            if (!allowedStatuses.includes(normalizedStatus)) {
                errors.status = "Invalid status.";
            }

            if (Object.keys(errors).length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Please correct the validation errors",
                    errors
                });
            }

            /* =====================================================
               DUPLICATE EMAIL CHECK
            ===================================================== */

            const [existingUsers] = await pool.query(
                `SELECT id
                 FROM users
                 WHERE email = ?
                 LIMIT 1`,
                [normalizedEmail]
            );

            if (existingUsers.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "An account with this email already exists"
                });
            }

            /* =====================================================
               PASSWORD HASH
            ===================================================== */

            const passwordHash = await bcrypt.hash(
                rawPassword,
                12
            );

            /* =====================================================
               CREATE MEMBER
            ===================================================== */

            const [result] = await pool.query(
                `INSERT INTO users
                (
                    full_name,
                    email,
                    password_hash,
                    phone,
                    department,
                    position,
                    role,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    normalizedName,
                    normalizedEmail,
                    passwordHash,
                    phone ? String(phone).trim() : null,
                    department ? String(department).trim() : null,
                    position ? String(position).trim() : null,
                    normalizedRole,
                    normalizedStatus
                ]
            );

            /* =====================================================
               RETURN CREATED MEMBER
            ===================================================== */

            await pool.query(
                "INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)",
                [result.insertId, requestedRole.id]
            );

            const [newUsers] = await pool.query(
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
                    created_at,
                    updated_at
                 FROM users
                 WHERE id = ?
                 LIMIT 1`,
                [result.insertId]
            );

            return res.status(201).json({
                success: true,
                message: "Member created successfully",
                member: newUsers[0]
            });

        } catch (error) {
            console.error("Create member error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to create member"
            });
        }
    }
);


/* =========================================================
   UPDATE MEMBER
========================================================= */

router.put("/:id", requireAuth, requirePermission("members.update"), async (req, res) => {
    try {
        const memberId = Number(req.params.id);

        if (!Number.isInteger(memberId) || memberId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid member ID"
            });
        }

        if (memberId === Number(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "You cannot delete your own account."
            });
        }

        const {
            full_name,
            email,
            password,
            phone,
            bio,
            department,
            position,
            role,
            status
        } = req.body;

        const errors = {};

        if (full_name !== undefined) {
            if (typeof full_name !== "string" || !full_name.trim()) {
                errors.full_name = "Full name is required.";
            } else if (full_name.trim().length < 2 || full_name.trim().length > 100) {
                errors.full_name = "Full name must be between 2 and 100 characters.";
            }
        }

        if (email !== undefined) {
            if (typeof email !== "string" || !email.trim()) {
                errors.email = "Email is required.";
            } else if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
                email.trim().length > 150
            ) {
                errors.email = "Please provide a valid email address.";
            }
        }

        if (password !== undefined && password !== "") {
            if (typeof password !== "string" || password.length < 8 || password.length > 128) {
                errors.password = "Password must be between 8 and 128 characters.";
            }
        }

        let requestedRole = null;
        if (role !== undefined) {
            requestedRole = await getRoleByName(String(role).trim().toLowerCase());
            if (!requestedRole || requestedRole.status !== "active") {
                errors.role = "Invalid or inactive role.";
            } else if (!req.authorization?.isAuthorizationManager) {
                return res.status(403).json({
                    success: false,
                    message: "Role assignment requires authorization-management access."
                });
            }
        }



        const allowedStatuses = [
            "active",
            "inactive"
        ];

        if (
            status !== undefined &&
            !allowedStatuses.includes(String(status).trim().toLowerCase())
        ) {
            errors.status = "Invalid status.";
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please correct the validation errors",
                errors
            });
        }

        const [existingMembers] = await pool.query(
            `SELECT
                id,
                full_name,
                email,
                phone,
                bio,
                department,
                position,
                role,
                status
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [memberId]
        );

        if (existingMembers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Member not found"
            });
        }

        const currentMember = existingMembers[0];

        if (
            isFullAccessRole(currentMember.role) &&
            !req.authorization?.isFullAccess
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Only CEO and Developer can modify CEO or Developer accounts."
            });
        }


        if (
            isFullAccessRole(currentMember.role) &&
            !isFullAccessRole(req.user.role)
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Only CEO and Developer can modify CEO or Developer accounts."
            });
        }



        if (email !== undefined) {
            const normalizedEmail = email.trim().toLowerCase();

            const [duplicateEmail] = await pool.query(
                `SELECT id
                 FROM users
                 WHERE email = ?
                   AND id != ?
                 LIMIT 1`,
                [
                    normalizedEmail,
                    memberId
                ]
            );

            if (duplicateEmail.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "An account with this email already exists"
                });
            }
        }


        const updatedFullName =
            full_name !== undefined
                ? full_name.trim()
                : currentMember.full_name;

        const updatedEmail =
            email !== undefined
                ? email.trim().toLowerCase()
                : currentMember.email;

        const updatedPhone =
            phone !== undefined
                ? phone || null
                : currentMember.phone;

        const updatedBio =
            bio !== undefined
                ? bio || null
                : currentMember.bio;

        const updatedDepartment =
            department !== undefined
                ? department || null
                : currentMember.department;

        const updatedPosition =
            position !== undefined
                ? position || null
                : currentMember.position;

        const updatedRole =
            role !== undefined
                ? requestedRole.name
                : currentMember.role;

        const updatedStatus =
            status !== undefined
                ? String(status).trim().toLowerCase()
                : currentMember.status;

        let passwordHash = null;

        if (password !== undefined && password !== "") {
            passwordHash = await bcrypt.hash(password, 12);
        }

        if (passwordHash) {
            await pool.query(
                `UPDATE users
                 SET
                    full_name = ?,
                    email = ?,
                    password_hash = ?,
                    phone = ?,
                    bio = ?,
                    department = ?,
                    position = ?,
                    role = ?,
                    status = ?
                 WHERE id = ?`,
                [
                    updatedFullName,
                    updatedEmail,
                    passwordHash,
                    updatedPhone,
                    updatedBio,
                    updatedDepartment,
                    updatedPosition,
                    updatedRole,
                    updatedStatus,
                    memberId
                ]
            );
        } else {
            await pool.query(
                `UPDATE users
                 SET
                    full_name = ?,
                    email = ?,
                    phone = ?,
                    bio = ?,
                    department = ?,
                    position = ?,
                    role = ?,
                    status = ?
                 WHERE id = ?`,
                [
                    updatedFullName,
                    updatedEmail,
                    updatedPhone,
                    updatedBio,
                    updatedDepartment,
                    updatedPosition,
                    updatedRole,
                    updatedStatus,
                    memberId
                ]
            );
        }

        if (requestedRole) {
            await pool.query("DELETE FROM user_roles WHERE user_id = ?", [memberId]);
            await pool.query(
                "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
                [memberId, requestedRole.id]
            );
        }

        const [updatedMembers] = await pool.query(
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
                created_at,
                updated_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [memberId]
        );

        return res.json({
            success: true,
            message: "Member updated successfully",
            member: updatedMembers[0]
        });

    } catch (error) {
        console.error("Update member error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update member"
        });
    }
});


/* =========================================================
   GET ALL MEMBERS
   Permission: manage_members
========================================================= */

router.get(
    "/",
    requireAuth,
    requirePermission("members.view"),
    async (req, res) => {
        try {
            const [users] = await pool.query(
                `SELECT
                    id,
                    full_name,
                    email,
                    phone,
                    department,
                    position,
                    role,
                    status,
                    created_at,
                    updated_at
                 FROM users
                 ORDER BY created_at DESC`
            );

            return res.json({
                success: true,
                members: users
            });

        } catch (error) {
            console.error("Get members error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve members"
            });
        }
    }
);

/* =========================================================
   GET SINGLE MEMBER
   Permission: manage_members
========================================================= */

router.get(
    "/:id",
    requireAuth,
    requirePermission("members.view"),
    async (req, res) => {
        try {
            const memberId = Number(req.params.id);

            if (!Number.isInteger(memberId) || memberId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid member ID"
                });
            }

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
                    created_at,
                    updated_at
                 FROM users
                 WHERE id = ?
                 LIMIT 1`,
                [memberId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Member not found"
                });
            }

            return res.json({
                success: true,
                member: users[0]
            });

        } catch (error) {
            console.error("Get member error:", error);

            return res.status(500).json({
                success: false,
                message: "Unable to retrieve member"
            });
        }
    }
);

/* =========================================================
   DELETE MEMBER
========================================================= */

router.delete("/:id", requireAuth, requirePermission("members.deactivate"), async (req, res) => {
    try {
        const memberId = Number(req.params.id);

        if (!Number.isInteger(memberId) || memberId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid member ID"
            });
        }

        if (memberId === Number(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "You cannot delete your own account."
            });
        }

        const [members] = await pool.query(
            `SELECT id, role FROM users WHERE id = ? LIMIT 1`,
            [memberId]
        );

        if (members.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Member not found"
            });
        }

        const currentMember = members[0];

        if (
            isFullAccessRole(currentMember.role) &&
            !isFullAccessRole(req.user.role)
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Only CEO and Developer can delete CEO or Developer accounts."
            });
        }

        await pool.query(
            "UPDATE users SET status = 'inactive', auth_token_version = auth_token_version + 1 WHERE id = ?",
            [memberId]
        );

        return res.json({
            success: true,
            message: "Member deactivated successfully"
        });

    } catch (error) {
        console.error("Delete member error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete member"
        });
    }
});

module.exports = router;