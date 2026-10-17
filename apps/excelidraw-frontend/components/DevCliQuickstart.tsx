"use client";

import { useState } from "react";
import { Terminal, Copy, Check, Sparkles, ChevronRight } from "lucide-react";

export function DevCliQuickstart() {
    const [manager, setManager] = useState<"npx" | "pnpm" | "docker" | "curl">("npx");
    const [copied, setCopied] = useState(false);

    const commands: Record<string, string> = {
        npx: "npx create-vectorcraft-room my-distributed-system",
        pnpm: "pnpm dlx create-vectorcraft-room my-distributed-system",
        docker: "docker run -p 3000:3000 -p 8080:8080 ghcr.io/ankit28max/vectorcraft:latest",
        curl: "curl -fsSL https://vectorcraft.dev/install.sh | bash",
    };

    const handleCopy = () => {
        if (typeof navigator !== "undefined") {
            navigator.clipboard.writeText(commands[manager] || "");
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto mt-6">
            <div className="rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-2xl backdrop-blur-xl overflow-hidden">
                {/* Header with Manager Switcher */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/70 border-b border-zinc-800/80 text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                        <span className="ml-2 text-zinc-400 font-medium hidden sm:inline">vectorcraft-cli</span>
                    </div>

                    <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                        {(["npx", "pnpm", "docker", "curl"] as const).map((key) => (
                            <button
                                key={key}
                                onClick={() => setManager(key)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                                    manager === key
                                        ? "bg-blue-600 text-white font-semibold shadow-sm"
                                        : "text-zinc-400 hover:text-white"
                                }`}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Command Line Terminal Body */}
                <div className="flex items-center justify-between px-4 py-3.5 font-mono text-xs sm:text-sm">
                    <div className="flex items-center gap-2 overflow-x-auto text-zinc-200">
                        <span className="text-blue-400 select-none">$</span>
                        <span className="text-zinc-100 whitespace-nowrap">{commands[manager]}</span>
                    </div>

                    <button
                        onClick={handleCopy}
                        className="ml-3 shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 transition-colors cursor-pointer text-xs"
                        title="Copy command"
                    >
                        {copied ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-medium">Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                                <span className="text-zinc-300">Copy</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Footer Subtext */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-zinc-900/40 border-t border-zinc-800/60 text-[11px] font-mono text-zinc-400">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Instant Multi-Tenant Room Hub • 0 Config • TypeScript Monorepo</span>
                    </div>
                    <span className="text-zinc-500">Self-hostable with PostgreSQL & Node.js 20+</span>
                </div>
            </div>
        </div>
    );
}
