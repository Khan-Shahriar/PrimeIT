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


/* ==========================================
   UPDATE ROLE PERMISSIONS
========================================== */

router.put(
    "/:id/permissions",
    requireAuth,
    requireFullAccess,
    async (req, res) => {

        const connection =
            await pool.getConnection();

        let transactionStarted = false;

        try {

            const roleId =
                Number(req.params.id);

            if (
                !Number.isInteger(roleId) ||
                roleId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid role ID"
                });
            }


            const permissions =
                req.body.permissions;


            if (!Array.isArray(permissions)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Permissions must be an array"
                });
            }


            const [roles] =
                await connection.query(
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


            const role =
                roles[0];


            /*
             * CEO and Developer always have
             * full access through middleware.
             *
             * Their permissions should not be
             * manually stored.
             */

            if (
                role.name === "ceo" ||
                role.name === "developer"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "CEO and Developer have full access automatically"
                });
            }


            /*
             * Convert permission IDs to numbers
             * and remove duplicates.
             */

            const permissionIds =
                [
                    ...new Set(
                        permissions.map(
                            id => Number(id)
                        )
                    )
                ];


            /*
             * Validate every permission ID.
             */

            if (
                permissionIds.some(
                    id =>
                        !Number.isInteger(id) ||
                        id <= 0
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid permission ID"
                });
            }


            /*
             * Verify that every permission exists.
             */

            if (permissionIds.length > 0) {

                const placeholders =
                    permissionIds
                        .map(() => "?")
                        .join(",");


                const [validPermissions] =
                    await connection.query(
                        `
                        SELECT id
                        FROM permissions
                        WHERE id IN (${placeholders})
                        `,
                        permissionIds
                    );


                if (
                    validPermissions.length !==
                    permissionIds.length
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "One or more permissions do not exist"
                    });
                }
            }


            /*
             * Start transaction.
             */

            await connection.beginTransaction();

            transactionStarted = true;


            /*
             * Remove existing permissions.
             */

            await connection.query(
                `
                DELETE FROM role_permissions
                WHERE role_id = ?
                `,
                [roleId]
            );


            /*
             * Add new permissions.
             */

            if (permissionIds.length > 0) {

                const values =
                    permissionIds.map(
                        permissionId => [
                            roleId,
                            permissionId
                        ]
                    );


                await connection.query(
                    `
                    INSERT INTO role_permissions
                        (role_id, permission_id)
                    VALUES ?
                    `,
                    [values]
                );
            }


            await connection.commit();


            return res.json({
                success: true,
                message:
                    "Role permissions updated successfully",
                role,
                permissionIds
            });


        } catch (error) {

            if (transactionStarted) {
                await connection.rollback();
            }

            console.error(
                "Update role permissions error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update role permissions"
            });

        } finally {

            connection.release();

        }
    }
);



/* ==========================================
   CREATE CUSTOM ROLE
========================================== */

router.post(
    "/",
    requireAuth,
    requireFullAccess,
    async (req, res) => {

        try {

            const name =
                String(req.body.name || "")
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, "_");

            const description =
                String(req.body.description || "")
                    .trim();

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: "Role name is required"
                });
            }

            if (!/^[a-z][a-z0-9_]{2,49}$/.test(name)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Role name must contain 3–50 lowercase letters, numbers, or underscores"
                });
            }

            if (
                [
                    "ceo",
                    "developer",
                    "admin",
                    "hr",
                    "member"
                ].includes(name)
            ) {
                return res.status(409).json({
                    success: false,
                    message: "This role is reserved or already exists"
                });
            }

            if (description.length > 255) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Description cannot exceed 255 characters"
                });
            }

            const [existingRoles] =
                await pool.query(
                    `
                    SELECT id
                    FROM roles
                    WHERE name = ?
                    LIMIT 1
                    `,
                    [name]
                );

            if (existingRoles.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "A role with this name already exists"
                });
            }

            const [result] =
                await pool.query(
                    `
                    INSERT INTO roles
                        (name, description)
                    VALUES
                        (?, ?)
                    `,
                    [
                        name,
                        description || null
                    ]
                );

            const [createdRoles] =
                await pool.query(
                    `
                    SELECT
                        id,
                        name,
                        description,
                        created_at
                    FROM roles
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [result.insertId]
                );

            return res.status(201).json({
                success: true,
                message: "Custom role created successfully",
                role: createdRoles[0]
            });

        } catch (error) {

            console.error(
                "Create role error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to create role"
            });

        }
    }
);


module.exports = router;