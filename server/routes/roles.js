const express = require("express");

const { pool } = require("../db");

const {
    requireAuth,
    requireFullAccess
} = require("../middleware/auth");

const router = express.Router();


/* ==========================================
   GET ALL ROLES
   ========================================== */

router.get(
    "/",
    requireAuth,
    requireFullAccess,
    async (req, res) => {

        try {

            const [roles] = await pool.query(
                `
                SELECT
                    id,
                    name,
                    description,
                    created_at
                FROM roles
                ORDER BY
                    CASE name
                        WHEN 'ceo' THEN 1
                        WHEN 'developer' THEN 2
                        WHEN 'admin' THEN 3
                        WHEN 'hr' THEN 4
                        WHEN 'member' THEN 5
                        ELSE 6
                    END,
                    name ASC
                `
            );

            return res.json({
                success: true,
                roles
            });

        } catch (error) {

            console.error(
                "Get roles error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to load roles"
            });
        }
    }
);


/* ==========================================
   GET ALL PERMISSIONS
   ========================================== */

router.get(
    "/permissions/all",
    requireAuth,
    requireFullAccess,
    async (req, res) => {

        try {

            const [permissions] = await pool.query(
                `
                SELECT
                    id,
                    name,
                    description
                FROM permissions
                ORDER BY id ASC
                `
            );

            return res.json({
                success: true,
                permissions
            });

        } catch (error) {

            console.error(
                "Get permissions error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to load permissions"
            });
        }
    }
);


/* ==========================================
   GET ROLE PERMISSIONS
   ========================================== */

router.get(
    "/:id/permissions",
    requireAuth,
    requireFullAccess,
    async (req, res) => {

        try {

            const roleId = Number(req.params.id);

            if (
                !Number.isInteger(roleId) ||
                roleId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid role ID"
                });
            }


            const [roles] = await pool.query(
                `
                SELECT
                    id,
                    name,
                    description
                FROM roles
                WHERE id = ?
                LIMIT 1
                `,
                [roleId]
            );


            if (roles.length === 0) {

                return res.status(404).json({
                    success: false,
                    message: "Role not found"
                });
            }


            const [permissions] = await pool.query(
                `
                SELECT
                    p.id,
                    p.name,
                    p.description
                FROM role_permissions rp
                INNER JOIN permissions p
                    ON rp.permission_id = p.id
                WHERE rp.role_id = ?
                ORDER BY p.id ASC
                `,
                [roleId]
            );


            return res.json({
                success: true,
                role: roles[0],
                permissions
            });

        } catch (error) {

            console.error(
                "Get role permissions error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to load role permissions"
            });
        }
    }
);


module.exports = router;