const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const galleryController = require("../controllers/galleryController");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { galleryUpload } = require("../middleware/galleryUpload");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

const galleryWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many gallery write requests. Please try again later.", errors: [] }
});

function uploadErrorHandler(error, req, res, next) {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ success: false, message: "The image exceeds the 10 MB upload limit.", errors: [] });
        if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") return res.status(400).json({ success: false, message: "Only one image can be uploaded at a time.", errors: [] });
        return res.status(400).json({ success: false, message: "The multipart upload request is invalid.", errors: [] });
    }
    if (error.message === "Only JPEG, PNG, and WebP images are allowed.") return res.status(415).json({ success: false, message: error.message, errors: [] });
    next(error);
}

router.get("/", asyncHandler(galleryController.listPublic));
router.get("/admin", requireAuth, requirePermission("gallery.view"), asyncHandler(galleryController.listAdmin));
router.get("/:id", asyncHandler(galleryController.getOne));

router.post("/", galleryWriteLimiter, requireAuth, requirePermission("gallery.create"), galleryUpload, uploadErrorHandler, asyncHandler(galleryController.create));
router.patch("/:id", galleryWriteLimiter, requireAuth, requirePermission("gallery.update"), galleryUpload, uploadErrorHandler, asyncHandler(galleryController.update));
router.post("/:id/archive", galleryWriteLimiter, requireAuth, requirePermission("gallery.archive"), asyncHandler(galleryController.archive));

module.exports = router;
