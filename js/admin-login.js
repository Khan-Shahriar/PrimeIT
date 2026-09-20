document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("admin-login-form");
    const emailInput = document.getElementById("admin-email");
    const passwordInput = document.getElementById("admin-password");
    const passwordToggle = document.getElementById("admin-password-toggle");
    const submitButton = document.getElementById("admin-login-submit");
    const messageElement = document.getElementById("admin-login-message");
    const emailError = document.getElementById("admin-email-error");
    const passwordError = document.getElementById("admin-password-error");
    const forgotPassword = document.getElementById("admin-forgot-password");

    if (
        !form ||
        !emailInput ||
        !passwordInput ||
        !passwordToggle ||
        !submitButton ||
        !messageElement ||
        !emailError ||
        !passwordError
    ) {
        return;
    }

    passwordToggle.addEventListener("click", () => {
        const shouldShow = passwordInput.type === "password";

        passwordInput.type = shouldShow ? "text" : "password";
        passwordToggle.textContent = shouldShow ? "Hide" : "Show";
        passwordToggle.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
        passwordToggle.setAttribute("aria-pressed", String(shouldShow));
        passwordInput.focus();
    });

    emailInput.addEventListener("input", () => clearFieldError(emailInput, emailError));
    passwordInput.addEventListener("input", () => clearFieldError(passwordInput, passwordError));

    forgotPassword?.addEventListener("click", (event) => {
        event.preventDefault();
        showMessage(
            "Password recovery will be available when the PrimeIt authentication service is connected.",
            false
        );
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearMessage();
        clearValidationErrors();

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        emailInput.value = email;

        const isValid = validateCredentials(email, password);

        if (!isValid) {
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/v1/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    email,
                    password
                })
            });

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                handleAuthenticationError(response.status, data);
                return;
            }

            if (data.success !== true) {
                showMessage("Unable to complete sign in. Please try again.", true);
                return;
            }

            showMessage("Sign in successful. Redirecting...", false);

            window.setTimeout(() => {
                window.location.href = "admin-dashboard.html";
            }, 300);
        } catch {
            showMessage(
                "Unable to connect to the authentication service. Please try again.",
                true
            );
        } finally {
            setLoading(false);
        }
    });

    function validateCredentials(email, password) {
        let valid = true;

        if (!email) {
            setFieldError(emailInput, emailError, "Enter your email address.");
            valid = false;
        } else if (!emailInput.checkValidity()) {
            setFieldError(emailInput, emailError, "Enter a valid email address.");
            valid = false;
        }

        if (!password) {
            setFieldError(passwordInput, passwordError, "Enter your password.");
            valid = false;
        }

        if (!valid) {
            showMessage("Please correct the highlighted fields.", true);

            if (emailError.textContent) {
                emailInput.focus();
            } else {
                passwordInput.focus();
            }
        }

        return valid;
    }

    function setFieldError(input, errorElement, message) {
        input.setAttribute("aria-invalid", "true");
        errorElement.textContent = message;
    }

    function clearFieldError(input, errorElement) {
        input.removeAttribute("aria-invalid");
        errorElement.textContent = "";
    }

    function clearValidationErrors() {
        clearFieldError(emailInput, emailError);
        clearFieldError(passwordInput, passwordError);
    }

    function setLoading(isLoading) {
        submitButton.disabled = isLoading;
        submitButton.setAttribute("aria-busy", String(isLoading));

        const label = submitButton.querySelector(".submit-label");

        if (label) {
            label.textContent = isLoading ? "Signing In..." : "Sign In →";
        }
    }

    function handleAuthenticationError(status, data) {
        if (status === 401) {
            showMessage("Invalid email or password.", true);
            return;
        }

        if (status === 403) {
            showMessage(
                "This account is not authorized to access the Admin Panel.",
                true
            );
            return;
        }

        if (status === 429) {
            showMessage(
                "Too many login attempts. Please try again later.",
                true
            );
            return;
        }

        if (status >= 500) {
            showMessage(
                "The authentication service is temporarily unavailable. Please try again later.",
                true
            );
            return;
        }

        showMessage("Unable to sign in. Please try again.", true);
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
