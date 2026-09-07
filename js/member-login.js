document.addEventListener("DOMContentLoaded", () => {

    const form = document.querySelector("form[data-demo]");

    if (!form) {
        console.error("❌ Member login form not found.");
        return;
    }

    const emailInput = form.querySelector('input[type="email"]');
    const passwordInput = form.querySelector('input[type="password"]');
    const submitButton = form.querySelector('button[type="submit"]');


    /* =========================================================
       LOGIN
    ========================================================= */

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email = emailInput?.value.trim();
        const password = passwordInput?.value || "";

        if (!email || !password) {
            showMessage("Please enter your email and password.", true);
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Signing In...";
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


            if (!response.ok) {

                showMessage(
                    data.message || "Unable to sign in.",
                    true
                );

                return;
            }


            console.log("✅ Login successful:", data);


            showMessage(
                "Login successful. Redirecting..."
            );


            setTimeout(() => {
                window.location.href = "member-dashboard.html";
            }, 700);


        } catch (error) {

            console.error("❌ Login error:", error);

            showMessage(
                "Unable to connect to the server.",
                true
            );

        } finally {

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Sign In →";
            }
        }

    });


    /* =========================================================
       MESSAGE
    ========================================================= */

    function showMessage(message, isError = false) {

        let messageElement = document.querySelector(".login-message");

        if (!messageElement) {

            messageElement = document.createElement("div");

            messageElement.className = "login-message";

            form.prepend(messageElement);
        }

        messageElement.textContent = message;

        messageElement.style.marginBottom = "15px";
        messageElement.style.padding = "10px 12px";
        messageElement.style.borderRadius = "8px";
        messageElement.style.fontSize = "14px";

        if (isError) {
            messageElement.style.color = "#b91c1c";
            messageElement.style.background = "#fee2e2";
        } else {
            messageElement.style.color = "#166534";
            messageElement.style.background = "#dcfce7";
        }
    }

});