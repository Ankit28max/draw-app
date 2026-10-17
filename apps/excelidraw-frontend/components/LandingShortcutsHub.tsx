"use client";

import { useState } from "react";
import { Terminal, Move, MousePointer, Search, Sparkles } from "lucide-react";

interface ShortcutItem {
    name: string;
    description: string;
    keys: string[];
    category: "Drawing" | "Developer" | "Navigation";
}

export function LandingShortcutsHub() {
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [search, setSearch] = useState("");

    const shortcuts: ShortcutItem[] = [
        { name: "Dev Command Palette", description: "Insert schemas, cloud nodes & templates", keys: ["⌘", "K"], category: "Developer" },
        { name: "Simulate Request Flow", description: "Toggle animated telemetry packets along arrows", keys: ["⌘", "S"], category: "Developer" },
        { name: "Copy as Mermaid.js", description: "Export flowchart markdown to clipboard", keys: ["⌘", "M"], category: "Developer" },
        { name: "Select & Move Tool", description: "Reposition shapes with attached arrow dragging", keys: ["V"], category: "Drawing" },
        { name: "Arrow / Vector Tool", description: "Draw magnetic connector with cardinal port snapping", keys: ["A"], category: "Drawing" },
        { name: "Rectangle / Box", description: "Bounded container block", keys: ["R"], category: "Drawing" },
        { name: "Circle / Ellipse", description: "Circular entity / token node", keys: ["C"], category: "Drawing" },
        { name: "Text & Notes", description: "Inline multi-line markdown annotation", keys: ["T"], category: "Drawing" },
        { name: "Pencil / Freehand", description: "High-speed freehand sketching with stroke smoothing", keys: ["P"], category: "Drawing" },
        { name: "Eraser Tool", description: "Vector shape deletion on click/drag", keys: ["E"], category: "Drawing" },
        { name: "Pan Hand Tool", description: "Hold Spacebar or middle click to pan infinite canvas", keys: ["Space", "Drag"], category: "Navigation" },
        { name: "Zoom In / Out", description: "Mouse wheel or pinch to zoom from 0.1x to 8.0x", keys: ["Wheel"], category: "Navigation" },
    ];

    const filtered = shortcuts.filter((s) => {
        const matchesCategory = selectedCategory === "All" || s.category === selectedCategory;
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.description.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <section id="shortcuts" className="py-20 bg-zinc-950/60 border-t border-white/5 relative">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
                    <div>
                        <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-indigo-400 mb-2">
                            <Terminal className="w-3.5 h-3.5" />
                            <span>Efficiency</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                            Engineered for Keyboard Velocity
                        </h2>
                        <p className="mt-2 text-zinc-400 text-sm max-w-lg">
                            Never break flow state. Every drawing tool, architectural preset, and export pipeline is bound to ergonomic key combinations.
                        </p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900 border border-zinc-800 self-start sm:self-auto">
                        {["All", "Developer", "Drawing", "Navigation"].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                                    selectedCategory === cat
                                        ? "bg-blue-600 text-white shadow"
                                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Shortcuts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filtered.map((item, idx) => (
                        <div
                            key={idx}
                            className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                                item.category === "Developer"
                                    ? "bg-blue-950/20 border-blue-500/30 hover:border-blue-500/60 shadow-lg shadow-blue-500/5"
                                    : "bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 shadow-md"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <div>
                                    <div className="font-semibold text-sm text-white flex items-center gap-2">
                                        <span>{item.name}</span>
                                        {item.category === "Developer" && (
                                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                                                Dev
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-zinc-800/60">
                                {item.keys.map((k, kIdx) => (
                                    <kbd
                                        key={kIdx}
                                        className="px-2 py-1 text-xs font-mono font-bold bg-zinc-950 text-zinc-200 rounded-lg border border-zinc-700 shadow-inner"
                                    >
                                        {k}
                                    </kbd>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
