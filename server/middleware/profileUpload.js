const multer = require("multer");

const MAX_PROFILE_SIZE = 2 * 1024 * 1024;

const profileUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_PROFILE_SIZE,
        files: 1,
        fields: 2,
        parts: 3,
        headerPairs: 100
    },
    fileFilter: (req, file, cb) => {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
            return cb(new Error("Only JPG, PNG, and WEBP images are allowed."));
        }
        cb(null, true);
    }
});

module.exports = { profileUpload, MAX_PROFILE_SIZE };
