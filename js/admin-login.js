document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("form");

    if (!form) {
        console.error("Admin login form not found.");
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const emailInput = form.querySelector(
            'input[type="email"], input[name="email"]'
        );

        const passwordInput = form.querySelector(
            'input[type="password"], input[name="password"]'
        );

        const submitButton = form.querySelector(
            'button[type="submit"]'
        );

        const email = emailInput?.value.trim();
        const password = passwordInput?.value;

        if (!email || !password) {
            alert("Please enter your email and password.");
            return;
        }

        const originalText = submitButton
            ? submitButton.textContent
            : "";

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Signing in...";
        }

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Admin login failed."
                );
            }

            window.location.href =
                "/admin/admin-dashboard.html";

        } catch (error) {
            console.error("Admin login error:", error);
            alert(error.message);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        }
    });
});