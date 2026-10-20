"use client";

import { WS_URL } from "@/config";
import { useEffect, useRef, useState } from "react";
import { Canvas } from "./Canvas";
import Link from "next/link";
import { ArrowLeft, RefreshCw, WifiOff } from "lucide-react";

function getCollaboratorName(): string {
    if (typeof window === "undefined") return "Collaborator";
    const saved = localStorage.getItem("userName");
    if (saved && saved.trim()) return saved.trim();

    let guest = sessionStorage.getItem("guestName");
    if (!guest) {
        guest = `Collaborator ${Math.floor(100 + Math.random() * 900)}`;
        sessionStorage.setItem("guestName", guest);
    }
    return guest;
}

export function RoomCanvas({ roomId }: { roomId: string }) {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [userName, setUserName] = useState<string>("Collaborator");
    const [connectionAttempts, setConnectionAttempts] = useState(0);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        let isUnmounted = false;
        let ws: WebSocket | null = null;
        const currentName = getCollaboratorName();
        setUserName(currentName);

        function connect() {
            if (isUnmounted) return;

            setConnectionAttempts((prev) => prev + 1);

            // Use authentic token if user is signed in, otherwise initiate guest session
            const token = (typeof window !== "undefined" && localStorage.getItem("token")) || "";
            const wsEndpoint = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
            console.log(`[WebSocket] Connecting to: ${wsEndpoint}`);

            try {
                ws = new WebSocket(wsEndpoint);
            } catch (err) {
                console.error("[WebSocket] Failed to construct WebSocket:", err);
                return;
            }

            ws.onopen = () => {
                if (isUnmounted) {
                    ws?.close();
                    return;
                }
                setSocket(ws);
                setIsConnected(true);
                setConnectionAttempts(0);
                console.log("[WebSocket] Successfully connected!");

                // Join the specified room with display name
                ws?.send(
                    JSON.stringify({
                        type: "join_room",
                        roomId,
                        userName: currentName,
                    })
                );

                // Start ping keepalive
                if (pingTimerRef.current) clearInterval(pingTimerRef.current);
                pingTimerRef.current = setInterval(() => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "ping" }));
                    }
                }, 20000);
            };

            ws.onclose = (event) => {
                if (isUnmounted) return;
                setIsConnected(false);
                if (pingTimerRef.current) clearInterval(pingTimerRef.current);

                console.warn(`[WebSocket] Connection closed (code: ${event.code}). Retrying in 2s...`);

                // Auto-reconnect after 2s
                if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = setTimeout(() => {
                    connect();
                }, 2000);
            };

            ws.onerror = (err) => {
                console.error(`[WebSocket] Error connecting to ${wsEndpoint}:`, err);
                ws?.close();
            };
        }

        connect();

        return () => {
            isUnmounted = true;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (pingTimerRef.current) clearInterval(pingTimerRef.current);
            if (ws) {
                ws.onclose = null;
                ws.onerror = null;
                ws.close();
            }
        };
    }, [roomId]);

    if (!socket || !isConnected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0c0d11] text-white font-sans p-6">
                <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-4">
                    {connectionAttempts > 2 ? (
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <WifiOff className="w-6 h-6" />
                        </div>
                    ) : (
                        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}

                    <div>
                        <h2 className="text-base font-semibold text-white">
                            {connectionAttempts > 2 ? "Unable to Reach Whiteboard Server" : "Connecting to Whiteboard Server..."}
                        </h2>
                        <p className="text-xs text-zinc-400 font-mono mt-1 break-all bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800/80">
                            {WS_URL}
                        </p>
                    </div>

                    {connectionAttempts > 2 && (
                        <div className="text-left text-xs text-zinc-400 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 space-y-1.5 leading-relaxed">
                            <p className="font-semibold text-zinc-300">Connection Checklist:</p>
                            <p>• <strong>Railway Deployed</strong>: Set <code className="text-blue-400">NEXT_PUBLIC_WS_URL</code> in your frontend service variables to your Railway WebSocket URL (e.g. <code className="text-blue-300">wss://ws-backend-production-xxxx.up.railway.app</code>).</p>
                            <p>• <strong>Local Development</strong>: Ensure <code className="text-zinc-300">apps/ws-backend</code> is running on port 8080.</p>
                        </div>
                    )}

                    <div className="flex items-center gap-2 w-full pt-2">
                        <Link
                            href="/"
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Home</span>
                        </Link>
                        <button
                            onClick={() => window.location.reload()}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors cursor-pointer"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Retry</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Canvas roomId={roomId} socket={socket} userName={userName} />
        </div>
    );
}