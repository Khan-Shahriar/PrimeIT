const COOKIE_NAME = "primeit_token";

const REMEMBER_ME_DAYS = 30;
const SESSION_COOKIE_MAX_AGE = undefined;

function getAuthCookieOptions(rememberMe = false) {
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    };

    if (rememberMe) {
        options.maxAge = REMEMBER_ME_DAYS * 24 * 60 * 60 * 1000;
    }

    return options;
}

module.exports = {
    COOKIE_NAME,
    REMEMBER_ME_DAYS,
    SESSION_COOKIE_MAX_AGE,
    getAuthCookieOptions
};
