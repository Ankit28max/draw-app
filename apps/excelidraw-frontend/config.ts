function resolveHttpBackend(): string {
    const raw = process.env.NEXT_PUBLIC_HTTP_BACKEND || "http://localhost:3001";
    let url = raw.trim().replace(/\/$/, "");
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = `https://${url}`;
    }
    return url;
}

function resolveWsUrl(): string {
    const raw = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
    let url = raw.trim().replace(/\/$/, "");
    if (url.startsWith("https://")) {
        url = url.replace(/^https:\/\//, "wss://");
    } else if (url.startsWith("http://")) {
        url = url.replace(/^http:\/\//, "ws://");
    } else if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
        // User entered domain without protocol (e.g. "ws-backend-production-xxxx.up.railway.app")
        url = `wss://${url}`;
    }
    return url;
}

export const HTTP_BACKEND = resolveHttpBackend();
export const WS_URL = resolveWsUrl();
