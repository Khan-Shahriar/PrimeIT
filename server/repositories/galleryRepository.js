const { pool } = require("../db");

const SELECT_FIELDS = `
    g.id,
    g.title,
    g.description,
    g.image_url AS imageUrl,
    g.thumbnail_url AS thumbnailUrl,
    g.alt_text AS altText,
    g.category,
    g.collection_name AS collection,
    g.status,
    g.is_featured AS isFeatured,
    g.original_filename AS originalFilename,
    g.mime_type AS mimeType,
    g.file_size AS fileSize,
    g.width,
    g.height,
    g.published_at AS publishedAt,
    g.uploaded_at AS uploadedAt,
    g.updated_at AS updatedAt,
    g.uploaded_by AS uploadedBy
`;

async function list({ admin = false } = {}) {
    const where = admin ? "" : "WHERE g.status = 'Published'";
    const [rows] = await pool.query(`SELECT ${SELECT_FIELDS} FROM gallery_media g ${where} ORDER BY g.is_featured DESC, COALESCE(g.published_at, g.uploaded_at) DESC, g.id DESC`);
    return rows;
}

async function findByStoredFilename(filename) {
    const [rows] = await pool.query(`SELECT id, status, stored_filename AS storedFilename FROM gallery_media WHERE stored_filename = ? LIMIT 1`, [filename]);
    return rows[0] || null;
}

async function findById(id) {
    const [rows] = await pool.query(`SELECT ${SELECT_FIELDS}, g.stored_filename AS storedFilename FROM gallery_media g WHERE g.id = ? LIMIT 1`, [id]);
    return rows[0] || null;
}

async function create(data) {
    const [result] = await pool.query(
        `INSERT INTO gallery_media
        (title, description, image_url, thumbnail_url, alt_text, category, collection_name, status, is_featured, original_filename, stored_filename, mime_type, file_size, width, height, published_at, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.title, data.description, data.imageUrl, data.thumbnailUrl, data.altText, data.category, data.collection, data.status, data.isFeatured ? 1 : 0, data.originalFilename, data.storedFilename, data.mimeType, data.fileSize, data.width, data.height, data.status === "Published" ? new Date() : null, data.uploadedBy]
    );
    return findById(result.insertId);
}

async function update(id, data) {
    const sets = [];
    const values = [];

    const fields = {
        title: "title",
        description: "description",
        altText: "alt_text",
        category: "category",
        collection: "collection_name",
        status: "status",
        isFeatured: "is_featured"
    };

    for (const [key, column] of Object.entries(fields)) {
        if (data[key] !== undefined) {
            sets.push(`${column} = ?`);
            values.push(key === "isFeatured" ? (data[key] ? 1 : 0) : data[key]);
        }
    }

    if (data.file) {
        sets.push("image_url = ?", "thumbnail_url = ?", "original_filename = ?", "stored_filename = ?", "mime_type = ?", "file_size = ?", "width = ?", "height = ?");
        values.push(data.file.imageUrl, data.file.thumbnailUrl, data.file.originalFilename, data.file.storedFilename, data.file.mimeType, data.file.fileSize, data.file.width, data.file.height);
    }

    if (data.status === "Published") sets.push("published_at = COALESCE(published_at, NOW())");
    if (data.status && data.status !== "Published") sets.push("published_at = NULL");

    if (!sets.length) return findById(id);

    values.push(id);
    await pool.query(`UPDATE gallery_media SET ${sets.join(", ")} WHERE id = ?`, values);
    return findById(id);
}

async function archive(id) {
    await pool.query("UPDATE gallery_media SET status = 'Archived', is_featured = 0, published_at = NULL WHERE id = ?", [id]);
    return findById(id);
}

module.exports = { list, findById, findByStoredFilename, create, update, archive };
