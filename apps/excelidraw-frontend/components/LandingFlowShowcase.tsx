"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
    Play,
    Pause,
    Activity,
    Layers,
    Cpu,
    Database,
    Zap,
    Radio,
    Boxes,
    ArrowRight,
    Server,
    ShieldCheck,
    CheckCircle2,
    Pencil,
    Check,
    X,
    RotateCcw
} from "lucide-react";

export interface TechIconNode {
    id: string;
    nodeType: "database" | "ec2" | "server" | "load_balancer" | "queue" | "client";
    title: string;
    specs: string;
    typeLabel: string;
    badge: string;
    color: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

interface Connection {
    from: string;
    to: string;
    label: string;
    latency: string;
    color: string;
}

const DEFAULT_NODES: TechIconNode[] = [
    {
        id: "client",
        nodeType: "client",
        title: "Next.js 15 App",
        specs: "React 19 • 60 FPS",
        typeLabel: "CLIENT",
        badge: "v15.1",
        color: "#38bdf8",
        x: 40,
        y: 135,
        w: 150,
        h: 110,
    },
    {
        id: "gateway",
        nodeType: "load_balancer",
        title: "Cloudflare & L7",
        specs: "TLS 1.3 • Anycast",
        typeLabel: "GATEWAY",
        badge: "Edge",
        color: "#c084fc",
        x: 270,
        y: 135,
        w: 155,
        h: 110,
    },
    {
        id: "http",
        nodeType: "server",
        title: "HTTP REST API",
        specs: "Express • scrypt (:3001)",
        typeLabel: "SERVER",
        badge: ":3001",
        color: "#22d3ee",
        x: 510,
        y: 50,
        w: 165,
        h: 115,
    },
    {
        id: "ws",
        nodeType: "ec2",
        title: "WebSocket Engine",
        specs: "Zero-Alloc Hub (:8080)",
        typeLabel: "COMPUTE",
        badge: ":8080",
        color: "#fb923c",
        x: 510,
        y: 220,
        w: 165,
        h: 115,
    },
    {
        id: "queue",
        nodeType: "queue",
        title: "Write-Behind Queue",
        specs: "30 shapes / 1.5s flush",
        typeLabel: "BUFFER",
        badge: "RAM",
        color: "#34d399",
        x: 760,
        y: 220,
        w: 160,
        h: 115,
    },
    {
        id: "db",
        nodeType: "database",
        title: "PostgreSQL 16",
        specs: "Prisma Relational • B-Tree",
        typeLabel: "DATABASE",
        badge: "ACID",
        color: "#38bdf8",
        x: 990,
        y: 135,
        w: 160,
        h: 120,
    },
];

export function LandingFlowShowcase() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [nodes, setNodes] = useState<TechIconNode[]>(DEFAULT_NODES);
    const [isPlaying, setIsPlaying] = useState(true);
    const [activeNodeId, setActiveNodeId] = useState<string>("ws");
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editSpecs, setEditSpecs] = useState("");
    const [p99Latency, setP99Latency] = useState(14);
    const [qps, setQps] = useState(1280);

    const connections: Connection[] = [
        { from: "client", to: "gateway", label: "HTTPS / TLS 1.3", latency: "6ms", color: "#38bdf8" },
        { from: "gateway", to: "http", label: "POST /auth", latency: "14ms", color: "#22d3ee" },
        { from: "gateway", to: "ws", label: "WSS Frame Stream", latency: "2ms", color: "#fb923c" },
        { from: "http", to: "db", label: "Prisma Read", latency: "12ms", color: "#38bdf8" },
        { from: "ws", to: "queue", label: "In-Memory Enqueue", latency: "0.2ms", color: "#34d399" },
        { from: "queue", to: "db", label: "Batched Flush", latency: "5ms", color: "#34d399" },
    ];

    // Start editing an icon's label
    const handleStartEdit = (node: TechIconNode) => {
        setEditingNodeId(node.id);
        setEditTitle(node.title);
        setEditSpecs(node.specs);
    };

    // Save edited label
    const handleSaveEdit = (nodeId: string) => {
        setNodes((prev) =>
            prev.map((n) =>
                n.id === nodeId
                    ? {
                          ...n,
                          title: editTitle.trim() || n.title,
                          specs: editSpecs.trim() || n.specs,
                      }
                    : n
            )
        );
        setEditingNodeId(null);
    };

    // Reset to defaults
    const handleResetNodes = () => {
        setNodes(DEFAULT_NODES);
        setEditingNodeId(null);
    };

    // Canvas render loop for glowing packets
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animId: number;
        let progress = 0;

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw connecting conduits
            connections.forEach((conn, idx) => {
                const source = nodes.find((n) => n.id === conn.from);
                const target = nodes.find((n) => n.id === conn.to);
                if (!source || !target) return;

                const startX = source.x + source.w;
                const startY = source.y + source.h / 2;
                const endX = target.x;
                const endY = target.y + target.h / 2;

                // Subtle conduit track line
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.bezierCurveTo(
                    startX + (endX - startX) * 0.5, startY,
                    startX + (endX - startX) * 0.5, endY,
                    endX, endY
                );
                ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
                ctx.lineWidth = 2;
                ctx.stroke();

                // Arrow head at target
                ctx.beginPath();
                ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
                ctx.moveTo(endX, endY);
                ctx.lineTo(endX - 7, endY - 4);
                ctx.lineTo(endX - 7, endY + 4);
                ctx.closePath();
                ctx.fill();

                if (isPlaying) {
                    const phase = (progress + idx * 0.22) % 1;

                    // Cubic bezier calculation
                    const p0 = { x: startX, y: startY };
                    const p1 = { x: startX + (endX - startX) * 0.5, y: startY };
                    const p2 = { x: startX + (endX - startX) * 0.5, y: endY };
                    const p3 = { x: endX, y: endY };

                    const t = phase;
                    const u = 1 - t;
                    const px = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
                    const py = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;

                    // Glowing packet halo
                    const halo = ctx.createRadialGradient(px, py, 1, px, py, 9);
                    halo.addColorStop(0, "#ffffff");
                    halo.addColorStop(0.4, conn.color);
                    halo.addColorStop(1, "rgba(0, 0, 0, 0)");

                    ctx.beginPath();
                    ctx.arc(px, py, 9, 0, Math.PI * 2);
                    ctx.fillStyle = halo;
                    ctx.fill();

                    // Sharp core
                    ctx.beginPath();
                    ctx.arc(px, py, 3, 0, Math.PI * 2);
                    ctx.fillStyle = "#ffffff";
                    ctx.fill();

                    // Midpoint telemetry pill badge
                    const midT = 0.5;
                    const midU = 1 - midT;
                    const mx = midU * midU * midU * p0.x + 3 * midU * midU * midT * p1.x + 3 * midU * midT * midT * p2.x + midT * midT * midT * p3.x;
                    const my = midU * midU * midU * p0.y + 3 * midU * midU * midT * p1.y + 3 * midU * midT * midT * p2.y + midT * midT * midT * p3.y;

                    ctx.save();
                    ctx.font = "bold 9px ui-monospace, SFMono-Regular, monospace";
                    const badgeText = `${conn.label} (${conn.latency})`;
                    const tw = ctx.measureText(badgeText).width + 10;
                    const th = 16;

                    ctx.fillStyle = "rgba(10, 12, 18, 0.92)";
                    ctx.strokeStyle = conn.color;
                    ctx.lineWidth = 1;

                    ctx.beginPath();
                    if (typeof ctx.roundRect === "function") {
                        ctx.roundRect(mx - tw / 2, my - th / 2 - 12, tw, th, 4);
                    } else {
                        ctx.rect(mx - tw / 2, my - th / 2 - 12, tw, th);
                    }
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = "#e2e8f0";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(badgeText, mx, my - 12);
                    ctx.restore();
                }
            });

            if (isPlaying) {
                progress = (progress + 0.0065) % 1;
            }

            animId = requestAnimationFrame(render);
        };

        animId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animId);
    }, [isPlaying, nodes]);

    // Simulated telemetry variation
    useEffect(() => {
        const interval = setInterval(() => {
            setP99Latency(12 + Math.floor(Math.random() * 5));
            setQps(1240 + Math.floor(Math.random() * 120));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const activeNode = nodes.find((n) => n.id === activeNodeId) || nodes[3]!;

    return (
        <div className="relative rounded-3xl bg-zinc-950/90 border border-zinc-800 shadow-2xl overflow-hidden backdrop-blur-xl">
            {/* Top Showcase Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-white/5 bg-zinc-900/60">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">
                            Live Architectural Icon Engine
                        </span>
                    </div>
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono">
                        Double-click any icon to edit label
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Live Telemetry Tickers */}
                    <div className="hidden md:flex items-center gap-4 text-xs font-mono text-zinc-400 mr-2">
                        <div className="flex items-center gap-1.5">
                            <span className="text-zinc-500">p99 Latency:</span>
                            <span className="text-emerald-400 font-bold">{p99Latency}ms</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-zinc-500">Throughput:</span>
                            <span className="text-cyan-400 font-bold">{qps} msgs/s</span>
                        </div>
                    </div>

                    <button
                        onClick={handleResetNodes}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-800"
                        title="Reset labels to default"
                    >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                    </button>

                    {/* Simulation Toggle Button */}
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                            isPlaying
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25"
                                : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 text-white"
                        }`}
                    >
                        {isPlaying ? (
                            <>
                                <Pause className="w-3.5 h-3.5 fill-current" />
                                <span>Pause Flow</span>
                            </>
                        ) : (
                            <>
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Simulate Flow</span>
                            </>
                        )}
                    </button>

                    <Link
                        href="/canvas/hld-this-app"
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                    >
                        <span>Open in Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>

            {/* Architecture Canvas Viewport with Authentic Architectural Icons */}
            <div className="relative w-full h-[380px] sm:h-[410px] overflow-x-auto overflow-y-hidden select-none bg-[#07090e]">
                {/* Background Grid Pattern */}
                <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.25) 1px, transparent 0)`,
                        backgroundSize: `24px 24px`,
                    }}
                />

                {/* Canvas with vector packets */}
                <canvas
                    ref={canvasRef}
                    width={1200}
                    height={410}
                    className="absolute inset-0 pointer-events-none z-10 w-[1200px] h-[410px]"
                />

                {/* Interactive Architectural Vector Icons */}
                <div className="absolute inset-0 z-20 w-[1200px] h-[410px] pointer-events-auto">
                    {nodes.map((node) => {
                        const isSelected = activeNodeId === node.id;
                        const isEditing = editingNodeId === node.id;

                        return (
                            <div
                                key={node.id}
                                onClick={() => setActiveNodeId(node.id)}
                                onDoubleClick={() => handleStartEdit(node)}
                                style={{
                                    left: `${node.x}px`,
                                    top: `${node.y}px`,
                                    width: `${node.w}px`,
                                    height: `${node.h}px`,
                                }}
                                className={`absolute cursor-pointer transition-transform duration-150 ${
                                    isSelected ? "scale-105 z-30" : "hover:scale-[1.02] z-20"
                                }`}
                            >
                                {/* Authentic Vector Architectural Icon Contour */}
                                <div className="relative w-full h-full">
                                    <ArchitecturalIconShape
                                        nodeType={node.nodeType}
                                        isSelected={isSelected}
                                        color={node.color}
                                    />

                                    {/* Icon Text Content Overlay */}
                                    <div className="absolute inset-0 p-3 flex flex-col items-center justify-center text-center pointer-events-none">
                                        {/* Type Header Tag */}
                                        <div className="text-[9px] font-mono font-bold uppercase tracking-wider mb-0.5" style={{ color: node.color }}>
                                            {node.typeLabel}
                                        </div>

                                        {isEditing ? (
                                            /* In-Place Text Editor */
                                            <div
                                                className="w-full pointer-events-auto bg-zinc-950 p-1.5 rounded-lg border border-blue-400 shadow-2xl z-40"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <input
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className="w-full bg-zinc-900 px-1.5 py-0.5 text-xs text-white rounded border border-zinc-700 font-bold focus:outline-none focus:border-blue-400 mb-1"
                                                    placeholder="Node Title"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") handleSaveEdit(node.id);
                                                        if (e.key === "Escape") setEditingNodeId(null);
                                                    }}
                                                />
                                                <input
                                                    type="text"
                                                    value={editSpecs}
                                                    onChange={(e) => setEditSpecs(e.target.value)}
                                                    className="w-full bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-300 rounded border border-zinc-700 font-mono focus:outline-none focus:border-blue-400 mb-1.5"
                                                    placeholder="Specs / Subtitle"
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") handleSaveEdit(node.id);
                                                        if (e.key === "Escape") setEditingNodeId(null);
                                                    }}
                                                />
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => setEditingNodeId(null)}
                                                        className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSaveEdit(node.id)}
                                                        className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold"
                                                    >
                                                        <Check className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Readable Title */}
                                                <div className="text-xs font-bold text-white leading-tight px-1 drop-shadow line-clamp-2">
                                                    {node.title}
                                                </div>
                                                {/* Specs Subtitle */}
                                                <div className="text-[9px] font-mono text-zinc-300 mt-1 leading-tight px-1 drop-shadow line-clamp-2">
                                                    {node.specs}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Edit Hint Hover Button */}
                                    {!isEditing && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartEdit(node);
                                            }}
                                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 rounded-md bg-zinc-900/90 border border-zinc-700 text-zinc-400 hover:text-white transition-opacity z-30"
                                            title="Click to edit label"
                                        >
                                            <Pencil className="w-2.5 h-2.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Active Node Telemetry Inspector Strip */}
            <div className="p-4 sm:p-5 border-t border-white/5 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                        <Activity className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                            <span>Selected Icon: {activeNode.title}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {activeNode.typeLabel}
                            </span>
                            <button
                                onClick={() => handleStartEdit(activeNode)}
                                className="text-[10px] font-mono text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <Pencil className="w-2.5 h-2.5" />
                                <span>Edit Label</span>
                            </button>
                        </div>
                        <p className="text-zinc-400 text-[11px] mt-0.5 font-mono">
                            Specs: {activeNode.specs} • Authentic Vector Contours • Attached Dynamic Connectors
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <span className="text-zinc-500 text-[11px] font-mono">
                        VectorCraft Architecture IDE
                    </span>
                    <Link
                        href="/canvas/hld-this-app"
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-zinc-700"
                    >
                        <span>Launch Architecture</span>
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

