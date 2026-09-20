const COOKIE_NAME = process.env.COOKIE_NAME?.trim() || "primeit_token";

function getAuthCookieOptions(rememberMe = false) {
    const options = {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production",
        sameSite: (process.env.COOKIE_SAME_SITE || "lax").toLowerCase(),
        path: process.env.COOKIE_PATH || "/"
    };
    if (process.env.COOKIE_DOMAIN?.trim()) options.domain = process.env.COOKIE_DOMAIN.trim();
    if (rememberMe) options.maxAge = Number(process.env.COOKIE_MAX_AGE_MS || 30 * 24 * 60 * 60 * 1000);
    return options;
}

function setAuthCookie(res, token, rememberMe = false) { res.cookie(COOKIE_NAME, token, getAuthCookieOptions(rememberMe)); }
function clearAuthCookie(res) {
    const options = getAuthCookieOptions(false);
    delete options.maxAge;
    res.clearCookie(COOKIE_NAME, options);
}

module.exports = { COOKIE_NAME, getAuthCookieOptions, setAuthCookie, clearAuthCookie };