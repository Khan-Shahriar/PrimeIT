const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth, requirePermission } = require("../middleware/auth");
const announcementController = require("../controllers/announcementController");

const router = express.Router();

router.get(
    "/admin",
    requireAuth,
    requirePermission("announcements.view"),
    (req, res, next) => {
        req.announcementAdmin = true;
        next();
    },
    asyncHandler(announcementController.list)
);

router.get(
    "/admin/:id",
    requireAuth,
    requirePermission("announcements.view"),
    (req, res, next) => {
        req.announcementAdmin = true;
        next();
    },
    asyncHandler(announcementController.get)
);

router.get(
    "/",
    requireAuth,
    requirePermission("announcements.view"),
    (req, res, next) => {
        req.announcementAdmin = false;
        next();
    },
    asyncHandler(announcementController.list)
);

router.get(
    "/:id",
    requireAuth,
    requirePermission("announcements.view"),
    (req, res, next) => {
        req.announcementAdmin = false;
        next();
    },
    asyncHandler(announcementController.get)
);

router.post(
    "/",
    requireAuth,
    requirePermission("announcements.create"),
    asyncHandler(announcementController.create)
);

router.patch(
    "/:id",
    requireAuth,
    requirePermission("announcements.update"),
    asyncHandler(announcementController.update)
);

router.post(
    "/:id/publish",
    requireAuth,
    requirePermission("announcements.publish"),
    asyncHandler(announcementController.publish)
);

router.post(
    "/:id/unpublish",
    requireAuth,
    requirePermission("announcements.unpublish"),
    asyncHandler(announcementController.unpublish)
);

router.post(
    "/:id/archive",
    requireAuth,
    requirePermission("announcements.delete"),
    asyncHandler(announcementController.archive)
);

router.delete(
    "/:id",
    requireAuth,
    requirePermission("announcements.delete"),
    asyncHandler(announcementController.remove)
);

module.exports = router;
