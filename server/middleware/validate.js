function validate({ body, query, params } = {}) {
    return (req, res, next) => {
        const errors = [];

        if (typeof body === "function") {
            const result = body(req.body);
            if (result && result !== true) {
                errors.push(...(Array.isArray(result) ? result : [result]));
            }
        }

        if (typeof query === "function") {
            const result = query(req.query);
            if (result && result !== true) {
                errors.push(...(Array.isArray(result) ? result : [result]));
            }
        }

        if (typeof params === "function") {
            const result = params(req.params);
            if (result && result !== true) {
                errors.push(...(Array.isArray(result) ? result : [result]));
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Please correct the validation errors",
                errors
            });
        }

        return next();
    };
}

module.exports = validate;
