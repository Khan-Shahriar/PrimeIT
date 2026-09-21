(() => {
    "use strict";

    const path = window.location.pathname;
    const file = path.split("/").pop().toLowerCase();
    const publicAuthPages = new Set(["member-login.html", "forgot-password.html", "reset-password.html", "verify-email.html", "admin-login.html"]);

    if (publicAuthPages.has(file)) return;

    const isMemberArea = /\/member\//i.test(path);
    const isAdminArea = /\/admin\//i.test(path);
    if (!isMemberArea && !isAdminArea) return;

    async function getCurrentUser() {
        const response = await fetch("/api/v1/auth/me", {
            method: "GET",
            headers: { Accept: "application/json" },
            credentials: "include"
        });
        if (!response.ok) throw new Error("AUTH_REQUIRED");
        const data = await response.json();
        if (data.success !== true || !data.user) throw new Error("AUTH_REQUIRED");
        return data.user;
    }

    function loginPath() {
        return isAdminArea ? "/admin/admin-login.html" : "/member/member-login.html";
    }

    function renderUser(user) {
        document.querySelectorAll("[data-auth-name], [data-admin-name]").forEach(el => { el.textContent = user.full_name || "Member"; });
        document.querySelectorAll("[data-auth-email]").forEach(el => { el.textContent = user.email || ""; });
        document.querySelectorAll("[data-auth-role], [data-admin-role]").forEach(el => { el.textContent = user.role || "Account"; });
        document.querySelectorAll("[data-auth-avatar], [data-admin-initials]").forEach(el => {
            const initials = String(user.full_name || "Member").trim().split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
            el.textContent = initials || "M";
        });
    }

    async function logout() {
        try {
            await fetch("/api/v1/auth/logout", {
                method: "POST",
                headers: { Accept: "application/json" },
                credentials: "include"
            });
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
        } catch {
            window.location.replace(loginPath());
        }
    });

    window.PrimeItAuth = { getCurrentUser, logout };
})();