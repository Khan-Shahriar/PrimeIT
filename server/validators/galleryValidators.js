const ALLOWED_TYPES = Object.freeze({
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp"
});

const ALLOWED_STATUS = new Set(["Draft", "Published", "Archived"]);
const MAX_TITLE = 160;
const MAX_DESCRIPTION = 2000;
const MAX_ALT = 250;
const MAX_CATEGORY = 80;
const MAX_COLLECTION = 120;
const MAX_WIDTH = 12000;
const MAX_HEIGHT = 12000;
const MAX_PIXELS = 50_000_000;

function text(value, max, field, required = false) {
    const valueText = value == null ? "" : String(value).trim();
    if (required && !valueText) return { error: `${field} is required.` };
    if (valueText.length > max) return { error: `${field} must not exceed ${max} characters.` };
    return { value: valueText || null };
}

function normalizeMetadata(body = {}) {
    return {
        title: text(body.title, MAX_TITLE, "Title", true),
        description: text(body.description, MAX_DESCRIPTION, "Description"),
        altText: text(body.altText ?? body.alt_text, MAX_ALT, "Alt text", true),
        category: text(body.category, MAX_CATEGORY, "Category"),
        collection: text(body.collection ?? body.album, MAX_COLLECTION, "Collection"),
        status: body.status == null ? "Draft" : String(body.status).trim(),
        isFeatured: body.isFeatured === true || body.isFeatured === "true" || body.is_featured === true || body.is_featured === "1"
    };
}

function validateMetadata(body, { partial = false } = {}) {
    const metadata = normalizeMetadata(body);
    const errors = {};
    for (const [key, result] of Object.entries(metadata)) {
        if (result && typeof result === "object" && result.error) errors[key] = result.error;
    }

    if (!ALLOWED_STATUS.has(metadata.status)) errors.status = "Invalid gallery status.";
    if (partial && body.status === undefined) delete errors.status;

    if (partial) {
        const present = new Set(Object.keys(body));
        for (const key of ["title", "description", "altText", "category", "collection"]) {
            if (!present.has(key) && !(key === "altText" && present.has("alt_text")) && !(key === "collection" && present.has("album"))) {
                delete errors[key];
            }
        }
    }

    return { errors, metadata };
}

function validateImageBuffer(buffer, suppliedMime = "") {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
        return { valid: false, message: "The uploaded file is not a valid image." };
    }

    let detected = null;
    let width = 0;
    let height = 0;

    if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
        detected = "png";
        width = buffer.readUInt32BE(16);
        height = buffer.readUInt32BE(20);
    } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        detected = "jpeg";
        const result = readJpegDimensions(buffer);
        if (!result) return { valid: false, message: "The JPEG image could not be validated." };
        width = result.width;
        height = result.height;
    } else if (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
        detected = "webp";
        const result = readWebpDimensions(buffer);
        if (!result) return { valid: false, message: "The WebP image could not be validated." };
        width = result.width;
        height = result.height;
    }

    if (!detected || !ALLOWED_TYPES[detected]) {
        return { valid: false, message: "Only JPEG, PNG, and WebP images are allowed." };
    }

    const expectedMime = ALLOWED_TYPES[detected];
    if (suppliedMime && suppliedMime !== expectedMime) {
        return { valid: false, message: "The uploaded file type does not match its actual image content." };
    }

    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
        return { valid: false, message: "The image dimensions could not be validated." };
    }

    if (width > MAX_WIDTH || height > MAX_HEIGHT || width * height > MAX_PIXELS) {
        return { valid: false, message: "The image dimensions are too large." };
    }

    return { valid: true, format: detected, mimeType: expectedMime, width, height };
}

function readJpegDimensions(buffer) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) {
            offset += 1;
            continue;
        }
        while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
        const marker = buffer[offset++];
        if (marker === 0xd8 || marker === 0xd9 || marker === 0x01) continue;
        if (offset + 2 > buffer.length) return null;
        const length = buffer.readUInt16BE(offset);
        if (length < 2 || offset + length > buffer.length) return null;

        const isSof = (marker >= 0xc0 && marker <= 0xc3) ||
            (marker >= 0xc5 && marker <= 0xc7) ||
            (marker >= 0xc9 && marker <= 0xcb) ||
            (marker >= 0xcd && marker <= 0xcf);

        if (isSof && length >= 7) {
            return {
                height: buffer.readUInt16BE(offset + 3),
                width: buffer.readUInt16BE(offset + 5)
            };
        }
        offset += length;
    }
    return null;
}

function readWebpDimensions(buffer) {
    const chunk = buffer.subarray(12, 16).toString("ascii");
    if (chunk === "VP8X" && buffer.length >= 30) {
        return {
            width: 1 + buffer[24] + (buffer[25] << 8) + (buffer[26] << 16),
            height: 1 + buffer[27] + (buffer[28] << 8) + (buffer[29] << 16)
        };
    }
    if (chunk === "VP8 " && buffer.length >= 30) {
        const start = 20;
        if (buffer[start + 3] !== 0x9d || buffer[start + 4] !== 0x01 || buffer[start + 5] !== 0x2a) return null;
        return { width: buffer.readUInt16LE(start + 6), height: buffer.readUInt16LE(start + 8) };
    }
    if (chunk === "VP8L" && buffer.length >= 25) {
        const b0 = buffer[21], b1 = buffer[22], b2 = buffer[23], b3 = buffer[24];
        return {
            width: 1 + (((b2 & 0x3f) << 8) | b1),
            height: 1 + (((b3 & 0xf0) << 6) | b2)
        };
    }
    return null;
}

module.exports = {
    ALLOWED_TYPES,
    ALLOWED_STATUS,
    MAX_WIDTH,
    MAX_HEIGHT,
    MAX_PIXELS,
    normalizeMetadata,
    validateMetadata,
    validateImageBuffer
};
