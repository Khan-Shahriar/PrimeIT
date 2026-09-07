const express = require("express");

const {
    requireAuth,
    requirePermission
} = require("../middleware/auth");

const router = express.Router();


/* =========================================================
   PERMISSION TEST
========================================================= */

router.get(
    "/permission",
    requireAuth,
    requirePermission("view_dashboard"),
    (req, res) => {

        return res.json({
            success: true,
            message: "Permission granted",
            user: {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role
            }
        });
    }
);


module.exports = router;