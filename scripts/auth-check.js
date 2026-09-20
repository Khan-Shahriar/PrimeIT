const baseUrl = process.env.PRIMEIT_BASE_URL || `http://localhost:${process.env.PORT || 8080}`;
const email = process.env.PRIMEIT_TEST_EMAIL;
const password = process.env.PRIMEIT_TEST_PASSWORD;

if (!email || !password) {
    console.error("Set PRIMEIT_TEST_EMAIL and PRIMEIT_TEST_PASSWORD before running the authentication smoke test.");
    process.exit(1);
}

function extractCookie(setCookie) {
    return setCookie?.split(";")[0] || "";
}

async function request(path, options = {}, cookie = "") {
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    if (cookie) headers.set("Cookie", cookie);
    const response = await fetch(baseUrl + path, { ...options, headers });
    let body = {};
    try { body = await response.json(); } catch {}
    return { response, body, cookie: extractCookie(response.headers.get("set-cookie")) };
}

async function main() {
    const login = await request("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    if (!login.response.ok || login.body.success !== true || !login.cookie) throw new Error("Login test failed.");

    const me = await request("/api/v1/auth/me", { method: "GET" }, login.cookie);
    if (!me.response.ok || me.body.success !== true || !me.body.user?.id) throw new Error("/me test failed.");

    const invalid = await request("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: password + "invalid" })
    });
    if (invalid.response.status !== 401) throw new Error("Invalid-password test failed.");

    const logout = await request("/api/v1/auth/logout", { method: "POST" }, login.cookie);
    if (!logout.response.ok || logout.body.success !== true) throw new Error("Logout test failed.");

    const afterLogout = await request("/api/v1/auth/me", { method: "GET" }, login.cookie);
    if (afterLogout.response.status !== 401) throw new Error("Logout invalidation test failed.");

    console.log("Authentication smoke test passed.");
}

main().catch(error => {
    console.error("Authentication smoke test failed:", error.message);
    process.exitCode = 1;
});
