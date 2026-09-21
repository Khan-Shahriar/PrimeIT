const galleryRepository = require("../repositories/galleryRepository");
const { saveOriginal, deleteFile } = require("./galleryStorageService");
const { validateMetadata, validateImageBuffer } = require("../validators/galleryValidators");

function makeError(message, statusCode, errors) {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (errors) error.errors = errors;
    return error;
}

function normalizeInput(body = {}, partial = false) {
    const { errors, metadata } = validateMetadata(body, { partial });
    if (Object.keys(errors).length) throw makeError("Please correct the gallery validation errors.", 400, errors);

    const result = {};
    const present = new Set(Object.keys(body));
    if (present.has("title")) result.title = metadata.title.value;
    if (present.has("description")) result.description = metadata.description.value;
    if (present.has("altText") || present.has("alt_text")) result.altText = metadata.altText.value;
    if (present.has("category")) result.category = metadata.category.value;
    if (present.has("collection") || present.has("album")) result.collection = metadata.collection.value;
    if (present.has("status")) result.status = metadata.status;
    if (present.has("isFeatured") || present.has("is_featured")) result.isFeatured = metadata.isFeatured;
    return result;
}

async function create({ body, file, userId }) {
    if (!file) throw makeError("An image file is required.", 400);

    const image = validateImageBuffer(file.buffer, file.mimetype);
    if (!image.valid) throw makeError(image.message, 400);

    const metadata = normalizeInput({ ...body, status: "Draft" }, false);
    let stored = null;

    try {
        stored = await saveOriginal(file.buffer, image.format);
        return await galleryRepository.create({
            ...metadata,
            imageUrl: stored.url,
            thumbnailUrl: stored.url,
            originalFilename: String(file.originalname || "").slice(0, 255),
            storedFilename: stored.filename,
            mimeType: image.mimeType,
            fileSize: file.size,
            width: image.width,
            height: image.height,
            uploadedBy: userId
        });
    } catch (error) {
        if (stored) await deleteFile(stored.filename).catch(() => {});
        throw error;
    }
}

async function update({ id, body, file }) {
    const existing = await galleryRepository.findById(id);
    if (!existing) throw makeError("Gallery item not found.", 404);

    const metadata = normalizeInput(body, true);
    let stored = null;

    try {
        let fileData;
        if (file) {
            const image = validateImageBuffer(file.buffer, file.mimetype);
            if (!image.valid) throw makeError(image.message, 400);
            stored = await saveOriginal(file.buffer, image.format);
            fileData = {
                imageUrl: stored.url,
                thumbnailUrl: stored.url,
                originalFilename: String(file.originalname || "").slice(0, 255),
                storedFilename: stored.filename,
                mimeType: image.mimeType,
                fileSize: file.size,
                width: image.width,
                height: image.height
            };
        }

        const result = await galleryRepository.update(id, { ...metadata, file: fileData });
        if (stored && existing.storedFilename) await deleteFile(existing.storedFilename).catch(() => {});
        return result;
    } catch (error) {
        if (stored) await deleteFile(stored.filename).catch(() => {});
        throw error;
    }
}

async function archive(id) {
    const existing = await galleryRepository.findById(id);
    if (!existing) throw makeError("Gallery item not found.", 404);
    return galleryRepository.archive(id);
}

module.exports = { create, update, archive, list: galleryRepository.list, findById: galleryRepository.findById };
