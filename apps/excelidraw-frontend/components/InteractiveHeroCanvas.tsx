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
        let flowProgress = 0;

        const getBezierPoint = (
            p0x: number, p0y: number,
            p1x: number, p1y: number,
            p2x: number, p2y: number,
            p3x: number, p3y: number,
            t: number
        ) => {
            const u = 1 - t;
            const tt = t * t;
            const uu = u * u;
            const uuu = uu * u;
            const ttt = tt * t;

            const x = uuu * p0x + 3 * uu * t * p1x + 3 * u * tt * p2x + ttt * p3x;
            const y = uuu * p0y + 3 * uu * t * p1y + 3 * u * tt * p2y + ttt * p3y;
            return { x, y };
        };

        const drawMockDiagram = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            flowProgress = (flowProgress + 0.007) % 1;

            // Draw subtle dot grid
            ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
            for (let x = 20; x < canvas.width; x += 30) {
                for (let y = 20; y < canvas.height; y += 30) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // Draw Authentic Architectural Vector Icons
            // 1. Client Monitor
            drawMonitor(ctx, 50, 105, 150, 75, "Frontend Client", "Next.js 15 App", "#38bdf8");

            // 2. Gateway Router Hexagon
            drawGateway(ctx, 280, 105, 150, 75, "Envoy Gateway", "HTTP/2 & WS Multiplex", "#a855f7");

            // 3. Compute Processor Chip (Sync Engine)
            drawChip(ctx, 530, 50, 160, 75, "Sync Engine Pod", "Kafka Real-Time Fanout", "#10b981");

            // 4. Database 3D Cylinder (Sharded PostgreSQL)
            drawDatabase(ctx, 530, 175, 160, 80, "PostgreSQL Master", "Row-Level Replication", "#f59e0b");

            // Connecting Arrows with subtle glow & animated packets
            drawFlowArrow(ctx, 200, 142, 280, 142, "#38bdf8", flowProgress, "POST /v1 (18ms)");
            drawFlowArrow(ctx, 430, 130, 530, 87, "#a855f7", (flowProgress + 0.35) % 1, "Kafka Pub/Sub (2ms)");
            drawFlowArrow(ctx, 430, 155, 530, 215, "#f59e0b", (flowProgress + 0.7) % 1, "WAL Commit (6ms)");

            animId = requestAnimationFrame(drawMockDiagram);
        };

        // 1. Client Monitor Contour
        const drawMonitor = (
            c: CanvasRenderingContext2D,
            x: number, y: number, w: number, h: number,
            title: string, subtitle: string, color: string
        ) => {
            c.save();
            const screenH = h * 0.78;
            c.fillStyle = "rgba(10, 14, 23, 0.92)";
            c.strokeStyle = color;
            c.lineWidth = 1.5;
            if (typeof c.roundRect === "function") {
                c.beginPath();
                c.roundRect(x, y, w, screenH, 8);
                c.fill();
                c.stroke();
            } else {
                c.fillRect(x, y, w, screenH);
                c.strokeRect(x, y, w, screenH);
            }
            // Stand neck & base
            c.fillStyle = "#27272a";
            c.fillRect(x + w / 2 - 5, y + screenH, 10, h - screenH - 4);
            c.fillRect(x + w / 2 - 25, y + h - 4, 50, 4);

            // Text
            c.fillStyle = color;
            c.font = "bold 9px ui-monospace, monospace";
            c.fillText("CLIENT", x + 16, y + 20);
            c.fillStyle = "#ffffff";
            c.font = "bold 12px -apple-system, sans-serif";
            c.fillText(title, x + 16, y + 36);
            c.fillStyle = "rgba(161, 161, 170, 0.9)";
            c.font = "10px ui-monospace, monospace";
            c.fillText(subtitle, x + 16, y + 51);
            c.restore();
        };

        // 2. Gateway Router Hexagon Contour
        const drawGateway = (
            c: CanvasRenderingContext2D,
            x: number, y: number, w: number, h: number,
            title: string, subtitle: string, color: string
        ) => {
            c.save();
            c.fillStyle = "rgba(10, 14, 23, 0.92)";
            c.strokeStyle = color;
            c.lineWidth = 1.5;
            const cx = x + w / 2;
            const cy = y + h / 2;
            c.beginPath();
            c.moveTo(cx, y);
            c.lineTo(x + w, y + h * 0.25);
            c.lineTo(x + w, y + h * 0.75);
            c.lineTo(cx, y + h);
            c.lineTo(x, y + h * 0.75);
            c.lineTo(x, y + h * 0.25);
            c.closePath();
            c.fill();
            c.stroke();

            // Text
            c.textAlign = "center";
            c.fillStyle = color;
            c.font = "bold 9px ui-monospace, monospace";
            c.fillText("GATEWAY", cx, cy - 14);
            c.fillStyle = "#ffffff";
            c.font = "bold 12px -apple-system, sans-serif";
            c.fillText(title, cx, cy + 2);
            c.fillStyle = "rgba(161, 161, 170, 0.9)";
            c.font = "10px ui-monospace, monospace";
            c.fillText(subtitle, cx, cy + 18);
            c.restore();
        };

        // 3. Compute Processor Chip Contour
        const drawChip = (
            c: CanvasRenderingContext2D,
            x: number, y: number, w: number, h: number,
            title: string, subtitle: string, color: string
        ) => {
            c.save();
            c.strokeStyle = color;
            c.lineWidth = 1.5;
            // Pins top/bottom
            for (let i = 0; i < 4; i++) {
                const px = x + 25 + i * (w - 50) / 3;
                c.beginPath();
                c.moveTo(px, y - 6);
                c.lineTo(px, y);
                c.moveTo(px, y + h);
                c.lineTo(px, y + h + 6);
                c.stroke();
            }
            // Pins left/right
            for (let i = 0; i < 3; i++) {
                const py = y + 18 + i * (h - 36) / 2;
                c.beginPath();
                c.moveTo(x - 6, py);
                c.lineTo(x, py);
                c.moveTo(x + w, py);
                c.lineTo(x + w + 6, py);
                c.stroke();
            }

            // Ceramic body
            c.fillStyle = "rgba(10, 14, 23, 0.92)";
            if (typeof c.roundRect === "function") {
                c.beginPath();
                c.roundRect(x, y, w, h, 8);
                c.fill();
                c.stroke();
            } else {
                c.fillRect(x, y, w, h);
                c.strokeRect(x, y, w, h);
            }

            // Pin 1 marker dot
            c.fillStyle = color;
            c.beginPath();
            c.arc(x + 10, y + 10, 2.5, 0, Math.PI * 2);
            c.fill();

            // Text
            c.fillStyle = color;
            c.font = "bold 9px ui-monospace, monospace";
            c.fillText("COMPUTE", x + 20, y + 20);
            c.fillStyle = "#ffffff";
            c.font = "bold 12px -apple-system, sans-serif";
            c.fillText(title, x + 20, y + 38);
            c.fillStyle = "rgba(161, 161, 170, 0.9)";
            c.font = "10px ui-monospace, monospace";
            c.fillText(subtitle, x + 20, y + 54);
            c.restore();
        };

        // 4. 3D Cylinder Database Contour
        const drawDatabase = (
            c: CanvasRenderingContext2D,
            x: number, y: number, w: number, h: number,
            title: string, subtitle: string, color: string
        ) => {
            c.save();
            const ry = 14;
            const cx = x + w / 2;
            const topY = y + ry;
            const botY = y + h - ry;

            // Cylinder body
            c.fillStyle = "rgba(10, 14, 23, 0.92)";
            c.strokeStyle = color;
            c.lineWidth = 1.5;

            c.beginPath();
            c.moveTo(x, topY);
            c.lineTo(x, botY);
            c.ellipse(cx, botY, w / 2, ry, 0, Math.PI, 0, true);
            c.lineTo(x + w, topY);
            c.ellipse(cx, topY, w / 2, ry, 0, 0, Math.PI, false);
            c.closePath();
            c.fill();
            c.stroke();

            // Top Cap Ellipse
            c.fillStyle = "#0d1117";
            c.beginPath();
            c.ellipse(cx, topY, w / 2, ry, 0, 0, Math.PI * 2);
            c.fill();
            c.stroke();

            // Partition Stripe
            const midY = topY + (botY - topY) * 0.45;
            c.setLineDash([3, 3]);
            c.beginPath();
            c.ellipse(cx, midY, w / 2, ry, 0, 0, Math.PI, false);
            c.stroke();
            c.setLineDash([]);

            // Text
            c.textAlign = "center";
            c.fillStyle = color;
            c.font = "bold 9px ui-monospace, monospace";
            c.fillText("DATABASE", cx, midY - 6);
            c.fillStyle = "#ffffff";
            c.font = "bold 12px -apple-system, sans-serif";
            c.fillText(title, cx, midY + 12);
            c.fillStyle = "rgba(161, 161, 170, 0.9)";
            c.font = "10px ui-monospace, monospace";
            c.fillText(subtitle, cx, midY + 26);
            c.restore();
        };

        const drawFlowArrow = (
            c: CanvasRenderingContext2D,
            fromX: number,
            fromY: number,
            toX: number,
            toY: number,
            color: string,
            t: number,
            badgeLabel: string
        ) => {
            const ctrlX1 = fromX + (toX - fromX) / 2;
            const ctrlY1 = fromY;
            const ctrlX2 = fromX + (toX - fromX) / 2;
            const ctrlY2 = toY;

            c.save();
            c.strokeStyle = color;
            c.lineWidth = 2;
            c.setLineDash([4, 4]);
            c.beginPath();
            c.moveTo(fromX, fromY);
            c.bezierCurveTo(ctrlX1, ctrlY1, ctrlX2, ctrlY2, toX, toY);
            c.stroke();
            c.setLineDash([]);

            // Draw glowing flowing packet
            const pt = getBezierPoint(fromX, fromY, ctrlX1, ctrlY1, ctrlX2, ctrlY2, toX, toY, t);

            // Outer glow
            c.shadowColor = color;
            c.shadowBlur = 10;
            c.fillStyle = color;
            c.beginPath();
            c.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
            c.fill();

            // Inner bright core
            c.fillStyle = "#ffffff";
            c.beginPath();
            c.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
            c.fill();

            // Telemetry micro tag
            c.shadowBlur = 0;
            c.fillStyle = "rgba(15, 23, 42, 0.92)";
            c.strokeStyle = color;
            c.lineWidth = 1;
            const tagW = c.measureText(badgeLabel).width + 12;
            const tagH = 16;
            const tagX = pt.x - tagW / 2;
            const tagY = pt.y - 20;

            if (typeof c.roundRect === "function") {
                c.beginPath();
                c.roundRect(tagX, tagY, tagW, tagH, 4);
                c.fill();
                c.stroke();
            } else {
                c.fillRect(tagX, tagY, tagW, tagH);
                c.strokeRect(tagX, tagY, tagW, tagH);
            }

            c.fillStyle = "#38bdf8";
            c.font = "9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
            c.fillText(badgeLabel, tagX + 6, tagY + 11);

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
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[11px] font-medium hidden sm:flex">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            Flow Simulation Active
                        </span>
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Multiplayer Sync
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
