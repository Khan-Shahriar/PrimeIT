const express = require("express");
const multer = require("multer");
const galleryController = require("../controllers/galleryController");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { galleryUpload } = require("../middleware/galleryUpload");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

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
router.get("/admin", requireAuth, requirePermission("manage_gallery"), asyncHandler(galleryController.listAdmin));
router.get("/:id", asyncHandler(galleryController.getOne));

router.post("/", requireAuth, requirePermission("manage_gallery"), galleryUpload, uploadErrorHandler, asyncHandler(galleryController.create));
router.patch("/:id", requireAuth, requirePermission("manage_gallery"), galleryUpload, uploadErrorHandler, asyncHandler(galleryController.update));
router.delete("/:id", requireAuth, requirePermission("manage_gallery"), asyncHandler(galleryController.remove));
router.post("/:id/archive", requireAuth, requirePermission("manage_gallery"), asyncHandler(galleryController.archive));

module.exports = router;
