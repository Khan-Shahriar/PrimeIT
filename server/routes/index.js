const express = require("express");
const systemRoutes = require("./system");
const authRoutes = require("./auth");
const memberRoutes = require("./members");
const roleRoutes = require("./roles");

const router = express.Router();

router.use("/", systemRoutes);
router.use("/auth", authRoutes);
router.use("/members", memberRoutes);
router.use("/roles", roleRoutes);
router.use("/gallery", require("./gallery"));

module.exports = router;
