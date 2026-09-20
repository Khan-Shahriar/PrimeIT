const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validEmail(value) { return typeof value === "string" && value.trim().length <= 254 && EMAIL_PATTERN.test(value.trim()); }
function validPassword(value) { return typeof value === "string" && value.length >= 8 && value.length <= 128; }
function login(body = {}) {
    const errors = {};
    if (!validEmail(body.email)) errors.email = "Please provide a valid email address.";
    if (typeof body.password !== "string" || !body.password) errors.password = "Password is required.";
    return errors;
}
function signup(body = {}) {
    const errors = login(body);
    const name = typeof body.full_name === "string" ? body.full_name.trim() : "";
    if (name.length < 2 || name.length > 100) errors.full_name = "Full name must be between 2 and 100 characters.";
    if (!validPassword(body.password)) errors.password = "Password must be between 8 and 128 characters.";
    return errors;
}
function forgotPassword(body = {}) { return validEmail(body.email) ? {} : { email: "Please provide a valid email address." }; }
function resetPassword(body = {}) {
    const errors = {};
    if (typeof body.token !== "string" || !/^[a-f0-9]{64}$/i.test(body.token.trim())) errors.token = "Invalid reset token.";
    if (!validPassword(body.new_password)) errors.new_password = "Password must be between 8 and 128 characters.";
    if (body.confirm_password !== undefined && body.confirm_password !== body.new_password) errors.confirm_password = "Passwords do not match.";
    return errors;
}
function verifyEmail(body = {}) { return typeof body.token === "string" && /^[a-f0-9]{64}$/i.test(body.token.trim()) ? {} : { token: "Invalid verification token." }; }
module.exports = { login, signup, forgotPassword, resetPassword, verifyEmail };