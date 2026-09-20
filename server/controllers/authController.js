const authService = require("../services/authService");
const { setAuthCookie, clearAuthCookie } = require("../utils/authCookie");

async function signup(req, res) {
    const { full_name, email, password, phone, department, position } = req.body;
    const result = await authService.createAccount({ fullName: full_name.trim(), email, password, phone, department, position });
    return res.status(201).json({ success: true, message: "Account created successfully. Please verify your email.", user: result });
}

async function login(req, res) {
    const result = await authService.authenticate(req.body.email, req.body.password);
    setAuthCookie(res, result.token, req.body.rememberMe === true);
    return res.json({ success: true, message: "Login successful", user: result.user });
}

async function me(req, res) { return res.json({ success: true, user: await authService.getCurrentUser(req.user.id) }); }
async function logout(req, res) { clearAuthCookie(res); return res.json({ success: true, message: "Logout successful" }); }
async function verifyEmail(req, res) { await authService.verifyEmail(req.body.token.trim()); return res.json({ success: true, message: "Email verified successfully." }); }
async function forgotPassword(req, res) { await authService.requestPasswordReset(req.body.email); return res.json({ success: true, message: authService.GENERIC_RESET_MESSAGE }); }
async function resetPassword(req, res) { await authService.resetPassword(req.body.token.trim(), req.body.new_password); return res.json({ success: true, message: "Password reset successfully. Please sign in with your new password." }); }

module.exports = { signup, login, me, logout, verifyEmail, forgotPassword, resetPassword };