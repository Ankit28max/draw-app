"use client";

import { Check, X, Sparkles, Zap, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";

export function LandingComparison() {
    const comparisons = [
        {
            feature: "Live Request Flow Simulation",
            description: "Animated glowing vector packets with real-time latency badges along connectors",
            vectorcraft: true,
            others: false,
            highlight: "60 FPS Particle Track",
        },
        {
            feature: "Native System Design Primitives",
            description: "Dedicated nodes for AWS EC2, PostgreSQL DBs, L7 Proxies, Redis, and Kafka",
            vectorcraft: true,
            others: false,
            highlight: "Typed Architecture Nodes",
        },
        {
            feature: "Dynamic Attached Connectors",
            description: "Moving any node automatically translates attached incoming and outgoing arrows",
            vectorcraft: true,
            others: "Partial / Breaks",
            highlight: "Zero Broken Wiring",
        },
        {
            feature: "⌘K Developer Command Palette",
            description: "Full keyboard navigation to insert schemas, load HLD templates, or trigger simulation",
            vectorcraft: true,
            others: false,
            highlight: "Keyboard-Driven",
        },
        {
            feature: "1-Click Mermaid.js Markdown Export",
            description: "Export clean flowchart syntax ready to paste into GitHub PRs and markdown wikis",
            vectorcraft: true,
            others: false,
            highlight: "Instant PR Docs",
        },
        {
            feature: "Write-Behind Persistence Buffer",
            description: "Absorbs 500 strokes/sec, batching DB writes to cut database pressure by 93%",
            vectorcraft: true,
            others: false,
            highlight: "Zero DB Exhaustion",
        },
        {
            feature: "Open Source & Monorepo Architecture",
            description: "Next.js 15, Turborepo, Prisma, and WebSockets with zero mandatory account lock-in",
            vectorcraft: true,
            others: false,
            highlight: "Self-Hostable",
        },
    ];

    return (
        <section className="py-24 relative overflow-hidden">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-blue-400 mb-2">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Built Different</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                        Why Engineers Choose VectorCraft
                    </h2>
                    <p className="mt-3 text-zinc-400 text-sm sm:text-base">
                        Standard whiteboards treat architecture like static drawings. VectorCraft treats systems like living, running software.
                    </p>
                </div>

                {/* Modern Comparison Table */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl overflow-hidden shadow-2xl">
                    <div className="grid grid-cols-12 px-6 py-4 bg-zinc-900/60 border-b border-zinc-800 text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
                        <div className="col-span-6 sm:col-span-7">Capability</div>
                        <div className="col-span-3 sm:col-span-3 text-center text-blue-400">VectorCraft</div>
                        <div className="col-span-3 sm:col-span-2 text-center text-zinc-500">Generic Whiteboards</div>
                    </div>

                    <div className="divide-y divide-zinc-800/60">
                        {comparisons.map((item, idx) => (
                            <div
                                key={idx}
                                className="grid grid-cols-12 px-6 py-4 items-center hover:bg-zinc-900/40 transition-colors"
                            >
                                <div className="col-span-6 sm:col-span-7 pr-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-white">{item.feature}</span>
                                        <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            {item.highlight}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>

                                <div className="col-span-3 sm:col-span-3 flex items-center justify-center">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                        <Check className="w-4 h-4" />
                                    </div>
                                </div>

                                <div className="col-span-3 sm:col-span-2 flex items-center justify-center">
                                    {typeof item.others === "string" ? (
                                        <span className="text-[11px] font-mono text-amber-400/80">
                                            {item.others}
                                        </span>
                                    ) : item.others ? (
                                        <Check className="w-4 h-4 text-zinc-400" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-zinc-800/60 flex items-center justify-center text-zinc-500">
                                            <X className="w-3.5 h-3.5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="px-6 py-4 bg-zinc-900/30 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                        <span className="text-zinc-400 font-mono">
                            ⚡ Zero setup required. Test live in an instant room.
                        </span>
                        <Link
                            href="/canvas/1"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                        >
                            <span>Launch Free Workspace</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
