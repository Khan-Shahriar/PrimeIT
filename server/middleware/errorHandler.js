function normalizeErrors(error) {
    if (Array.isArray(error?.errors)) {
        return error.errors;
    }

    if (error?.type === "entity.parse.failed") {
        return [{ field: "body", message: "Malformed JSON request body" }];
    }

    return [];
}

function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        return next(error);
    }

    const status = Number.isInteger(error?.statusCode)
        ? error.statusCode
        : (Number.isInteger(error?.status) ? error.status : 500);

    const isServerError = status >= 500;

    console.error("API error", {
        method: req.method,
        path: req.originalUrl,
        status,
        code: error?.code,
        message: error?.message
    });

    return res.status(status).json({
        success: false,
        message: isServerError
            ? "Internal server error"
            : (error.message || "Request failed"),
        errors: isServerError ? [] : normalizeErrors(error)
    });
}

module.exports = errorHandler;
