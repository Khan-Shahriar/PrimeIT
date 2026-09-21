const galleryRepository = require("../repositories/galleryRepository");
const { saveOriginal, deleteFile } = require("./galleryStorageService");
const { validateMetadata, validateImageBuffer } = require("../validators/galleryValidators");

function normalizeInput(body, partial = false) {
    const { errors, metadata } = validateMetadata(body, { partial });
    if (Object.keys(errors).length) {
        const error = new Error("Please correct the gallery validation errors.");
        error.statusCode = 400;
        error.errors = errors;
        throw error;
    }
    return {
        title: metadata.title?.value ?? null,
        description: metadata.description?.value ?? null,
        altText: metadata.altText?.value ?? null,
        category: metadata.category?.value ?? null,
        collection: metadata.collection?.value ?? null,
        status: metadata.status,
        isFeatured: metadata.isFeatured
    };
}

async function create({ body, file, userId }) {
    if (!file) {
        const error = new Error("An image file is required.");
        error.statusCode = 400;
        throw error;
    }

    const image = validateImageBuffer(file.buffer, file.mimetype);
    if (!image.valid) {
        const error = new Error(image.message);
        error.statusCode = 400;
        throw error;
    }

    const metadata = normalizeInput(body, false);
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
    if (!existing) {
        const error = new Error("Gallery item not found.");
        error.statusCode = 404;
        throw error;
    }

    const metadata = normalizeInput(body, true);
    let stored = null;

    try {
        let result = existing;
        if (file) {
            const image = validateImageBuffer(file.buffer, file.mimetype);
            if (!image.valid) {
                const error = new Error(image.message);
                error.statusCode = 400;
                throw error;
            }
            stored = await saveOriginal(file.buffer, image.format);
            result = await galleryRepository.replaceFile(id, {
                imageUrl: stored.url,
                thumbnailUrl: stored.url,
                originalFilename: String(file.originalname || "").slice(0, 255),
                storedFilename: stored.filename,
                mimeType: image.mimeType,
                fileSize: file.size,
                width: image.width,
                height: image.height
            });
        }

        result = await galleryRepository.update(id, metadata);
        if (stored && existing.storedFilename) await deleteFile(existing.storedFilename).catch(() => {});
        return result;
    } catch (error) {
        if (stored) await deleteFile(stored.filename).catch(() => {});
        throw error;
    }
}

async function archive(id) {
    const existing = await galleryRepository.findById(id);
    if (!existing) {
        const error = new Error("Gallery item not found.");
        error.statusCode = 404;
        throw error;
    }
    return galleryRepository.archive(id);
}

async function remove(id) {
    const existing = await galleryRepository.findById(id);
    if (!existing) {
        const error = new Error("Gallery item not found.");
        error.statusCode = 404;
        throw error;
    }
    await galleryRepository.archive(id);
    if (existing.storedFilename) await deleteFile(existing.storedFilename).catch(() => {});
    return true;
}

module.exports = { create, update, archive, remove, list: galleryRepository.list, findById: galleryRepository.findById };
