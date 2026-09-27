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

function resolveOriginalPath(filename) {
    const safeName = String(filename || "");
    if (!safeName || path.basename(safeName) !== safeName) {
        throw new Error("Invalid gallery filename.");
    }

    const resolvedRoot = path.resolve(ORIGINALS);
    const resolvedPath = path.resolve(resolvedRoot, safeName);
    const relative = path.relative(resolvedRoot, resolvedPath);

    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error("Invalid gallery filename.");
    }

    return resolvedPath;
}

function publicUrl(filename) {
    return `/media/gallery/${encodeURIComponent(filename)}`;
}

async function saveOriginal(buffer, format) {
    await ensureStorage();
    const filename = createStoredName(format);
    const filePath = resolveOriginalPath(filename);
    await fs.writeFile(filePath, buffer, { flag: "wx", mode: 0o640 });
    return { filename, filePath, url: publicUrl(filename) };
}

async function deleteFile(filename) {
    if (!filename) return;
    let filePath;
    try {
        filePath = resolveOriginalPath(filename);
    } catch {
        return;
    }
    await fs.rm(filePath, { force: true });
}


module.exports = { ROOT, ORIGINALS, ensureStorage, saveOriginal, deleteFile, publicUrl, resolveOriginalPath };
