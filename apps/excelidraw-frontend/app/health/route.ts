export async function GET() {
    return Response.json({
        status: "healthy",
        service: "excelidraw-frontend",
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
    });
}
