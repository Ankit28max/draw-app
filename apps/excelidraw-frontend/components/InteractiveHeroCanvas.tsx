"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MousePointer2, Sparkles, Layers, Cpu } from "lucide-react";

export function InteractiveHeroCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cursor1, setCursor1] = useState({ x: 180, y: 120 });
    const [cursor2, setCursor2] = useState({ x: 420, y: 240 });
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        let angle = 0;
        const interval = setInterval(() => {
            angle += 0.03;
            // Smooth natural cursor roaming movement
            setCursor1({
                x: 240 + Math.cos(angle * 1.2) * 90 + Math.sin(angle * 0.5) * 40,
                y: 130 + Math.sin(angle * 1.5) * 50,
            });
            setCursor2({
                x: 520 + Math.sin(angle * 0.9) * 110,
                y: 220 + Math.cos(angle * 1.1) * 60,
            });
        }, 30);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animId: number;

        const drawMockDiagram = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw subtle dot grid
            ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
            for (let x = 20; x < canvas.width; x += 30) {
                for (let y = 20; y < canvas.height; y += 30) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Draw Node: Client
            drawNode(ctx, 80, 100, 140, 70, "Frontend Client", "Next.js 15 App", "#3b82f6");

            // Draw Node: API Gateway
            drawNode(ctx, 300, 100, 150, 70, "API Gateway", "WebSocket & HTTP", "#8b5cf6");

            // Draw Node: Worker Service
            drawNode(ctx, 530, 70, 150, 65, "Sync Engine", "Pub/Sub Broadcast", "#10b981");

            // Draw Node: PostgreSQL
            drawNode(ctx, 530, 180, 150, 65, "PostgreSQL", "Prisma Persistence", "#f59e0b");

            // Connecting Arrows with subtle glow
            drawSmoothArrow(ctx, 220, 135, 300, 135, "#3b82f6");
            drawSmoothArrow(ctx, 450, 125, 530, 100, "#8b5cf6");
            drawSmoothArrow(ctx, 450, 145, 530, 210, "#f59e0b");

            animId = requestAnimationFrame(drawMockDiagram);
        };

        const drawNode = (
            c: CanvasRenderingContext2D,
            x: number,
            y: number,
            w: number,
            h: number,
            title: string,
            subtitle: string,
            color: string
        ) => {
            c.save();
            // Glass background
            c.fillStyle = "rgba(24, 24, 27, 0.85)";
            c.strokeStyle = color;
            c.lineWidth = 1.5;
            if (typeof c.roundRect === "function") {
                c.beginPath();
                c.roundRect(x, y, w, h, 12);
                c.fill();
                c.stroke();
            } else {
                c.fillRect(x, y, w, h);
                c.strokeRect(x, y, w, h);
            }

            // Header dot
            c.fillStyle = color;
            c.beginPath();
            c.arc(x + 16, y + 22, 4, 0, Math.PI * 2);
            c.fill();

            // Text
            c.fillStyle = "#ffffff";
            c.font = "bold 13px -apple-system, BlinkMacSystemFont, sans-serif";
            c.fillText(title, x + 28, y + 26);

            c.fillStyle = "rgba(161, 161, 170, 0.9)";
            c.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
            c.fillText(subtitle, x + 28, y + 46);
            c.restore();
        };

        const drawSmoothArrow = (
            c: CanvasRenderingContext2D,
            fromX: number,
            fromY: number,
            toX: number,
            toY: number,
            color: string
        ) => {
            c.save();
            c.strokeStyle = color;
            c.lineWidth = 2;
            c.setLineDash([4, 4]);
            c.beginPath();
            c.moveTo(fromX, fromY);
            c.bezierCurveTo(fromX + (toX - fromX) / 2, fromY, fromX + (toX - fromX) / 2, toY, toX, toY);
            c.stroke();
            c.restore();
        };

        drawMockDiagram();

        return () => cancelAnimationFrame(animId);
    }, []);

    return (
        <div 
            className="relative w-full max-w-4xl mx-auto rounded-3xl p-1 bg-gradient-to-b from-blue-500/30 via-purple-500/20 to-transparent shadow-2xl overflow-hidden group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative rounded-[22px] bg-[#0c0d12]/95 border border-white/10 backdrop-blur-2xl p-4 sm:p-6 overflow-hidden">
                {/* Top Window Chrome */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500/80" />
                        <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <span className="w-3 h-3 rounded-full bg-green-500/80" />
                        <span className="text-xs font-mono text-zinc-400 ml-2 hidden sm:inline">
                            room-architecture-v2 • 2 live collaborators
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            WebSocket Connected
                        </span>
                    </div>
                </div>

                {/* Canvas Canvas Simulation */}
                <div className="relative w-full h-[280px] sm:h-[340px] bg-[#09090d] rounded-xl overflow-hidden border border-zinc-800/60">
                    <canvas
                        ref={canvasRef}
                        width={780}
                        height={340}
                        className="w-full h-full block"
                    />

                    {/* Simulated Peer Cursor 1: Alex */}
                    <div
                        className="absolute pointer-events-none transition-all duration-75 flex items-start gap-1"
                        style={{
                            left: `${cursor1.x}px`,
                            top: `${cursor1.y}px`,
                        }}
                    >
                        <MousePointer2 className="w-4 h-4 text-blue-400 fill-blue-400 drop-shadow" />
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg uppercase tracking-wider">
                            Alex (Backend)
                        </span>
                    </div>

                    {/* Simulated Peer Cursor 2: Sarah */}
                    <div
                        className="absolute pointer-events-none transition-all duration-75 flex items-start gap-1"
                        style={{
                            left: `${cursor2.x}px`,
                            top: `${cursor2.y}px`,
                        }}
                    >
                        <MousePointer2 className="w-4 h-4 text-emerald-400 fill-emerald-400 drop-shadow" />
                        <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg uppercase tracking-wider">
                            Sarah (Design)
                        </span>
                    </div>

                    {/* Interactive Overlay on Hover */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Link
                            href="/canvas/architecture-demo"
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-2xl transition-transform transform hover:scale-105"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Open Full Interactive Room</span>
                            <ArrowUpRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
