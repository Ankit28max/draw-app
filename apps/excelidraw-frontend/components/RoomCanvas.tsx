"use client";

import { WS_URL } from "@/config";
import { useEffect, useRef, useState } from "react";
import { Canvas } from "./Canvas";

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

export function RoomCanvas({roomId}: {roomId: string}) {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [userName, setUserName] = useState<string>("Collaborator");
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        let isUnmounted = false;
        let ws: WebSocket | null = null;
        const currentName = getCollaboratorName();
        setUserName(currentName);

        function connect() {
            if (isUnmounted) return;

            // Use authentic token if user is signed in, otherwise initiate guest session
            const token = (typeof window !== "undefined" && localStorage.getItem("token")) || "";
            const wsEndpoint = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
            ws = new WebSocket(wsEndpoint);

            ws.onopen = () => {
                if (isUnmounted) {
                    ws?.close();
                    return;
                }
                setSocket(ws);
                setIsConnected(true);

                // Join the specified room with display name
                ws?.send(JSON.stringify({
                    type: "join_room",
                    roomId,
                    userName: currentName
                }));

                // Start ping keepalive
                if (pingTimerRef.current) clearInterval(pingTimerRef.current);
                pingTimerRef.current = setInterval(() => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: "ping" }));
                    }
                }, 20000);
            };

            ws.onclose = () => {
                if (isUnmounted) return;
                setIsConnected(false);
                if (pingTimerRef.current) clearInterval(pingTimerRef.current);

                // Auto-reconnect after 1.5s
                if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = setTimeout(() => {
                    connect();
                }, 1500);
            };

            ws.onerror = (err) => {
                console.error("WebSocket encountered an error:", err);
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
            <div className="flex items-center justify-center h-screen bg-[#0c0d11] text-white font-sans">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-zinc-400 text-sm">Connecting to whiteboard server...</p>
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