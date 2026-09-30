const announcementService = require("../services/announcementService");

async function list(req, res) {
    const options = announcementService.normalizeQuery(req.query);
    const admin = Boolean(req.announcementAdmin);
    const result = await announcementService.listAnnouncements({ ...options, admin });

    return res.json({
        success: true,
        announcements: result.rows,
        pagination: {
            limit: options.limit,
            offset: options.offset,
            total: result.total
        }
    });
}

async function get(req, res) {
    const item = await announcementService.getAnnouncement(req.params.id, {
        admin: Boolean(req.announcementAdmin)
    });

    return res.json({
        success: true,
        announcement: item
    });
}

async function create(req, res) {
    const item = await announcementService.createAnnouncement(req.body, req.user.id);

    return res.status(201).json({
        success: true,
        message: "Announcement created successfully",
        announcement: item
    });
}

async function update(req, res) {
    const item = await announcementService.updateAnnouncement(req.params.id, req.body);

    return res.json({
        success: true,
        message: "Announcement updated successfully",
        announcement: item
    });
}

async function publish(req, res) {
    const item = await announcementService.publishAnnouncement(req.params.id);
    return res.json({
        success: true,
        message: "Announcement published successfully",
        announcement: item
    });
}

async function unpublish(req, res) {
    const item = await announcementService.unpublishAnnouncement(req.params.id);
    return res.json({
        success: true,
        message: "Announcement unpublished successfully",
        announcement: item
    });
}

async function archive(req, res) {
    const item = await announcementService.archiveAnnouncement(req.params.id);
    return res.json({
        success: true,
        message: "Announcement archived successfully",
        announcement: item
    });
}

async function remove(req, res) {
    await announcementService.removeAnnouncement(req.params.id);
    return res.json({
        success: true,
        message: "Announcement deleted successfully"
    });
}

module.exports = {
    list,
    get,
    create,
    update,
    publish,
    unpublish,
    archive,
    remove
};
