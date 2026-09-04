function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateSignup(data) {
    const errors = {};

    const fullName = String(data.fullName || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");

    if (!fullName) {
        errors.fullName = "Full name is required.";
    } else if (fullName.length < 2) {
        errors.fullName = "Full name must be at least 2 characters.";
    } else if (fullName.length > 100) {
        errors.fullName = "Full name must not exceed 100 characters.";
    }

    if (!email) {
        errors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
        errors.email = "Please provide a valid email address.";
    } else if (email.length > 150) {
        errors.email = "Email must not exceed 150 characters.";
    }

    if (!password) {
        errors.password = "Password is required.";
    } else if (password.length < 8) {
        errors.password = "Password must be at least 8 characters.";
    } else if (password.length > 128) {
        errors.password = "Password must not exceed 128 characters.";
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        data: {
            fullName,
            email,
            password
        }
    };
}

function validateLogin(data) {
    const errors = {};

    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");

    if (!email) {
        errors.email = "Email is required.";
    } else if (!isValidEmail(email)) {
        errors.email = "Please provide a valid email address.";
    }

    if (!password) {
        errors.password = "Password is required.";
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        data: {
            email,
            password
        }
    };
}

module.exports = {
    isValidEmail,
    validateSignup,
    validateLogin
};