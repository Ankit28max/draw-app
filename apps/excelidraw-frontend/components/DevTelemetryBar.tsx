"use client";

import { useEffect, useState } from "react";
import { Terminal, Activity, Magnet, Cpu, Layers, Copy, Check } from "lucide-react";
import { Game } from "@/draw/Game";

interface DevTelemetryBarProps {
    game: Game | null;
    shapeCount: number;
    zoomLevel: number;
    onOpenCommandPalette: () => void;
}

export function DevTelemetryBar({
    game,
    shapeCount,
    zoomLevel,
    onOpenCommandPalette
}: DevTelemetryBarProps) {
    const [copied, setCopied] = useState(false);
    const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    useEffect(() => {
        if (!game) return;
        const interval = setInterval(() => {
            const center = game.getViewportCenter();
            setCoords({
                x: Math.round(center.x),
                y: Math.round(center.y),
            });
        }, 150);

        return () => clearInterval(interval);
    }, [game]);

    const handleCopyRoomLink = () => {
        if (typeof window !== "undefined") {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 hidden md:flex items-center gap-2 bg-[#0c0d12]/90 backdrop-blur-md border border-zinc-800/80 rounded-full px-3 py-1 shadow-2xl text-[11px] font-mono text-zinc-400 select-none">
            {/* WS Live Pulse */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>WS: 8080 (12ms)</span>
            </div>

            <div className="h-3.5 w-px bg-zinc-800" />

            {/* Viewport Coordinates */}
            <div className="flex items-center gap-1 px-1">
                <span className="text-zinc-500">POS:</span>
                <span className="text-zinc-200">
                    {coords.x},{coords.y}
                </span>
            </div>

            <div className="h-3.5 w-px bg-zinc-800" />

            {/* Zoom Percentage */}
            <div className="flex items-center gap-1 px-1">
                <span className="text-zinc-500">ZOOM:</span>
                <span className="text-zinc-200">{Math.round(zoomLevel * 100)}%</span>
            </div>

            <div className="h-3.5 w-px bg-zinc-800" />

            {/* Shape Count */}
            <div className="flex items-center gap-1 px-1">
                <Layers className="w-3 h-3 text-blue-400" />
                <span>{shapeCount} nodes</span>
            </div>

            <div className="h-3.5 w-px bg-zinc-800" />

            {/* Magnetic Snap Status */}
            <div className="flex items-center gap-1 px-1 text-cyan-400">
                <Magnet className="w-3 h-3" />
                <span>SNAP: ON</span>
            </div>

            <div className="h-3.5 w-px bg-zinc-800" />

            {/* Trigger Palette */}
            <button
                onClick={onOpenCommandPalette}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-all font-sans font-medium"
                title="Open Dev Tools Palette (Cmd+K)"
            >
                <Terminal className="w-3 h-3 text-blue-400" />
                <span>⌘K Palette</span>
            </button>

            {/* Share Room Button */}
            <button
                onClick={handleCopyRoomLink}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full hover:bg-zinc-800 text-zinc-300 transition-colors"
                title="Copy shareable room link"
            >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Share"}</span>
            </button>
        </div>
    );
}
