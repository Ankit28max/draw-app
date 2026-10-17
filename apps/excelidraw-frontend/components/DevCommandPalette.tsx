"use client";

import { useEffect, useState, useRef } from "react";
import {
    Database,
    Zap,
    Cpu,
    Radio,
    Terminal,
    Globe,
    FileCode2,
    Download,
    Share2,
    RotateCcw,
    Trash2,
    Search,
    X,
    Check,
    Boxes
} from "lucide-react";
import { Game } from "@/draw/Game";

interface DevCommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    game: Game | null;
}

interface CommandItem {
    id: string;
    title: string;
    description: string;
    category: "Architecture Components" | "Dev Exports" | "Canvas Actions";
    icon: any;
    color: string;
    shortcut?: string;
    action: () => void;
}

export function DevCommandPalette({ isOpen, onClose, game }: DevCommandPaletteProps) {
    const [search, setSearch] = useState("");
    const [copiedMsg, setCopiedMsg] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const showToast = (msg: string) => {
        setCopiedMsg(msg);
        setTimeout(() => setCopiedMsg(null), 2500);
    };

    const commands: CommandItem[] = [
        // 1. Architecture Components
        {
            id: "comp-db",
            title: "Insert PostgreSQL Schema Node",
            description: "Table entity with Primary Key, columns and data types",
            category: "Architecture Components",
            icon: Database,
            color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
            shortcut: "⌘1",
            action: () => {
                game?.insertTechComponent("database");
                onClose();
            },
        },
        {
            id: "comp-redis",
            title: "Insert Redis In-Memory Cache Node",
            description: "Cache instance with TTL, LRU eviction and session store",
            category: "Architecture Components",
            icon: Zap,
            color: "text-red-400 bg-red-500/10 border-red-500/30",
            shortcut: "⌘2",
            action: () => {
                game?.insertTechComponent("redis");
                onClose();
            },
        },
        {
            id: "comp-gateway",
            title: "Insert API Gateway / Microservice",
            description: "REST and WebSocket routing service layer",
            category: "Architecture Components",
            icon: Cpu,
            color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
            shortcut: "⌘3",
            action: () => {
                game?.insertTechComponent("service");
                onClose();
            },
        },
        {
            id: "comp-kafka",
            title: "Insert Kafka / Event Bus Queue",
            description: "Message streaming broker with partition definitions",
            category: "Architecture Components",
            icon: Radio,
            color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
            shortcut: "⌘4",
            action: () => {
                game?.insertTechComponent("queue");
                onClose();
            },
        },
        {
            id: "comp-terminal",
            title: "Insert Terminal / Code Snippet Node",
            description: "Dark code editor block with monospace syntax highlighting",
            category: "Architecture Components",
            icon: Terminal,
            color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
            shortcut: "⌘5",
            action: () => {
                game?.insertTechComponent("terminal");
                onClose();
            },
        },
        {
            id: "comp-client",
            title: "Insert Next.js Frontend Client",
            description: "Web application UI client tier",
            category: "Architecture Components",
            icon: Globe,
            color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
            shortcut: "⌘6",
            action: () => {
                game?.insertTechComponent("client");
                onClose();
            },
        },

        // 2. Dev Exports
        {
            id: "export-mermaid",
            title: "Copy as Mermaid.js Markdown",
            description: "Translate canvas diagram to GitHub-compatible ```mermaid flow",
            category: "Dev Exports",
            icon: FileCode2,
            color: "text-pink-400 bg-pink-500/10 border-pink-500/30",
            shortcut: "⌘M",
            action: () => {
                if (game) {
                    const code = game.exportMermaid();
                    navigator.clipboard.writeText(code);
                    showToast("Copied Mermaid.js diagram to clipboard!");
                }
            },
        },
        {
            id: "export-svg",
            title: "Export as Scalable Vector (SVG)",
            description: "Crisp resolution-independent vector graphic for docs",
            category: "Dev Exports",
            icon: Share2,
            color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
            action: () => {
                game?.exportSvg();
                onClose();
            },
        },
        {
            id: "export-png",
            title: "Export as High-Res PNG",
            description: "Crisp obsidian background with dot matrix grid",
            category: "Dev Exports",
            icon: Download,
            color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
            action: () => {
                game?.exportImage();
                onClose();
            },
        },
        {
            id: "export-json",
            title: "Export Diagram as JSON AST",
            description: "Full state backup for version control or import",
            category: "Dev Exports",
            icon: Boxes,
            color: "text-teal-400 bg-teal-500/10 border-teal-500/30",
            action: () => {
                game?.exportJson();
                onClose();
            },
        },

        // 3. Canvas Actions
        {
            id: "act-reset",
            title: "Reset Viewport & Zoom",
            description: "Center camera and reset zoom to 100%",
            category: "Canvas Actions",
            icon: RotateCcw,
            color: "text-zinc-400 bg-zinc-800 border-zinc-700",
            shortcut: "0",
            action: () => {
                game?.resetZoom();
                onClose();
            },
        },
        {
            id: "act-clear",
            title: "Wipe Canvas State",
            description: "Broadcast canvas clear event to all peers",
            category: "Canvas Actions",
            icon: Trash2,
            color: "text-red-400 bg-red-500/10 border-red-500/30",
            action: () => {
                if (confirm("Are you sure you want to clear the entire whiteboard?")) {
                    game?.clearRoom();
                    onClose();
                }
            },
        },
    ];

    const filtered = commands.filter(
        (c) =>
            c.title.toLowerCase().includes(search.toLowerCase()) ||
            c.description.toLowerCase().includes(search.toLowerCase()) ||
            c.category.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) {
            setSearch("");
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === "Escape") {
                onClose();
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
            } else if (e.key === "Enter" && filtered[selectedIndex]) {
                e.preventDefault();
                filtered[selectedIndex]?.action();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, filtered, selectedIndex]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-2xl rounded-2xl bg-[#0f1117] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
                {/* Search Bar Header */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800/80 bg-zinc-900/40">
                    <Search className="w-5 h-5 text-zinc-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder="Search dev tools, architecture nodes, exports (Mermaid, SVG)..."
                        className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-100 placeholder-zinc-500"
                    />
                    <div className="flex items-center gap-1.5">
                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            ESC
                        </kbd>
                        <button
                            onClick={onClose}
                            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Toast Notification */}
                {copiedMsg && (
                    <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 flex items-center justify-between text-xs text-emerald-400">
                        <span className="flex items-center gap-1.5 font-medium">
                            <Check className="w-4 h-4 text-emerald-400" />
                            {copiedMsg}
                        </span>
                        <span className="text-[10px] text-zinc-400">Ready to paste into GitHub README or Notion</span>
                    </div>
                )}

                {/* Commands List */}
                <div className="overflow-y-auto flex-1 p-2 space-y-1 divide-y divide-zinc-800/40">
                    {filtered.length === 0 ? (
                        <div className="py-12 text-center text-zinc-500 text-sm">
                            No developer commands found for "{search}"
                        </div>
                    ) : (
                        filtered.map((item, index) => {
                            const Icon = item.icon;
                            const isSelected = index === selectedIndex;
                            return (
                                <button
                                    key={item.id}
                                    onClick={item.action}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all ${
                                        isSelected
                                            ? "bg-blue-600/15 border border-blue-500/30 text-white"
                                            : "hover:bg-zinc-900/60 text-zinc-300 border border-transparent"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg border ${item.color}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold flex items-center gap-2">
                                                <span>{item.title}</span>
                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-normal">
                                                    {item.category}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-zinc-400 mt-0.5">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>

                                    {item.shortcut && (
                                        <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/80">
                                            {item.shortcut}
                                        </kbd>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer Cheatsheet */}
                <div className="px-4 py-2.5 bg-zinc-900/60 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                    <div className="flex items-center gap-3 font-mono">
                        <span>↑↓ to navigate</span>
                        <span>↵ to run</span>
                        <span>esc to close</span>
                    </div>
                    <span className="font-semibold text-blue-400 flex items-center gap-1">
                        <Terminal className="w-3.5 h-3.5" />
                        VectorCraft Dev Tools
                    </span>
                </div>
            </div>
        </div>
    );
}
