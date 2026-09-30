const announcementRepository = require("../repositories/announcementRepository");

const STATUSES = Object.freeze({
    DRAFT: "Draft",
    PUBLISHED: "Published",
    ARCHIVED: "Archived"
});

const MAX_LIMIT = 100;

function httpError(statusCode, message, errors = []) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.errors = errors;
    return error;
}

function normalizeId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw httpError(400, "Invalid announcement ID");
    }
    return id;
}

function normalizeDate(value, field = "publishedAt") {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string") {
        throw httpError(400, "Invalid date value", [{ field, message: "Date must be a valid ISO date string." }]);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw httpError(400, "Invalid date value", [{ field, message: "Date must be a valid ISO date string." }]);
    }
    return date;
}

function normalizeBoolean(value, field) {
    if (value === undefined) return undefined;
    if (typeof value === "boolean") return value;
    if (value === 0 || value === 1) return Boolean(value);
    throw httpError(400, "Invalid boolean value", [{ field, message: `${field} must be a boolean.` }]);
}

function validatePayload(body = {}, { partial = false } = {}) {
    const errors = {};
    const data = {};

    const readString = (field, max, required = false) => {
        if (body[field] === undefined && partial) return;
        if (typeof body[field] !== "string") {
            errors[field] = required ? `${field} is required.` : `${field} must be a string.`;
            return;
        }
        const value = body[field].trim();
        if (required && !value) errors[field] = `${field} is required.`;
        else if (value.length > max) errors[field] = `${field} must not exceed ${max} characters.`;
        else data[field] = value || (required ? "" : null);
    };

    readString("title", 200, true);
    readString("summary", 500);
    readString("content", 20000, true);
    readString("category", 80);
    readString("audience", 80);

    if (!partial || body.status !== undefined) {
        const status = body.status === undefined ? STATUSES.DRAFT : String(body.status).trim();
        if (!Object.values(STATUSES).includes(status)) {
            errors.status = "Status must be Draft, Published, or Archived.";
        } else {
            data.status = status;
        }
    }

    if (body.publishedAt !== undefined || !partial) {
        try {
            data.publishedAt = normalizeDate(body.publishedAt);
        } catch (error) {
            errors.publishedAt = error.errors?.[0]?.message || "Invalid published date.";
        }
    }

    for (const field of ["isPinned", "isImportant"]) {
        try {
            const value = normalizeBoolean(body[field], field);
            if (value !== undefined) data[field] = value;
        } catch (error) {
            errors[field] = error.errors?.[0]?.message || "Invalid boolean value.";
        }
    }

    if (!partial) {
        if (data.category === undefined || data.category === null || data.category === "") data.category = "General";
        if (data.audience === undefined || data.audience === null || data.audience === "") data.audience = "All Members";
        if (data.isPinned === undefined) data.isPinned = false;
        if (data.isImportant === undefined) data.isImportant = false;
        if (data.status === STATUSES.PUBLISHED && !data.publishedAt) data.publishedAt = new Date();
    }

    if (Object.keys(errors).length) {
        throw httpError(400, "Please correct the validation errors", Object.entries(errors).map(([field, message]) => ({ field, message })));
    }

    return data;
}

function normalizeQuery(query = {}) {
    const limit = Number(query.limit ?? 50);
    const offset = Number(query.offset ?? 0);

    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT ||
        !Number.isInteger(offset) || offset < 0 || offset > 1000000) {
        throw httpError(400, "Invalid pagination parameters");
    }

    const category = query.category === undefined ? null : String(query.category).trim();
    if (category && category.length > 80) {
        throw httpError(400, "Invalid category filter");
    }

    const pinned = query.pinned === undefined ? false : String(query.pinned).toLowerCase() === "true";

    return { limit, offset, category: category || null, pinned };
}

async function listAnnouncements(options) {
    return announcementRepository.listAnnouncements(options);
}

async function getAnnouncement(id, { admin = false } = {}) {
    const announcementId = normalizeId(id);
    const item = await announcementRepository.findAnnouncementById(announcementId);

    if (!item) throw httpError(404, "Announcement not found");
    if (!admin && item.status !== STATUSES.PUBLISHED) {
        throw httpError(404, "Announcement not found");
    }

    return item;
}

async function createAnnouncement(body, authorId) {
    const data = validatePayload(body);
    return announcementRepository.createAnnouncement({
        ...data,
        authorId
    });
}

async function updateAnnouncement(id, body) {
    const announcementId = normalizeId(id);
    const existing = await announcementRepository.findAnnouncementById(announcementId);
    if (!existing) throw httpError(404, "Announcement not found");

    const patch = validatePayload(body, { partial: true });
    const data = {
        title: patch.title ?? existing.title,
        summary: patch.summary !== undefined ? patch.summary : existing.summary,
        content: patch.content ?? existing.content,
        category: patch.category ?? existing.category,
        audience: patch.audience ?? existing.audience,
        status: patch.status ?? existing.status,
        publishedAt: patch.publishedAt !== undefined ? patch.publishedAt : existing.publishedAt,
        isPinned: patch.isPinned !== undefined ? patch.isPinned : Boolean(existing.isPinned),
        isImportant: patch.isImportant !== undefined ? patch.isImportant : Boolean(existing.isImportant)
    };

    if (data.status === STATUSES.PUBLISHED && !data.publishedAt) data.publishedAt = new Date();
    if (data.status !== STATUSES.PUBLISHED) data.publishedAt = null;

    return announcementRepository.updateAnnouncement(announcementId, data);
}

async function publishAnnouncement(id) {
    const announcementId = normalizeId(id);
    const existing = await announcementRepository.findAnnouncementById(announcementId);
    if (!existing) throw httpError(404, "Announcement not found");
    if (existing.status === STATUSES.ARCHIVED) throw httpError(409, "Archived announcements cannot be published.");

    return announcementRepository.updateStatus(announcementId, STATUSES.PUBLISHED, existing.publishedAt || new Date());
}

async function unpublishAnnouncement(id) {
    const announcementId = normalizeId(id);
    const existing = await announcementRepository.findAnnouncementById(announcementId);
    if (!existing) throw httpError(404, "Announcement not found");

    return announcementRepository.updateStatus(announcementId, STATUSES.DRAFT, null);
}

async function archiveAnnouncement(id) {
    const announcementId = normalizeId(id);
    const existing = await announcementRepository.findAnnouncementById(announcementId);
    if (!existing) throw httpError(404, "Announcement not found");

    return announcementRepository.updateStatus(announcementId, STATUSES.ARCHIVED, null);
}

async function removeAnnouncement(id) {
    const announcementId = normalizeId(id);
    const existing = await announcementRepository.findAnnouncementById(announcementId);
    if (!existing) throw httpError(404, "Announcement not found");

    const deleted = await announcementRepository.deleteAnnouncement(announcementId);
    if (!deleted) throw httpError(404, "Announcement not found");
    return true;
}

module.exports = {
    STATUSES,
    MAX_LIMIT,
    normalizeQuery,
    listAnnouncements,
    getAnnouncement,
    createAnnouncement,
    updateAnnouncement,
    publishAnnouncement,
    unpublishAnnouncement,
    archiveAnnouncement,
    removeAnnouncement
};
