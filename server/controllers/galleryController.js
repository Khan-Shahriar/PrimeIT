const galleryService = require("../services/galleryService");

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
    if (item.status !== "Published") return res.status(404).json({ success: false, message: "Gallery item not found" });
    return res.json({ success: true, data: item });
}

async function create(req, res) {
    const item = await galleryService.create({ body: req.body, file: req.file, userId: req.user.id });
    return res.status(201).json({ success: true, message: "Gallery image uploaded successfully", data: item });
}

async function update(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid gallery ID" });
    const item = await galleryService.update({ id, body: req.body, file: req.file });
    return res.json({ success: true, message: "Gallery item updated successfully", data: item });
}

async function publish(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid gallery ID" });
    const status = String(req.body?.status || "Published").trim();
    if (!["Published", "Draft"].includes(status)) return res.status(400).json({ success: false, message: "Invalid publication status" });
    const item = await galleryService.update({ id, body: { status }, file: null });
    return res.json({ success: true, message: status === "Published" ? "Gallery item published successfully" : "Gallery item unpublished successfully", data: item });
}

async function archive(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid gallery ID" });
    const item = await galleryService.archive(id);
    return res.json({ success: true, message: "Gallery item archived successfully", data: item });
}

module.exports = { listPublic, listAdmin, getOne, create, update, publish, archive };
