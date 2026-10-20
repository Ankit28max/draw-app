import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

function getBackendUrl(): string {
    const raw = process.env.HTTP_BACKEND || process.env.NEXT_PUBLIC_HTTP_BACKEND || process.env.HTTP_BACKEND_URL;
    if (raw && raw.trim()) {
        let url = raw.trim().replace(/\/$/, "");
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = `https://${url}`;
        }
        return url;
    }
    // Fallback to Railway internal service mesh in production, otherwise localhost
    if (process.env.NODE_ENV === "production") {
        return "http://http-backend.railway.internal:3001";
    }
    return "http://localhost:3001";
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const backendUrl = getBackendUrl();

        const res = await axios.post(`${backendUrl}/signup`, body, {
            headers: { "Content-Type": "application/json" },
            validateStatus: () => true,
            timeout: 10000,
        });

        return NextResponse.json(res.data, { status: res.status });
    } catch (err: unknown) {
        console.error("Auth proxy error (signup):", err);
        return NextResponse.json(
            { message: "Backend authentication service unreachable. Please ensure http-backend is running." },
            { status: 503 }
        );
    }
}
