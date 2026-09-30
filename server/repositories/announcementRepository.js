const { pool } = require("../db");

const BASE_FIELDS = `
    a.id,
    a.title,
    a.summary,
    a.content,
    a.category,
    a.audience,
    a.status,
    a.author_id AS authorId,
    u.full_name AS author,
    a.published_at AS publishedAt,
    a.is_pinned AS isPinned,
    a.is_important AS isImportant,
    a.created_at AS createdAt,
    a.updated_at AS updatedAt
`;

async function listAnnouncements({ admin = false, limit = 50, offset = 0, category = null, pinned = false } = {}, connection = pool) {
    const conditions = [];
    const params = [];

    if (!admin) conditions.push("a.status = 'Published'");
    if (category) {
        conditions.push("a.category = ?");
        params.push(category);
    }
    if (pinned) conditions.push("a.is_pinned = 1");

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await connection.query(
        `SELECT ${BASE_FIELDS}
         FROM announcements a
         LEFT JOIN users u ON u.id = a.author_id
         ${where}
         ORDER BY a.is_pinned DESC,
                  CASE WHEN a.status = 'Published' THEN a.published_at ELSE NULL END DESC,
                  a.updated_at DESC,
                  a.id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    const [[countRow]] = await connection.query(
        `SELECT COUNT(*) AS total
         FROM announcements a
         ${where}`,
        params
    );

    return {
        rows,
        total: Number(countRow.total)
    };
}

async function findAnnouncementById(id, connection = pool) {
    const [rows] = await connection.query(
        `SELECT ${BASE_FIELDS}
         FROM announcements a
         LEFT JOIN users u ON u.id = a.author_id
         WHERE a.id = ?
         LIMIT 1`,
        [id]
    );
    return rows[0] || null;
}

async function createAnnouncement(data, connection = pool) {
    const [result] = await connection.query(
        `INSERT INTO announcements
         (title, summary, content, category, audience, status, author_id, published_at, is_pinned, is_important)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.title,
            data.summary,
            data.content,
            data.category,
            data.audience,
            data.status,
            data.authorId,
            data.publishedAt,
            data.isPinned ? 1 : 0,
            data.isImportant ? 1 : 0
        ]
    );
    return findAnnouncementById(result.insertId, connection);
}

async function updateAnnouncement(id, data, connection = pool) {
    const [result] = await connection.query(
        `UPDATE announcements
         SET title = ?,
             summary = ?,
             content = ?,
             category = ?,
             audience = ?,
             status = ?,
             published_at = ?,
             is_pinned = ?,
             is_important = ?
         WHERE id = ?`,
        [
            data.title,
            data.summary,
            data.content,
            data.category,
            data.audience,
            data.status,
            data.publishedAt,
            data.isPinned ? 1 : 0,
            data.isImportant ? 1 : 0,
            id
        ]
    );

    if (!result.affectedRows) return null;
    return findAnnouncementById(id, connection);
}

async function updateStatus(id, status, publishedAt = null, connection = pool) {
    const [result] = await connection.query(
        `UPDATE announcements
         SET status = ?, published_at = ?
         WHERE id = ?`,
        [status, publishedAt, id]
    );

    if (!result.affectedRows) return null;
    return findAnnouncementById(id, connection);
}

async function deleteAnnouncement(id, connection = pool) {
    const [result] = await connection.query(
        "DELETE FROM announcements WHERE id = ?",
        [id]
    );
    return result.affectedRows > 0;
}

module.exports = {
    listAnnouncements,
    findAnnouncementById,
    createAnnouncement,
    updateAnnouncement,
    updateStatus,
    deleteAnnouncement
};
