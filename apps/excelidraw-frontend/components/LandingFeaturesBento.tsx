"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Database,
    Zap,
    Cpu,
    Radio,
    Terminal,
    Layers,
    Boxes,
    FileCode2,
    Download,
    Shield,
    Users,
    Check,
    Copy,
    ArrowUpRight,
    Move,
    Sparkles,
    MousePointer2
} from "lucide-react";

export function LandingFeaturesBento() {
    const [copiedMermaid, setCopiedMermaid] = useState(false);

    const mermaidSnippet = `flowchart LR
    client["Next.js 15 Client"] --> proxy["Cloudflare & L7 Proxy"]
    proxy --> ws["WebSocket Engine (:8080)"]
    proxy --> http["HTTP Backend (:3001)"]
    ws --> queue["Write-Behind Buffer"]
    queue --> db[("PostgreSQL Database")]`;

    const handleCopyMermaid = () => {
        if (typeof navigator !== "undefined") {
            navigator.clipboard.writeText(mermaidSnippet);
            setCopiedMermaid(true);
            setTimeout(() => setCopiedMermaid(false), 2000);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Bento Card 1: System Design Primitives & Dynamic Attached Connectors (Span 2) */}
            <div className="md:col-span-2 rounded-3xl p-7 bg-zinc-900/50 border border-zinc-800/80 hover:border-blue-500/40 transition-all shadow-xl backdrop-blur-xl relative overflow-hidden group flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 blur-3xl pointer-events-none rounded-full" />

                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 w-fit">
                            <Boxes className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            HLD & LLD Primitives
                        </span>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                        Native Distributed System Nodes & Attached Connectors
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-xl mb-6">
                        No more drawing generic boxes. Insert pre-styled PostgreSQL tables, AWS EC2 compute instances, L7 Load Balancers, Redis caches, and Kafka topics.
                        <strong> Moving a node translates all connected arrows automatically</strong>—no broken topologies.
                    </p>
                </div>

                {/* Visual Architecture Showcase Preview */}
                <div className="p-4 rounded-2xl bg-[#090b10] border border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-mono pb-2 border-b border-zinc-800/60">
                        <span className="flex items-center gap-1.5 text-zinc-400">
                            <Move className="w-3.5 h-3.5 text-blue-400" />
                            <span>Interactive Cardinal Port Snapping & Dragging</span>
                        </span>
                        <span className="text-emerald-400 text-[10px]">● Connected</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-blue-500/30 flex flex-col gap-1.5 shadow-sm">
                            <div className="flex items-center gap-2 text-blue-400">
                                <Database className="w-4 h-4" />
                                <span className="font-mono text-[11px] font-bold text-white">PostgreSQL</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">id: uuid (PK)</span>
                            <span className="text-[9px] text-blue-400/80 font-mono">DATABASE</span>
                        </div>

                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-orange-500/30 flex flex-col gap-1.5 shadow-sm">
                            <div className="flex items-center gap-2 text-orange-400">
                                <Boxes className="w-4 h-4" />
                                <span className="font-mono text-[11px] font-bold text-white">AWS EC2</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">t4g.xlarge (4vCPU)</span>
                            <span className="text-[9px] text-orange-400/80 font-mono">COMPUTE</span>
                        </div>

                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-purple-500/30 flex flex-col gap-1.5 shadow-sm">
                            <div className="flex items-center gap-2 text-purple-400">
                                <Layers className="w-4 h-4" />
                                <span className="font-mono text-[11px] font-bold text-white">L7 Proxy</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">Cloudflare / Envoy</span>
                            <span className="text-[9px] text-purple-400/80 font-mono">GATEWAY</span>
                        </div>

                        <div className="p-3 rounded-xl bg-zinc-900/80 border border-red-500/30 flex flex-col gap-1.5 shadow-sm">
                            <div className="flex items-center gap-2 text-red-400">
                                <Zap className="w-4 h-4" />
                                <span className="font-mono text-[11px] font-bold text-white">Redis Cache</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">TTL 3600s • LRU</span>
                            <span className="text-[9px] text-red-400/80 font-mono">IN-MEMORY</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bento Card 2: ⌘K Developer Command Palette (Span 1) */}
            <div className="rounded-3xl p-7 bg-zinc-900/50 border border-zinc-800/80 hover:border-purple-500/40 transition-all shadow-xl backdrop-blur-xl relative overflow-hidden group flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-60 h-60 bg-purple-500/5 blur-3xl pointer-events-none rounded-full" />

                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 w-fit">
                            <Terminal className="w-5 h-5" />
                        </div>
                        <kbd className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            ⌘K
                        </kbd>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                        Dev Command Palette
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                        Speedrun whiteboard creation without taking hands off the keyboard.
                    </p>
                </div>

                {/* Terminal Palette Mockup */}
                <div className="p-3.5 rounded-2xl bg-[#090b10] border border-zinc-800/80 space-y-2 font-mono text-xs">
                    <div className="px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between text-zinc-300">
                        <span className="text-purple-400 flex items-center gap-2">
                            <span>⌘1</span>
                            <span className="text-zinc-200">Insert PostgreSQL DB</span>
                        </span>
                        <span className="text-[10px] text-zinc-500">DATABASE</span>
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-zinc-900/50 border border-transparent flex items-center justify-between text-zinc-400">
                        <span className="flex items-center gap-2">
                            <span className="text-zinc-600">⌘2</span>
                            <span>Insert Redis Cache</span>
                        </span>
                        <span className="text-[10px] text-zinc-600">CACHE</span>
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-emerald-300">
                        <span className="flex items-center gap-2">
                            <span>⌘S</span>
                            <span>Simulate Request Flow</span>
                        </span>
                        <span className="text-[10px] text-emerald-400">LIVE</span>
                    </div>
                </div>
            </div>

            {/* Bento Card 3: Mermaid.js Markdown Engine (Span 1) */}
            <div className="rounded-3xl p-7 bg-zinc-900/50 border border-zinc-800/80 hover:border-emerald-500/40 transition-all shadow-xl backdrop-blur-xl relative overflow-hidden group flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 w-fit">
                            <FileCode2 className="w-5 h-5" />
                        </div>
                        <button
                            onClick={handleCopyMermaid}
                            className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
                        >
                            {copiedMermaid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedMermaid ? "Copied" : "Copy"}</span>
                        </button>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                        1-Click Mermaid.js Export
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                        Convert canvas shapes into markdown flowcharts. Paste directly into GitHub pull requests and architecture wikis.
                    </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090b10] border border-zinc-800/80 font-mono text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
                    <span className="text-purple-400">flowchart LR</span><br />
                    &nbsp;&nbsp;client[<span className="text-emerald-400">&quot;Next.js Client&quot;</span>] --&gt; proxy[<span className="text-emerald-400">&quot;L7 Proxy&quot;</span>]<br />
                    &nbsp;&nbsp;proxy --&gt; ws[<span className="text-emerald-400">&quot;WS Server (:8080)&quot;</span>]<br />
                    &nbsp;&nbsp;ws --&gt; db[(<span className="text-cyan-400">&quot;PostgreSQL DB&quot;</span>)]
                </div>
            </div>

            {/* Bento Card 4: Multiplayer Engine & Write-Behind Queue (Span 2) */}
            <div className="md:col-span-2 rounded-3xl p-7 bg-zinc-900/50 border border-zinc-800/80 hover:border-indigo-500/40 transition-all shadow-xl backdrop-blur-xl relative overflow-hidden group flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 blur-3xl pointer-events-none rounded-full" />

                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 w-fit">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            Multiplayer Infrastructure
                        </span>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                        Low-Latency WebSocket Multiplexer with Write-Behind Buffer
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-xl mb-6">
                        VectorCraft doesn&apos;t hammer the database per stroke. Shapes broadcast to peer browsers in <strong>&lt; 15ms</strong>, then enter an <strong>in-memory write-behind queue</strong> that flushes in batches of 30 every 1.5s—reducing DB write pressure by 93%.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[#090b10] border border-zinc-800/80">
                        <div className="text-[10px] uppercase font-mono text-zinc-500 mb-1">Cursor Smoothing</div>
                        <div className="text-base font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>60 FPS LERP</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">Linear interpolation eliminates cursor jitter</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#090b10] border border-zinc-800/80">
                        <div className="text-[10px] uppercase font-mono text-zinc-500 mb-1">Persistence Buffer</div>
                        <div className="text-base font-bold text-cyan-400 flex items-center gap-1.5">
                            <Radio className="w-3.5 h-3.5" />
                            <span>30 Shapes / 1.5s</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">Drains asynchronously to PostgreSQL</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#090b10] border border-zinc-800/80">
                        <div className="text-[10px] uppercase font-mono text-zinc-500 mb-1">DoS Security</div>
                        <div className="text-base font-bold text-amber-400 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" />
                            <span>512 KB Ceiling</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">Rejects oversized attack payloads</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
