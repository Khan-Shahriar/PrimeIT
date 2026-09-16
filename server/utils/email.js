const RESEND_API_URL = "https://api.resend.com/emails";

function getRequiredEmailConfiguration() {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    const appBaseUrl = process.env.APP_BASE_URL?.trim();

    if (!apiKey || !from || !appBaseUrl) {
        throw new Error("Password reset email service is not configured.");
    }

    let parsedBaseUrl;
    try {
        parsedBaseUrl = new URL(appBaseUrl);
    } catch {
        throw new Error("APP_BASE_URL must be a valid absolute URL.");
    }

    if (!/^https?:$/.test(parsedBaseUrl.protocol)) {
        throw new Error("APP_BASE_URL must use HTTP or HTTPS.");
    }

    return { apiKey, from, appBaseUrl: parsedBaseUrl.origin };
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function buildPasswordResetUrl(appBaseUrl, token) {
    const url = new URL("/member/reset-password.html", `${appBaseUrl}/`);
    url.searchParams.set("token", token);
    return url.toString();
}

async function sendPasswordResetEmail({ to, fullName, token }) {
    const { apiKey, from, appBaseUrl } = getRequiredEmailConfiguration();
    const resetUrl = buildPasswordResetUrl(appBaseUrl, token);
    const safeName = escapeHtml(fullName || "PrimeIt member");
    const safeResetUrl = escapeHtml(resetUrl);

    const response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({
            from,
            to: [to],
            subject: "Reset your PrimeIt password",
            text: `Hello ${fullName || "PrimeIt member"},\n\nUse this link to reset your PrimeIt password:\n${resetUrl}\n\nThis link expires in 15 minutes and can only be used once. If you did not request this, you can safely ignore this email.`,
            html: `<!doctype html><html><body style="margin:0;padding:32px;background:#f7f9fc;font-family:Arial,sans-serif;color:#151a2d;"><div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7eaf2;border-radius:18px;padding:32px;"><h1 style="margin:0 0 16px;">Reset your PrimeIt password</h1><p>Hello ${safeName},</p><p>We received a request to reset your PrimeIt member account password.</p><p><a href="${safeResetUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;">Reset Password</a></p><p style="color:#667085;font-size:14px;line-height:1.5;">This link expires in 15 minutes and can only be used once. If you did not request this, you can safely ignore this email.</p></div></body></html>`
        })
    });

    if (!response.ok) {
        let details = "Email provider request failed.";
        try {
            const data = await response.json();
            if (typeof data?.message === "string" && data.message.trim()) {
                details = data.message.trim();
            }
        } catch {
            // Keep provider details out of the client response.
        }
        throw new Error(details);
    }

    return true;
}

module.exports = {
    sendPasswordResetEmail
};
