const baseUrl = process.env.PRIMEIT_BASE_URL || `http://localhost:${process.env.PORT || 8080}`;

async function main() {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const body = await response.json();

    if (!response.ok || body.success !== true || body.data?.status !== "ok") {
        console.error("Health check failed:", JSON.stringify(body));
        process.exitCode = 1;
        return;
    }

    console.log("PrimeIt health check passed:", JSON.stringify(body));
}

main().catch((error) => {
    console.error("Health check error:", error.message);
    process.exitCode = 1;
});
