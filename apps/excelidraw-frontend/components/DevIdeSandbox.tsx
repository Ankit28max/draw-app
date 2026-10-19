"use client";

import { useState, useEffect, useRef, type SVGProps } from "react";
import Link from "next/link";
import {
    Activity,
    Play,
    Pause,
    Terminal,
    FileCode2,
    Database,
    Copy,
    Check,
    ArrowRight,
    Wifi,
    Cpu,
    Radio,
    Layers,
    Server,
    Shield,
    Boxes
} from "lucide-react";

export function DevIdeSandbox() {
    const [activeTab, setActiveTab] = useState<"simulation" | "websocket" | "mermaid" | "sql">("simulation");
    const [isPlaying, setIsPlaying] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);
    const [wsLogs, setWsLogs] = useState<Array<{ id: number; time: string; type: string; payload: string; status: string }>>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const copyToClipboard = (text: string, label: string) => {
        if (typeof navigator !== "undefined") {
            navigator.clipboard.writeText(text);
            setCopied(label);
            setTimeout(() => setCopied(null), 2000);
        }
    };

    // Simulated live WebSocket frames for the Terminal Tab
    useEffect(() => {
        const initialLogs = [
            { id: 1, time: "14:20:01.104", type: "WS_JOIN", payload: `{"type":"join_room","roomId":"hld-system","user":"alex.ts"}`, status: "ACK 200" },
            { id: 2, time: "14:20:01.108", type: "WS_INIT", payload: `{"type":"init","connectionId":"conn_x91b","color":"#38bdf8"}`, status: "HANDSHAKE" },
            { id: 3, time: "14:20:01.142", type: "CURSOR_MOVE", payload: `{"type":"cursor_move","x":540.2,"y":230.8,"t":14}`, status: "60 FPS LERP" },
            { id: 4, time: "14:20:01.215", type: "SHAPE_INSERT", payload: `{"type":"chat","nodeType":"database","title":"PostgreSQL"}`, status: "SYNCED" },
            { id: 5, time: "14:20:01.450", type: "QUEUE_DRAIN", payload: `{"batch":30,"flushIntervalMs":1500,"table":"chats"}`, status: "WRITE_BEHIND" },
        ];
        setWsLogs(initialLogs);

        const interval = setInterval(() => {
            const now = new Date();
            const timeStr = now.toTimeString().split(" ")[0] + "." + String(now.getMilliseconds()).padStart(3, "0");
            const sampleEvents = [
                { type: "CURSOR_LERP", payload: `{"type":"cursor_move","x":${(400 + Math.random() * 200).toFixed(1)},"y":${(150 + Math.random() * 120).toFixed(1)}}`, status: "p99 8ms" },
                { type: "SIM_TELEMETRY", payload: `{"type":"packet_transit","from":"load_balancer","to":"ws-backend","latency":3}`, status: "IN_TRANSIT" },
                { type: "BUFFER_ENQUEUE", payload: `{"type":"write_behind","queueLen":${Math.floor(Math.random() * 15) + 1},"maxBatch":30}`, status: "BUFFERED" },
                { type: "PRESENCE_PING", payload: `{"type":"ping","heartbeatInterval":30000,"activeSockets":4}`, status: "HEALTHY" },
            ];
            const pick = sampleEvents[Math.floor(Math.random() * sampleEvents.length)]!;
            setWsLogs((prev) => [...prev.slice(-9), { id: Date.now(), time: timeStr, ...pick }]);
        }, 1800);

        return () => clearInterval(interval);
    }, []);

    // Canvas animation for Live Request Flow Simulation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animId: number;
        let progress = 0;

        const connections = [
            { startX: 180, startY: 175, endX: 340, endY: 175, label: "HTTPS / TLS 1.3 (6ms)", color: "#38bdf8" },
            { startX: 470, startY: 155, endX: 620, endY: 110, label: "REST /api/v1 (14ms)", color: "#22d3ee" },
            { startX: 470, startY: 195, endX: 620, endY: 240, label: "WSS Frame (2ms)", color: "#f97316" },
            { startX: 770, startY: 110, endX: 940, endY: 160, label: "Prisma SQL (12ms)", color: "#38bdf8" },
            { startX: 770, startY: 240, endX: 830, endY: 240, label: "In-Memory Enqueue (0.2ms)", color: "#34d399" },
            { startX: 930, startY: 240, endX: 970, endY: 195, label: "Batched Flush (4ms)", color: "#34d399" },
        ];

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            connections.forEach((conn, idx) => {
                ctx.beginPath();
                ctx.moveTo(conn.startX, conn.startY);
                ctx.bezierCurveTo(
                    conn.startX + (conn.endX - conn.startX) * 0.5, conn.startY,
                    conn.startX + (conn.endX - conn.startX) * 0.5, conn.endY,
                    conn.endX, conn.endY
                );
                ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
                ctx.lineWidth = 2;
                ctx.stroke();

                if (isPlaying) {
                    const phase = (progress + idx * 0.22) % 1;
                    const p0 = { x: conn.startX, y: conn.startY };
                    const p1 = { x: conn.startX + (conn.endX - conn.startX) * 0.5, y: conn.startY };
                    const p2 = { x: conn.startX + (conn.endX - conn.startX) * 0.5, y: conn.endY };
                    const p3 = { x: conn.endX, y: conn.endY };

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

                    // Crisp core dot
                    ctx.beginPath();
                    ctx.arc(px, py, 3, 0, Math.PI * 2);
                    ctx.fillStyle = "#ffffff";
                    ctx.fill();
                }
            });

            if (isPlaying) {
                progress = (progress + 0.007) % 1;
            }

            animId = requestAnimationFrame(render);
        };

        animId = requestAnimationFrame(render);
        return () => cancelAnimationFrame(animId);
    }, [isPlaying, activeTab]);

    const mermaidCode = `flowchart LR
    client["Next.js 15 Client<br/>• React 19 App<br/>• 60 FPS Canvas"]
    proxy["Cloudflare & L7 Proxy<br/>• TLS 1.3 Termination<br/>• WSS / HTTP Routing"]
    http["HTTP REST API (:3001)<br/>• scrypt Password Hash<br/>• Timing-Safe Equal"]
    ws["WebSocket Engine (:8080)<br/>• Zero-Alloc Room Hub<br/>• 512KB DoS Guard"]
    queue["Write-Behind Buffer<br/>• 30 Shapes / 1.5s Flush"]
    db[("PostgreSQL Database<br/>• Prisma Relational Schema<br/>• B-Tree Indexes")]

    client -->|HTTPS| proxy
    client <-->|WSS Stream| proxy
    proxy -->|REST API| http
    proxy <-->|WSS Multiplex| ws
    http -->|Prisma Client| db
    ws -->|Enqueue| queue
    queue -->|Batched INSERT| db`;

    const sqlCode = `-- VectorCraft Production Schema (Prisma PostgreSQL)
CREATE TABLE "User" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL, -- scrypt derived key ($salt:$hash)
    "name" VARCHAR(100) DEFAULT 'Developer',
    "photo" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "Room" (
    "id" SERIAL PRIMARY KEY,
    "slug" VARCHAR(120) UNIQUE NOT NULL, -- e.g. "hld-event-streaming"
    "adminId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE "Chat" (
    "id" SERIAL PRIMARY KEY,
    "roomId" INT NOT NULL REFERENCES "Room"("id") ON DELETE CASCADE,
    "message" TEXT NOT NULL, -- JSON serialized shape payload
    "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- B-Tree Performance Index for high-velocity room retrieval
CREATE INDEX "Chat_roomId_idx" ON "Chat"("roomId");`;

    return (
        <div className="rounded-3xl bg-[#090b10] border border-zinc-800/80 shadow-2xl overflow-hidden backdrop-blur-2xl">
            {/* Top Developer IDE Tab Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-950/80">
                <div className="flex items-center gap-2 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab("simulation")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                            activeTab === "simulation"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                        }`}
                    >
                        <Activity className="w-3.5 h-3.5 text-blue-300" />
                        <span>Live Request Flow</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </button>

                    <button
                        onClick={() => setActiveTab("websocket")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                            activeTab === "websocket"
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                        }`}
                    >
                        <Terminal className="w-3.5 h-3.5 text-purple-300" />
                        <span>WebSocket Protocol Feed</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("mermaid")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                            activeTab === "mermaid"
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                        }`}
                    >
                        <FileCode2 className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Mermaid.js Flowchart</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("sql")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                            activeTab === "sql"
                                ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                        }`}
                    >
                        <Database className="w-3.5 h-3.5 text-amber-300" />
                        <span>PostgreSQL DDL</span>
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {activeTab === "simulation" && (
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-colors border cursor-pointer ${
                                isPlaying
                                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                    : "bg-zinc-800 text-zinc-300 border-zinc-700"
                            }`}
                        >
                            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                            <span>{isPlaying ? "Simulating" : "Paused"}</span>
                        </button>
                    )}

                    {activeTab === "mermaid" && (
                        <button
                            onClick={() => copyToClipboard(mermaidCode, "mermaid")}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer transition-colors"
                        >
                            {copied === "mermaid" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copied === "mermaid" ? "Copied" : "Copy Markdown"}</span>
                        </button>
                    )}

                    {activeTab === "sql" && (
                        <button
                            onClick={() => copyToClipboard(sqlCode, "sql")}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer transition-colors"
                        >
                            {copied === "sql" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copied === "sql" ? "Copied" : "Copy SQL"}</span>
                        </button>
                    )}

                    <Link
                        href="/canvas/hld-this-app"
                        className="hidden sm:flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-mono font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                        <span>Open in Workspace</span>
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>

            {/* TAB CONTENT 1: Live Architecture Simulation */}
            {activeTab === "simulation" && (
                <div className="relative w-full h-[380px] bg-[#07090e] overflow-x-auto overflow-y-hidden select-none">
                    {/* Background Dot Grid */}
                    <div
                        className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{
                            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.25) 1px, transparent 0)`,
                            backgroundSize: `24px 24px`,
                        }}
                    />

                    {/* Simulation Flow Canvas */}
                    <canvas
                        ref={canvasRef}
                        width={1180}
                        height={380}
                        className="absolute inset-0 pointer-events-none z-10 w-[1180px] h-[380px]"
                    />

                    {/* Real Stencil Architecture Cards */}
                    <div className="absolute inset-0 z-20 w-[1180px] h-[380px] pointer-events-auto">
                        {/* 1. Next.js 15 Client */}
                        <div className="absolute left-[40px] top-[125px] w-[140px] h-[105px] rounded-2xl bg-zinc-950/90 border border-blue-500/40 p-3 shadow-xl backdrop-blur-md flex flex-col justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                    <LaptopIcon className="w-3.5 h-3.5" />
                                </div>
                                <div className="text-[10px] font-mono text-blue-400 font-bold">CLIENT</div>
                            </div>
                            <div className="text-xs font-bold text-white">Next.js 15 Client</div>
                            <div className="text-[9px] font-mono text-zinc-400">React 19 • 60 FPS</div>
                        </div>

                        {/* 2. Cloudflare & L7 Proxy */}
                        <div className="absolute left-[340px] top-[120px] w-[130px] h-[110px] rounded-2xl bg-zinc-950/90 border border-purple-500/40 p-3 shadow-xl backdrop-blur-md flex flex-col justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                                    <Layers className="w-3.5 h-3.5" />
                                </div>
                                <div className="text-[10px] font-mono text-purple-400 font-bold">GATEWAY</div>
                            </div>
                            <div className="text-xs font-bold text-white">Cloudflare Proxy</div>
                            <div className="text-[9px] font-mono text-zinc-400">TLS 1.3 Anycast</div>
                        </div>

                        {/* 3. HTTP REST API (:3001) */}
                        <div className="absolute left-[620px] top-[60px] w-[150px] h-[100px] rounded-2xl bg-zinc-950/90 border border-cyan-500/40 p-3 shadow-xl backdrop-blur-md flex flex-col justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                                    <Server className="w-3.5 h-3.5" />
                                </div>
                                <div className="text-[10px] font-mono text-cyan-400 font-bold">REST API</div>
                            </div>
                            <div className="text-xs font-bold text-white">HTTP Backend (:3001)</div>
                            <div className="text-[9px] font-mono text-zinc-400">Express • scrypt</div>
                        </div>

                        {/* 4. WebSocket Sync Engine (:8080) */}
                        <div className="absolute left-[620px] top-[190px] w-[150px] h-[105px] rounded-2xl bg-zinc-950/90 border border-orange-500/40 p-3 shadow-xl backdrop-blur-md flex flex-col justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                                    <Cpu className="w-3.5 h-3.5" />
                                </div>
                                <div className="text-[10px] font-mono text-orange-400 font-bold">ENGINE</div>
                            </div>
                            <div className="text-xs font-bold text-white">WebSocket (:8080)</div>
                            <div className="text-[9px] font-mono text-zinc-400">ws • 512KB DoS Guard</div>
                        </div>

                        {/* 5. Write-Behind Queue */}
                        <div className="absolute left-[830px] top-[190px] w-[100px] h-[105px] rounded-2xl bg-zinc-950/90 border border-emerald-500/40 p-3 shadow-xl backdrop-blur-md flex flex-col justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                    <Radio className="w-3.5 h-3.5" />
                                </div>
                                <div className="text-[9px] font-mono text-emerald-400 font-bold">BUFFER</div>
                            </div>
                            <div className="text-xs font-bold text-white">Write Queue</div>
                            <div className="text-[9px] font-mono text-zinc-400">Batch: 30 / 1.5s</div>
                        </div>

                        {/* 6. PostgreSQL Database */}
                        <div className="absolute left-[970px] top-[115px] w-[150px] h-[115px] rounded-2xl bg-zinc-950/90 border border-sky-500/40 p-3.5 shadow-xl backdrop-blur-md flex flex-col justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                                    <Database className="w-3.5 h-3.5" />
                                </div>
                                <div className="text-[10px] font-mono text-sky-400 font-bold">DATABASE</div>
                            </div>
                            <div className="text-xs font-bold text-white">PostgreSQL 16</div>
                            <div className="text-[9px] font-mono text-zinc-400">Prisma Client • ACID</div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT 2: Live WebSocket Protocol Stream */}
            {activeTab === "websocket" && (
                <div className="p-4 sm:p-6 bg-[#06080d] font-mono text-xs text-zinc-300 h-[380px] overflow-y-auto space-y-2 select-text">
                    <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-800 text-[11px] text-zinc-500">
                        <span className="flex items-center gap-2 text-purple-400">
                            <Wifi className="w-3.5 h-3.5" />
                            <span>CONNECTED TO wss://localhost:8080 (Multi-Tenant Multiplexed Room Hub)</span>
                        </span>
                        <span className="text-emerald-400 font-bold">BUFFER DRAIN: 1500ms</span>
                    </div>

                    {wsLogs.map((log) => (
                        <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-1 px-2.5 rounded-lg hover:bg-zinc-900/60 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="text-zinc-500 text-[10px]">{log.time}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    log.type === "WS_JOIN" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                                    log.type === "CURSOR_MOVE" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" :
                                    log.type === "QUEUE_DRAIN" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                    "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                }`}>
                                    {log.type}
                                </span>
                                <span className="text-zinc-300 font-mono text-[11px] truncate max-w-[480px]">
                                    {log.payload}
                                </span>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400 self-end sm:self-auto">
                                [{log.status}]
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB CONTENT 3: Mermaid.js Flowchart Code */}
            {activeTab === "mermaid" && (
                <div className="p-4 sm:p-6 bg-[#06080d] font-mono text-xs text-zinc-300 h-[380px] overflow-y-auto leading-relaxed select-text">
                    <pre className="text-emerald-400 font-mono text-xs">{mermaidCode}</pre>
                </div>
            )}

            {/* TAB CONTENT 4: PostgreSQL DDL Schema */}
            {activeTab === "sql" && (
                <div className="p-4 sm:p-6 bg-[#06080d] font-mono text-xs text-zinc-300 h-[380px] overflow-y-auto leading-relaxed select-text">
                    <pre className="text-amber-400 font-mono text-xs">{sqlCode}</pre>
                </div>
            )}

            {/* Bottom Status Ticker */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-t border-zinc-800/80 bg-zinc-950/60 text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Engine: Turborepo Monorepo (pnpm workspace)</span>
                    </span>
                    <span className="hidden md:inline text-zinc-600">|</span>
                    <span className="hidden md:inline text-zinc-400">
                        Zero-Lockin: Export Mermaid.js, SVG & JSON State anytime
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500">Live Port:</span>
                    <span className="text-blue-400 font-bold">:3000 (UI)</span>
                    <span className="text-cyan-400 font-bold">:3001 (REST)</span>
                    <span className="text-orange-400 font-bold">:8080 (WSS)</span>
                </div>
            </div>
        </div>
    );
}

function LaptopIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" />
        </svg>
    );
}
