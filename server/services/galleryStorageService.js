const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(process.env.GALLERY_UPLOAD_DIR || path.join(process.cwd(), "uploads", "gallery"));
const ORIGINALS = path.join(ROOT, "originals");

async function ensureStorage() {
    await fs.mkdir(ORIGINALS, { recursive: true });
}

function extensionForFormat(format) {
    return format === "jpeg" ? "jpg" : format;
}

function createStoredName(format) {
    return `gallery-${crypto.randomUUID()}.${extensionForFormat(format)}`;
}

function publicUrl(filename) {
    return `/uploads/gallery/originals/${encodeURIComponent(filename)}`;
}

async function saveOriginal(buffer, format) {
    await ensureStorage();
    const filename = createStoredName(format);
    const filePath = path.join(ORIGINALS, filename);
    await fs.writeFile(filePath, buffer, { flag: "wx", mode: 0o640 });
    return { filename, filePath, url: publicUrl(filename) };
}

async function deleteFile(filename) {
    if (!filename) return;
    const safeName = path.basename(filename);
    if (safeName !== filename) return;
    await fs.rm(path.join(ORIGINALS, safeName), { force: true });
}

async function replaceOriginal(buffer, format) {
    return saveOriginal(buffer, format);
}

module.exports = { ROOT, ORIGINALS, ensureStorage, saveOriginal, replaceOriginal, deleteFile, publicUrl };
