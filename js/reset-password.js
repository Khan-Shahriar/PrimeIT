document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reset-password-form");
  const passwordInput = document.getElementById("reset-password");
  const confirmInput = document.getElementById("reset-password-confirm");
  const submitButton = document.getElementById("reset-password-submit");
  const messageElement = document.getElementById("reset-password-message");
  const toggleButtons = document.querySelectorAll("[data-password-toggle]");
  if (!form || !passwordInput || !confirmInput || !submitButton || !messageElement) return;

  const token = new URLSearchParams(window.location.search).get("token")?.trim() || "";
  const tokenIsValid = /^[a-fA-F0-9]{64}$/.test(token);
  let resetCompleted = false;
  if (!tokenIsValid) { showMessage("This password reset link is invalid or expired. Please request a new reset link.", true); return; }

  toggleButtons.forEach((button) => {
    const targetInput = document.getElementById(button.getAttribute("data-password-toggle"));
    if (!targetInput) return;
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
    if (password.length < 8 || password.length > 128) { showMessage("Your new password must be 8–128 characters long.", true); passwordInput.focus(); return; }
    if (password !== passwordConfirm) { showMessage("The passwords do not match.", true); confirmInput.focus(); return; }

    setLoading(true);
    try {
      const data = await window.PrimeItApi.post("/auth/reset-password", { token, new_password: password });
      if (data?.success !== true) throw new Error("Unable to reset your password. Please try again.");
      resetCompleted = true;
      showMessage("Your password has been reset successfully. You can now sign in with your new password.");
      passwordInput.disabled = true; confirmInput.disabled = true; submitButton.disabled = true; submitButton.textContent = "Password Reset Complete";
      window.history.replaceState({}, document.title, "reset-password.html");
    } catch (error) {
      showMessage(error?.status === 400 ? "This password reset link is invalid or expired. Please request a new reset link." : error?.status === 429 ? "Too many requests. Please try again later." : (error?.message || "Unable to reset your password. Please try again."), true);
    } finally { if (!resetCompleted) setLoading(false); }
  });

  function setLoading(value) { submitButton.disabled = value; submitButton.setAttribute("aria-busy", String(value)); submitButton.textContent = value ? "Resetting..." : "Reset Password"; }
  function showMessage(message, isError = false) { messageElement.textContent = message; messageElement.classList.toggle("is-error", isError); messageElement.classList.toggle("is-success", !isError); messageElement.hidden = false; }
  function clearMessage() { messageElement.textContent = ""; messageElement.classList.remove("is-error", "is-success"); messageElement.hidden = true; }
});