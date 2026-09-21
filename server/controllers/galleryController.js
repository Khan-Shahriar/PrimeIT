const galleryService = require("../services/galleryService");

function sendGallery(res, item, status = 200, message) {
    return res.status(status).json({ success: true, message, data: item });
}

async function listPublic(req, res) {
    const items = await galleryService.list({ admin: false });
    return res.json({ success: true, data: items });
}

async function listAdmin(req, res) {
    const items = await galleryService.list({ admin: true });
    return res.json({ success: true, data: items });
}

async function getOne(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid gallery ID" });
    const item = await galleryService.findById(id);
    if (!item) return res.status(404).json({ success: false, message: "Gallery item not found" });
    if (item.status !== "Published" && !["ceo", "developer"].includes(req.user?.role)) return res.status(404).json({ success: false, message: "Gallery item not found" });
    return sendGallery(res, item);
}

async function create(req, res) {
    const item = await galleryService.create({ body: req.body, file: req.file, userId: req.user.id });
    return sendGallery(res, item, 201, "Gallery image uploaded successfully");
}

async function update(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid gallery ID" });
    const item = await galleryService.update({ id, body: req.body, file: req.file });
    return sendGallery(res, item, 200, "Gallery item updated successfully");
}

async function archive(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid gallery ID" });
    const item = await galleryService.archive(id);
    return sendGallery(res, item, 200, "Gallery item archived successfully");
}

async function remove(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid gallery ID" });
    await galleryService.remove(id);
    return res.json({ success: true, message: "Gallery media removed successfully" });
}

module.exports = { listPublic, listAdmin, getOne, create, update, archive, remove };
