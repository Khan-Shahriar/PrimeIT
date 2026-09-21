document.addEventListener("DOMContentLoaded", async () => {
  const message = document.getElementById("verify-email-message");
  const token = new URLSearchParams(window.location.search).get("token")?.trim() || "";
  if (!/^[a-f0-9]{64}$/i.test(token)) { show("This email verification link is invalid or expired. Please request a new link.", true); return; }
  try {
    const data = await window.PrimeItApi.post("/auth/verify-email", { token });
    if (data?.success !== true) throw new Error("Verification failed.");
    show("Your email has been verified successfully. You can now sign in.");
    window.history.replaceState({}, document.title, "verify-email.html");
  } catch { show("This email verification link is invalid or expired. Please request a new link.", true); }
  function show(text, error = false) { message.textContent = text; message.classList.toggle("is-error", error); message.classList.toggle("is-success", !error); }
});