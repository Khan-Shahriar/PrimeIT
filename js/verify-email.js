document.addEventListener("DOMContentLoaded", async () => {
    const message = document.getElementById("verify-email-message");
    const token = new URLSearchParams(window.location.search).get("token")?.trim() || "";

    if (!/^[a-f0-9]{64}$/i.test(token)) {
        show("This email verification link is invalid or expired. Please request a new link.", true);
        return;
    }

    try {
        const response = await fetch("/api/v1/auth/verify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            credentials: "include",
            body: JSON.stringify({ token })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success !== true) {
            show("This email verification link is invalid or expired. Please request a new link.", true);
            return;
        }
        show("Your email has been verified successfully. You can now sign in.");
        window.history.replaceState({}, document.title, "verify-email.html");
    } catch {
        show("Unable to connect to the server. Please try again.", true);
    }

    function show(text, error = false) {
        message.textContent = text;
        message.classList.toggle("is-error", error);
        message.classList.toggle("is-success", !error);
    }
});