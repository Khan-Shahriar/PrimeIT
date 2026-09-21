const multer = require("multer");

const MAX_IMAGE_SIZE = Number(process.env.MAX_IMAGE_SIZE || 10 * 1024 * 1024);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_IMAGE_SIZE,
        files: 1,
        fields: 10,
        parts: 12,
        headerPairs: 200
    },
    fileFilter: (req, file, cb) => {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
            return cb(new Error("Only JPEG, PNG, and WebP images are allowed."));
        }
        cb(null, true);
    }
});

module.exports = { galleryUpload: upload.single("image"), MAX_IMAGE_SIZE };
