(() => {
  "use strict";

  const path = window.location.pathname;
  const file = path.split("/").pop().toLowerCase();
  const publicAuthPages = new Set(["member-login.html", "forgot-password.html", "reset-password.html", "verify-email.html", "admin-login.html"]);

  if (publicAuthPages.has(file)) return;

  const isMemberArea = /\/member\//i.test(path);
  const isAdminArea = /\/admin\//i.test(path);
  if (!isMemberArea && !isAdminArea) return;

  const loginPath = () => isAdminArea ? "/admin/admin-login.html" : "/member/member-login.html";

  async function getCurrentUser() {
    if (!window.PrimeItApi) throw new Error("API_CLIENT_UNAVAILABLE");
    return window.PrimeItApi.getCurrentUser();
  }

  function renderUser(user) {
    const safeUser = user && typeof user === "object" ? user : {};
    const name = safeUser.full_name || safeUser.fullName || safeUser.displayName || "Member";
    const role = safeUser.role || "Account";
    document.querySelectorAll("[data-auth-name], [data-admin-name]").forEach(el => { el.textContent = name; });
    document.querySelectorAll("[data-auth-email]").forEach(el => { el.textContent = safeUser.email || ""; });
    document.querySelectorAll("[data-auth-role], [data-admin-role]").forEach(el => { el.textContent = role; });
    document.querySelectorAll("[data-auth-avatar], [data-admin-initials]").forEach(el => {
      const initials = String(name).trim().split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
      el.textContent = initials || "M";
    });
  }

  async function logout() {
    try {
      await window.PrimeItApi.logout();
    } finally {
      window.location.href = loginPath();
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const user = await getCurrentUser();
      renderUser(user);
      document.querySelectorAll("[data-action=\"logout\"], [data-logout]").forEach(control => {
        control.addEventListener("click", event => {
          event.preventDefault();
          logout();
        });
      });
    } catch (error) {
      if (error?.status === 403) {
        document.body.dataset.authState = "forbidden";
        return;
      }
      window.location.replace(loginPath());
    }
  });

  window.PrimeItAuth = Object.freeze({ getCurrentUser, logout });
})();