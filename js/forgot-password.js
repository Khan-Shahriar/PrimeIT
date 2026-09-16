document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("forgot-password-form");
    const emailInput = document.getElementById("forgot-email");
    const submitButton = document.getElementById("forgot-password-submit");
    const messageElement = document.getElementById("forgot-password-message");

    if (!form || !emailInput || !submitButton || !messageElement) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = emailInput.value.trim().toLowerCase();
        clearMessage();

        if (!email) {
            showMessage("Please enter your email address.", true);
            emailInput.focus();
            return;
        }

        if (!emailInput.checkValidity()) {
            showMessage("Please enter a valid email address.", true);
            emailInput.focus();
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ email })
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
                        : "Unable to process your request. Please try again.",
                    true
                );
                return;
            }

            showMessage("If an account exists for that email, password reset instructions have been sent.");
            form.reset();
        } catch {
            showMessage("Unable to connect to the server. Please try again.", true);
        } finally {
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        submitButton.disabled = isLoading;
        submitButton.setAttribute("aria-busy", String(isLoading));
        submitButton.textContent = isLoading ? "Sending..." : "Send Reset Instructions";
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
