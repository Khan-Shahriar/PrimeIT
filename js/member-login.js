document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("member-login-form");
  const emailInput = document.getElementById("member-email");
  const passwordInput = document.getElementById("member-password");
  const rememberInput = document.getElementById("remember-me");
  const submitButton = document.getElementById("member-login-submit");
  const messageElement = document.getElementById("login-message");
  if (!form || !emailInput || !passwordInput || !submitButton || !messageElement) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const rememberMe = Boolean(rememberInput?.checked);
    clearMessage();

    if (!email || !password) { showMessage("Please enter your email and password.", true); return; }
    if (!emailInput.checkValidity()) { showMessage("Please enter a valid email address.", true); emailInput.focus(); return; }

    setLoading(true);
    try {
      const data = await window.PrimeItApi.post("/auth/login", { email, password, rememberMe });
      if (data?.success !== true) { showMessage("Unable to complete sign in. Please try again.", true); return; }
      showMessage("Login successful. Redirecting...");
      window.setTimeout(() => { window.location.href = "member-dashboard.html"; }, 500);
    } catch (error) {
      const message = error?.status === 401 ? "Invalid email or password."
        : error?.status === 403 ? "Your account cannot sign in right now."
        : error?.status === 429 ? "Too many login attempts. Please try again later."
        : error?.message || "Unable to sign in. Please try again.";
      showMessage(message, true);
    } finally { setLoading(false); }
  });

  function setLoading(isLoading) {
    submitButton.disabled = isLoading;
    submitButton.setAttribute("aria-busy", String(isLoading));
    submitButton.textContent = isLoading ? "Signing In..." : "Sign In →";
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