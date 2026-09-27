const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(process.env.PROFILE_UPLOAD_DIR || path.join(process.cwd(), "uploads", "profiles"));

function extensionForFormat(format) {
    return format === "jpeg" ? "jpg" : format;
}

function resolveProfilePath(filename) {
    const safeName = String(filename || "");
    if (!/^profile-[a-f0-9-]+\.(jpg|png|webp)$/i.test(safeName) || path.basename(safeName) !== safeName) {
        throw new Error("Invalid profile filename.");
    }
    const root = path.resolve(ROOT);
    const resolved = path.resolve(root, safeName);
    const relative = path.relative(root, resolved);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Invalid profile filename.");
    return resolved;
}

async function saveProfile(buffer, format, userId) {
    await fs.mkdir(ROOT, { recursive: true });
    const filename = `profile-${crypto.randomUUID()}.${extensionForFormat(format)}`;
    const filePath = resolveProfilePath(filename);
    await fs.writeFile(filePath, buffer, { flag: "wx", mode: 0o640 });
    return { filename, filePath, url: `/uploads/profiles/${encodeURIComponent(filename)}` };
}

async function deleteProfile(filename) {
    if (!filename) return;
    try { await fs.rm(resolveProfilePath(path.basename(String(filename))), { force: true }); } catch {}
}

module.exports = { ROOT, resolveProfilePath, saveProfile, deleteProfile };
