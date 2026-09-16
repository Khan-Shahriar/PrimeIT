document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("reset-password-form");
    const passwordInput = document.getElementById("reset-password");
    const confirmInput = document.getElementById("reset-password-confirm");
    const submitButton = document.getElementById("reset-password-submit");
    const messageElement = document.getElementById("reset-password-message");
    const toggleButtons = document.querySelectorAll("[data-password-toggle]");

    if (!form || !passwordInput || !confirmInput || !submitButton || !messageElement) {
        return;
    }

    const token = new URLSearchParams(window.location.search).get("token")?.trim() || "";
    const tokenIsValid = /^[a-fA-F0-9]{64}$/.test(token);

    if (!tokenIsValid) {
        showMessage("This password reset link is invalid or expired. Please request a new reset link.", true);
        return;
    }

    submitButton.disabled = false;

    toggleButtons.forEach((button) => {
        const targetId = button.getAttribute("data-password-toggle");
        const targetInput = document.getElementById(targetId);

        if (!targetInput) {
            return;
        }

        button.addEventListener("click", () => {
            const shouldShow = targetInput.type === "password";
            targetInput.type = shouldShow ? "text" : "password";
            button.textContent = shouldShow ? "Hide" : "Show";
            button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
            button.setAttribute("aria-pressed", String(shouldShow));
        });
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMessage();

        const password = passwordInput.value;
        const passwordConfirm = confirmInput.value;

        if (password.length < 8 || password.length > 128) {
            showMessage("Your new password must be 8–128 characters long.", true);
            passwordInput.focus();
            return;
        }

        if (password !== passwordConfirm) {
            showMessage("The passwords do not match.", true);
            confirmInput.focus();
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    token,
                    newPassword: password
                })
            });

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok || data.success !== true) {
                showMessage(
                    response.status === 429
                        ? "Too many requests. Please try again later."
                        : response.status === 400
                            ? "This password reset link is invalid or expired. Please request a new reset link."
                            : "Unable to reset your password. Please try again.",
                    true
                );
                return;
            }

            showMessage("Your password has been reset successfully. You can now sign in with your new password.");
            passwordInput.disabled = true;
            confirmInput.disabled = true;
            submitButton.disabled = true;

            window.history.replaceState({}, document.title, "reset-password.html");
        } catch {
            showMessage("Unable to connect to the server. Please try again.", true);
        } finally {
            if (!form.querySelector("input:disabled")) {
                setLoading(false);
            } else {
                submitButton.setAttribute("aria-busy", "false");
                submitButton.textContent = "Password Reset Complete";
            }
        }
    });

    function setLoading(isLoading) {
        submitButton.disabled = isLoading;
        submitButton.setAttribute("aria-busy", String(isLoading));
        submitButton.textContent = isLoading ? "Resetting..." : "Reset Password";
    }

    function showMessage(message, isError = false) {
        messageElement.textContent = message;
        messageElement.classList.toggle("is-error", isError);
        messageElement.classList.toggle("is-success", !isError);
        messageElement.hidden = false;
    }

    function clearMessage() {
        messageElement.textContent = "";
        messageElement.classList.remove("is-error", "is-success");
        messageElement.hidden = true;
    }
});
