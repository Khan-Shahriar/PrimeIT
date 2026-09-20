function notFoundHandler(req, res) {
    const isApiRequest = req.path === "/api" || req.path.startsWith("/api/");

    if (isApiRequest) {
        return res.status(404).json({
            success: false,
            message: "API endpoint not found",
            errors: []
        });
    }

    return res.status(404).send("Page not found");
}

module.exports = notFoundHandler;
