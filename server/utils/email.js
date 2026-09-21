const RESEND_API_URL = "https://api.resend.com/emails";

function getEmailConfiguration() {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    const appBaseUrl = process.env.APP_BASE_URL?.trim();
    if (!apiKey || !from || !appBaseUrl) throw new Error("Email service is not configured.");
    const base = new URL(appBaseUrl);
    if (!["http:", "https:"].includes(base.protocol)) throw new Error("APP_BASE_URL must use HTTP or HTTPS.");
    return { apiKey, from, appBaseUrl: base.origin };
}

function escapeHtml(value) { return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll("\"","&quot;").replaceAll("'","&#039;"); }
function buildUrl(path, appBaseUrl, token) { const url = new URL(path, appBaseUrl + "/"); url.searchParams.set("token", token); return url.toString(); }

async function sendEmail({ to, subject, text, html }) {
    const { apiKey, from } = getEmailConfiguration();
    const response = await fetch(RESEND_API_URL, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ from, to: [to], subject, text, html }) });
    if (!response.ok) throw new Error("Email provider request failed.");
}

async function sendPasswordResetEmail({ to, fullName, token }) {
    const { appBaseUrl } = getEmailConfiguration();
    const url = buildUrl("/member/reset-password.html", appBaseUrl, token);
    const name = escapeHtml(fullName || "PrimeIt member");
    const safeUrl = escapeHtml(url);
    return sendEmail({ to, subject: "Reset your PrimeIt password", text: `Hello ${fullName || "PrimeIt member"},\n\nReset your PrimeIt password here:\n${url}\n\nThis link expires in 15 minutes and can only be used once.`, html: `<p>Hello ${name},</p><p>Reset your PrimeIt password:</p><p><a href="${safeUrl}">Reset Password</a></p><p>This link expires in 15 minutes and can only be used once.</p>` });
}

async function sendEmailVerificationEmail({ to, fullName, token }) {
    const { appBaseUrl } = getEmailConfiguration();
    const url = buildUrl("/member/verify-email.html", appBaseUrl, token);
    const name = escapeHtml(fullName || "PrimeIt member");
    const safeUrl = escapeHtml(url);
    return sendEmail({ to, subject: "Verify your PrimeIt email", text: `Hello ${fullName || "PrimeIt member"},\n\nVerify your PrimeIt email here:\n${url}\n\nThis link expires in 30 minutes and can only be used once.`, html: `<p>Hello ${name},</p><p>Verify your PrimeIt email address:</p><p><a href="${safeUrl}">Verify Email</a></p><p>This link expires in 30 minutes and can only be used once.</p>` });
}

module.exports = { sendPasswordResetEmail, sendEmailVerificationEmail };