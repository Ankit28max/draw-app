import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import {
    Pencil,
    Share2,
    Users2,
    Sparkles,
    ArrowRight,
    Layers,
    Cpu,
    Boxes,
    Compass,
    Database,
    Zap,
    Download,
    Terminal,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { RoomJoinSection } from "@/components/RoomJoinSection";
import { UserNav } from "@/components/UserNav";
import { InteractiveHeroCanvas } from "@/components/InteractiveHeroCanvas";

export default function Home() {
    return (
        <div className="min-h-screen bg-[#07080b] text-zinc-100 flex flex-col justify-between selection:bg-blue-500/30 selection:text-blue-200">
            {/* Background Ambient Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-600/15 via-purple-600/10 to-transparent blur-[120px] rounded-full" />
                <div className="absolute top-[40%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 blur-[140px] rounded-full" />
                <div className="absolute top-[60%] right-[-10%] w-[500px] h-[500px] bg-purple-500/5 blur-[140px] rounded-full" />
            </div>

            {/* Header Navigation */}
            <header className="border-b border-white/5 backdrop-blur-xl sticky top-0 z-40 bg-[#07080b]/80">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight group">
                        <span className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                            <Layers className="w-4 h-4" />
                        </span>
                        <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                            VectorCraft
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            v2.0
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#templates" className="hover:text-white transition-colors">Templates</a>
                        <a href="#shortcuts" className="hover:text-white transition-colors">Shortcuts</a>
                        <Link href="/canvas/demo-architecture" className="hover:text-blue-400 transition-colors">Live Canvas</Link>
                    </div>

                    <UserNav />
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 z-10">
                <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
                        {/* Live Pill Badge */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium mb-8 shadow-inner shadow-blue-500/20">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                            <span>Real-Time WebSocket Engine • &lt; 15ms Latency</span>
                        </div>

                        {/* Hero Headline */}
                        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
                            The Dev-First Infinite Canvas for{" "}
                            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent block sm:inline">
                                Modern Teams
                            </span>
                        </h1>

                        <p className="mx-auto max-w-2xl text-base sm:text-lg text-zinc-400 leading-relaxed mb-8">
                            Diagram microservices, database schemas, and cloud architectures.
                            Featuring live multiplayer cursors, <strong>⌘K developer palette</strong>, instant <strong>Mermaid.js markdown export</strong>, and smart magnetic connectors.
                        </p>

                        {/* Room Quick Launch Input */}
                        <RoomJoinSection />

                        {/* Interactive Hero Canvas Preview */}
                        <div className="mt-14 sm:mt-16">
                            <InteractiveHeroCanvas />
                        </div>
                    </div>
                </section>

                {/* Templates Quick-Start Section */}
                <section id="templates" className="py-20 bg-zinc-950/40 border-y border-white/5 relative">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-2xl mx-auto mb-14">
                            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-blue-400 mb-2">
                                <Boxes className="w-3.5 h-3.5" />
                                <span>Starter Kits</span>
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                                Launch from Pre-Built Templates
                            </h2>
                            <p className="mt-2 text-zinc-400 text-sm sm:text-base">
                                Jumpstart diagrams with instant architectural and brainstorming layouts.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                            {/* Template 1 */}
                            <Link href="/canvas/architecture-template" className="group">
                                <div className="h-full p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-900 transition-all shadow-lg flex flex-col justify-between">
                                    <div>
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
                                            <Cpu className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                                            System Architecture
                                        </h3>
                                        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                                            Microservices, API Gateways, Load Balancers, and Kafka queues.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-medium text-blue-400">
                                        <span>Use Template</span>
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>

                            {/* Template 2 */}
                            <Link href="/canvas/database-template" className="group">
                                <div className="h-full p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-purple-500/50 hover:bg-zinc-900 transition-all shadow-lg flex flex-col justify-between">
                                    <div>
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                                            <Database className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                                            Database Schema
                                        </h3>
                                        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                                            Entity relationship tables, keys, and foreign relation lines.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-medium text-purple-400">
                                        <span>Use Template</span>
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>

                            {/* Template 3 */}
                            <Link href="/canvas/userflow-template" className="group">
                                <div className="h-full p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all shadow-lg flex flex-col justify-between">
                                    <div>
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                                            <Compass className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                                            User Journey Flow
                                        </h3>
                                        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                                            Onboarding flows, decision diamonds, and funnel steps.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-medium text-emerald-400">
                                        <span>Use Template</span>
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>

                            {/* Template 4 */}
                            <Link href="/canvas/sprint-brainstorm" className="group">
                                <div className="h-full p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-900 transition-all shadow-lg flex flex-col justify-between">
                                    <div>
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                                            Sprint Brainstorm
                                        </h3>
                                        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                                            Sticky notes, retro boards, priorities, and action items.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-medium text-amber-400">
                                        <span>Use Template</span>
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-24">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-2xl mx-auto mb-16">
                            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-indigo-400 mb-2">
                                <Zap className="w-3.5 h-3.5" />
                                <span>Built For Engineers</span>
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                                Everything you need to architect ideas
                            </h2>
                            <p className="mt-3 text-zinc-400">
                                High-performance 60 FPS HTML5 Canvas engine powered by WebSockets with LERP cursor interpolation.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            <Card className="p-7 rounded-3xl bg-zinc-900/50 border border-zinc-800 hover:border-blue-500/40 transition-all shadow-xl">
                                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 w-fit mb-5">
                                    <Terminal className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">⌘K Developer Command Palette</h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    Keyboard-driven workflow. Hit <strong>⌘K</strong> to instantly drop pre-configured PostgreSQL schemas, Redis caches, Kafka topics, or API Gateways directly on the canvas.
                                </p>
                            </Card>

                            <Card className="p-7 rounded-3xl bg-zinc-900/50 border border-zinc-800 hover:border-purple-500/40 transition-all shadow-xl">
                                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 w-fit mb-5">
                                    <Boxes className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Copy as Mermaid.js Markdown</h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    Translate whiteboard diagrams into clean, executable Mermaid.js flowchart syntax with one click. Ready to paste straight into GitHub PR descriptions and docs.
                                </p>
                            </Card>

                            <Card className="p-7 rounded-3xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/40 transition-all shadow-xl">
                                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 w-fit mb-5">
                                    <Download className="h-6 w-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Scalable SVG & PNG Vectors</h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    Export crisp resolution-independent SVGs for documentation and high-resolution PNGs on a dark dot matrix canvas, or backup canvas state as JSON.
                                </p>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Keyboard Shortcuts Section */}
                <section id="shortcuts" className="py-16 bg-zinc-950/60 border-t border-white/5">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
                        <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-zinc-400 mb-2">
                            <span>Productivity</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8">
                            Speed Through Diagrams with Keyboard Shortcuts
                        </h2>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                                <span className="text-xs text-zinc-300">Select & Move</span>
                                <kbd className="px-2 py-1 text-xs font-mono bg-zinc-800 text-blue-400 rounded border border-zinc-700">V</kbd>
                            </div>
                            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                                <span className="text-xs text-zinc-300">Rectangle</span>
                                <kbd className="px-2 py-1 text-xs font-mono bg-zinc-800 text-blue-400 rounded border border-zinc-700">R</kbd>
                            </div>
                            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                                <span className="text-xs text-zinc-300">Circle</span>
                                <kbd className="px-2 py-1 text-xs font-mono bg-zinc-800 text-blue-400 rounded border border-zinc-700">C</kbd>
                            </div>
                            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                                <span className="text-xs text-zinc-300">Arrow / Vector</span>
                                <kbd className="px-2 py-1 text-xs font-mono bg-zinc-800 text-blue-400 rounded border border-zinc-700">A</kbd>
                            </div>
                            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                                <span className="text-xs text-zinc-300">Text & Notes</span>
                                <kbd className="px-2 py-1 text-xs font-mono bg-zinc-800 text-blue-400 rounded border border-zinc-700">T</kbd>
                            </div>
                            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                                <span className="text-xs text-zinc-300">Pencil / Freehand</span>
                                <kbd className="px-2 py-1 text-xs font-mono bg-zinc-800 text-blue-400 rounded border border-zinc-700">P</kbd>
                            </div>
                            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
                                <span className="text-xs text-zinc-300">Eraser</span>
                                <kbd className="px-2 py-1 text-xs font-mono bg-zinc-800 text-blue-400 rounded border border-zinc-700">E</kbd>
                            </div>
                            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/40 flex items-center justify-between col-span-2 sm:col-span-2">
                                <span className="text-xs text-blue-300 font-semibold flex items-center gap-1.5">
                                    <Terminal className="w-3.5 h-3.5" />
                                    Dev Command Palette & Tech Nodes
                                </span>
                                <kbd className="px-2 py-1 text-xs font-mono bg-blue-900/60 text-blue-300 rounded border border-blue-500/40">⌘ + K</kbd>
                            </div>
                            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between col-span-2 sm:col-span-2">
                                <span className="text-xs text-zinc-300">Copy as Mermaid.js</span>
                                <kbd className="px-2 py-1 text-xs font-mono bg-zinc-800 text-purple-400 rounded border border-zinc-700">⌘ + M</kbd>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final Call to Action */}
                <section className="py-20">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                        <div className="relative rounded-3xl p-10 sm:p-14 bg-gradient-to-tr from-blue-900/40 via-zinc-900 to-indigo-900/30 border border-blue-500/30 text-center shadow-2xl overflow-hidden">
                            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                                Ready to sketch your next system?
                            </h2>
                            <p className="mx-auto mt-4 max-w-lg text-sm sm:text-base text-zinc-300">
                                No credit card. No mandatory sign up. Jump straight into an infinite canvas and share the link with your team.
                            </p>
                            <div className="mt-8 flex flex-wrap justify-center gap-4">
                                <Link href="/canvas/1">
                                    <Button size="lg" className="h-12 px-8 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/25 cursor-pointer">
                                        Launch Instant Whiteboard
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                                <Link href="/signup">
                                    <Button size="lg" variant="outline" className="h-12 px-6 text-sm font-medium border-zinc-700 bg-zinc-900/80 text-zinc-200 hover:text-white rounded-xl cursor-pointer">
                                        Create Free Account
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-8 bg-[#050608] z-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-300">VectorCraft</span>
                        <span>•</span>
                        <span>The Modern Collaborative Whiteboard</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/canvas/1" className="hover:text-zinc-300 transition-colors">Default Room</Link>
                        <Link href="/signin" className="hover:text-zinc-300 transition-colors">Sign In</Link>
                        <Link href="/signup" className="hover:text-zinc-300 transition-colors">Sign Up</Link>
                        <a href="https://github.com/Ankit28max/draw-app" target="_blank" rel="noreferrer" className="hover:text-zinc-300 transition-colors">
                            GitHub
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}