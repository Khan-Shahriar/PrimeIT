const express = require("express");
const rateLimit = require("express-rate-limit");
const leaveController = require("../controllers/leaveController");
const { requireAuth, requirePermission } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

const leaveWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many leave requests. Please try again later.", errors: [] }
});

router.get("/", requireAuth, requirePermission("leave.view"), asyncHandler(leaveController.listMine));
router.get("/balance", requireAuth, requirePermission("leave.view"), asyncHandler(leaveController.getBalance));
router.get("/admin", requireAuth, requirePermission("leave.view"), asyncHandler(leaveController.listAdmin));

router.post("/", leaveWriteLimiter, requireAuth, requirePermission("leave.create"), asyncHandler(leaveController.create));
router.post("/:id/cancel", leaveWriteLimiter, requireAuth, requirePermission("leave.cancel"), asyncHandler(leaveController.cancel));
router.post("/:id/approve", leaveWriteLimiter, requireAuth, requirePermission("leave.approve"), asyncHandler(leaveController.approve));
router.post("/:id/reject", leaveWriteLimiter, requireAuth, requirePermission("leave.reject"), asyncHandler(leaveController.reject));

module.exports = router;
