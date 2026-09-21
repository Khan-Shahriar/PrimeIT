const express = require("express");
const path = require("path");
const fs = require("fs");
const { getUserForAuth } = require("../repositories/authRepository");
const { verifyAccessToken } = require("../utils/jwt");
const { COOKIE_NAME } = require("../utils/authCookie");
const galleryRepository = require("../repositories/galleryRepository");
const { ORIGINALS } = require("../services/galleryStorageService");

const router = express.Router();

async function optionalUser(req) {
    try {
        const token = req.cookies?.[COOKIE_NAME];
        if (!token) return null;
        const decoded = verifyAccessToken(token);
        const userId = Number(decoded?.sub);
        if (!Number.isInteger(userId) || userId <= 0 || decoded?.typ !== "access") return null;
        const user = await getUserForAuth(userId);
        if (!user || user.status !== "active" || Number(decoded.ver || 0) !== Number(user.auth_token_version || 0)) return null;
        return user;
    } catch {
        return null;
    }
}

async function hasGalleryView(user) {
    if (!user) return false;
    if (["ceo", "developer"].includes(user.role)) return true;
    const { pool } = require("../db");
    const [rows] = await pool.query(
        "SELECT p.id FROM role_permissions rp INNER JOIN roles r ON rp.role_id = r.id INNER JOIN permissions p ON rp.permission_id = p.id WHERE r.name = ? AND p.name = 'gallery.view' LIMIT 1",
        [user.role]
    );
    return rows.length > 0;
}

router.get("/:filename", async (req, res, next) => {
    try {
        const filename = String(req.params.filename || "");
        if (!filename || path.basename(filename) !== filename || !/^gallery-[a-f0-9-]+\.(jpg|png|webp)$/i.test(filename)) {
            return res.status(404).end();
        }

        const item = await galleryRepository.findByStoredFilename(filename);
        if (!item) return res.status(404).end();

        if (item.status !== "Published" && !(await hasGalleryView(await optionalUser(req)))) {
            return res.status(404).end();
        }

        const filePath = path.join(ORIGINALS, filename);
        if (!fs.existsSync(filePath)) return res.status(404).end();

        return res.sendFile(filePath, {
            headers: {
                "Cache-Control": "public, max-age=31536000, immutable"
            }
        });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;
