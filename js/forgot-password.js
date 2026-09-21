document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgot-password-form");
  const emailInput = document.getElementById("forgot-email");
  const submitButton = document.getElementById("forgot-password-submit");
  const messageElement = document.getElementById("forgot-password-message");
  if (!form || !emailInput || !submitButton || !messageElement) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    clearMessage();
    if (!email) { showMessage("Please enter your email address.", true); emailInput.focus(); return; }
    if (!emailInput.checkValidity()) { showMessage("Please enter a valid email address.", true); emailInput.focus(); return; }

    setLoading(true);
    try {
      const data = await window.PrimeItApi.post("/auth/forgot-password", { email });
      if (data?.success !== true) throw new Error("Unable to process your request. Please try again.");
      showMessage("If an account exists for that email, password reset instructions have been sent.");
      form.reset();
    } catch (error) {
      showMessage(error?.status === 429 ? "Too many requests. Please try again later." : "Unable to process your request. Please try again.", true);
    } finally { setLoading(false); }
  });

  function setLoading(value) { submitButton.disabled = value; submitButton.setAttribute("aria-busy", String(value)); submitButton.textContent = value ? "Sending..." : "Send Reset Instructions"; }
  function showMessage(message, isError = false) { messageElement.textContent = message; messageElement.classList.toggle("is-error", isError); messageElement.classList.toggle("is-success", !isError); messageElement.hidden = false; }
  function clearMessage() { messageElement.textContent = ""; messageElement.classList.remove("is-error", "is-success"); messageElement.hidden = true; }
});