/**
 * Authentic SVG architectural icon contours matching canvas Game.ts
 */
function ArchitecturalIconShape({
    nodeType,
    isSelected,
    color,
}: {
    nodeType: "database" | "ec2" | "server" | "load_balancer" | "queue" | "client";
    isSelected: boolean;
    color: string;
}) {
    const strokeClass = isSelected ? "stroke-blue-400 stroke-2" : "stroke-zinc-700/90 stroke-[1.5]";
    const fillClass = isSelected ? "fill-zinc-950/95" : "fill-zinc-950/90";
    const glowFilter = isSelected ? "drop-shadow(0 0 12px rgba(56, 189, 248, 0.3))" : "drop-shadow(0 4px 6px rgba(0,0,0,0.5))";

    if (nodeType === "database") {
        // 3D Cylinder geometry with top ellipse, curved sides, bottom ellipse, and internal partition groove
        return (
            <svg
                viewBox="0 0 160 120"
                className="w-full h-full overflow-visible"
                style={{ filter: glowFilter }}
            >
                {/* Cylinder Body */}
                <path
                    d="M 15 25 L 15 95 A 65 20 0 0 0 145 95 L 145 25 Z"
                    className={`${fillClass} ${strokeClass}`}
                />
                {/* Internal Disk Partition Stripe */}
                <path
                    d="M 15 60 A 65 20 0 0 0 145 60"
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.6"
                />
                {/* Top Cap Ellipse */}
                <ellipse
                    cx="80"
                    cy="25"
                    rx="65"
                    ry="20"
                    fill="#0d1117"
                    stroke={color}
                    strokeWidth={isSelected ? "2" : "1.5"}
                />
                <ellipse cx="80" cy="25" rx="55" ry="14" fill="none" stroke={color} strokeWidth="1" opacity="0.3" />
            </svg>
        );
    }

    if (nodeType === "ec2") {
        // Silicon processor chip with 16 circuit pin leads, silicon die rect, and pin-1 dot
        return (
            <svg
                viewBox="0 0 165 115"
                className="w-full h-full overflow-visible"
                style={{ filter: glowFilter }}
            >
                {/* Circuit Pin Leads - Top & Bottom */}
                {[35, 60, 85, 110, 135].map((x) => (
                    <g key={x}>
                        <line x1={x} y1="0" x2={x} y2="12" stroke={color} strokeWidth="2" opacity="0.8" />
                        <line x1={x} y1="103" x2={x} y2="115" stroke={color} strokeWidth="2" opacity="0.8" />
                    </g>
                ))}
                {/* Circuit Pin Leads - Left & Right */}
                {[30, 55, 80].map((y) => (
                    <g key={y}>
                        <line x1="0" y1={y} x2="12" y2={y} stroke={color} strokeWidth="2" opacity="0.8" />
                        <line x1="153" y1={y} x2="165" y2={y} stroke={color} strokeWidth="2" opacity="0.8" />
                    </g>
                ))}

                {/* Main Ceramic Body */}
                <rect
                    x="12"
                    y="12"
                    width="141"
                    height="91"
                    rx="10"
                    className={`${fillClass} ${strokeClass}`}
                />
                {/* Inner Silicon Die Core */}
                <rect
                    x="24"
                    y="22"
                    width="117"
                    height="71"
                    rx="6"
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    opacity="0.4"
                />
                {/* Pin 1 Index Marker */}
                <circle cx="20" cy="20" r="3" fill={color} />
            </svg>
        );
    }

    if (nodeType === "server") {
        // Dual-unit 19" Server Rack Chassis with mounting ears, screw holes, bay dividers, and status LEDs
        return (
            <svg
                viewBox="0 0 165 115"
                className="w-full h-full overflow-visible"
                style={{ filter: glowFilter }}
            >
                {/* Left & Right Mounting Ear Flanges */}
                <rect x="2" y="15" width="10" height="85" rx="3" fill="#18181b" stroke={color} strokeWidth="1" />
                <rect x="153" y="15" width="10" height="85" rx="3" fill="#18181b" stroke={color} strokeWidth="1" />
                <circle cx="7" cy="25" r="2" fill="#52525b" />
                <circle cx="7" cy="90" r="2" fill="#52525b" />
                <circle cx="158" cy="25" r="2" fill="#52525b" />
                <circle cx="158" cy="90" r="2" fill="#52525b" />

                {/* Main 19" Chassis Enclosure */}
                <rect
                    x="12"
                    y="10"
                    width="141"
                    height="95"
                    rx="8"
                    className={`${fillClass} ${strokeClass}`}
                />

                {/* Bay Divider Line (Unit 1 / Unit 2) */}
                <line x1="12" y1="58" x2="153" y2="58" stroke={color} strokeWidth="1" opacity="0.3" />

                {/* Unit 1 LEDs */}
                <circle cx="22" cy="22" r="2.5" fill="#10b981" />
                <circle cx="29" cy="22" r="2.5" fill="#38bdf8" />
                <circle cx="36" cy="22" r="2.5" fill="#f59e0b" />

                {/* Unit 2 LEDs */}
                <circle cx="22" cy="70" r="2.5" fill="#10b981" />
                <circle cx="29" cy="70" r="2.5" fill="#38bdf8" />
            </svg>
        );
    }

    if (nodeType === "load_balancer") {
        // Hexagonal Gateway Router with cross arrows
        return (
            <svg
                viewBox="0 0 155 110"
                className="w-full h-full overflow-visible"
                style={{ filter: glowFilter }}
            >
                {/* Hexagonal Contour */}
                <polygon
                    points="77.5,6 148,28 148,82 77.5,104 7,82 7,28"
                    className={`${fillClass} ${strokeClass}`}
                />
                {/* Inner Cross Guide */}
                <polygon
                    points="77.5,18 136,36 136,74 77.5,92 19,74 19,36"
                    fill="none"
                    stroke={color}
                    strokeWidth="1"
                    opacity="0.3"
                />
                {/* Traffic Routing Dots */}
                <circle cx="77.5" cy="18" r="3" fill={color} />
                <circle cx="136" cy="55" r="3" fill={color} />
                <circle cx="77.5" cy="92" r="3" fill={color} />
                <circle cx="19" cy="55" r="3" fill={color} />
            </svg>
        );
    }

    if (nodeType === "queue") {
        // Message Queue Pipeline with partition slot gates [ msg-1 | msg-2 | msg-3 ]
        return (
            <svg
                viewBox="0 0 160 115"
                className="w-full h-full overflow-visible"
                style={{ filter: glowFilter }}
            >
                {/* Main Queue Channel Enclosure */}
                <rect
                    x="6"
                    y="15"
                    width="148"
                    height="85"
                    rx="12"
                    className={`${fillClass} ${strokeClass}`}
                />
                {/* Vertical Partition Gates */}
                <line x1="45" y1="20" x2="45" y2="95" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
                <line x1="80" y1="20" x2="80" y2="95" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
                <line x1="115" y1="20" x2="115" y2="95" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

                {/* Queue In/Out Flow Indicators */}
                <polygon points="12,57 18,52 18,62" fill={color} opacity="0.8" />
                <polygon points="146,57 140,52 140,62" fill={color} opacity="0.8" />
            </svg>
        );
    }

    // Default: Client Desktop Monitor
    return (
        <svg
            viewBox="0 0 150 110"
            className="w-full h-full overflow-visible"
            style={{ filter: glowFilter }}
        >
            {/* Monitor Screen Frame */}
            <rect
                x="10"
                y="8"
                width="130"
                height="75"
                rx="8"
                className={`${fillClass} ${strokeClass}`}
            />
            {/* Inner Screen Display Area */}
            <rect x="18" y="15" width="114" height="60" rx="4" fill="#090d16" stroke={color} strokeWidth="1" opacity="0.4" />
            {/* Stand Neck */}
            <rect x="70" y="83" width="10" height="15" fill="#18181b" stroke={color} strokeWidth="1" />
            {/* Stand Base */}
            <rect x="50" y="98" width="50" height="6" rx="3" fill="#27272a" stroke={color} strokeWidth="1" />
            {/* Screen Header Dot */}
            <circle cx="75" cy="11" r="1.5" fill={color} />
        </svg>
    );
}
