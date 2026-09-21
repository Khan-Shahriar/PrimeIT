const express = require("express");
const systemRoutes = require("./system");
const memberRoutes = require("./members");
const authRoutes = require("./auth");
const roleRoutes = require("./roles");
const userRoleRoutes = require("./userRoles");

const router = express.Router();

router.use("/", systemRoutes);
router.use("/auth", authRoutes);
router.use("/members", memberRoutes);
router.use("/roles", roleRoutes);
router.use("/users", userRoleRoutes);
router.use("/gallery", require("./gallery"));

module.exports = router;
