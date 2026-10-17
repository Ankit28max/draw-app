import { Button } from "@repo/ui/button";
import {
    ArrowRight,
    Layers,
    Cpu,
    Compass,
    Database,
    Zap,
    GitBranch,
    ArrowUpRight,
    Play,
    Code2,
    Shield
} from "lucide-react";
import Link from "next/link";
import { RoomJoinSection } from "@/components/RoomJoinSection";
import { UserNav } from "@/components/UserNav";
import { InteractiveHeroCanvas } from "@/components/InteractiveHeroCanvas";

export default function Home() {
    return (
        <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col justify-between selection:bg-blue-500/30 selection:text-blue-200">
            {/* Minimal Header */}
            <header className="border-b border-zinc-800/80 sticky top-0 z-40 bg-[#090a0f]/90 backdrop-blur-md">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
                    {/* Brand */}
                    <Link href="/" className="flex items-center gap-2.5 font-bold text-sm tracking-tight group">
                        <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/20 group-hover:bg-blue-500 transition-colors">
                            <Layers className="w-4 h-4" />
                        </span>
                        <span className="text-white font-semibold">VectorCraft</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            v2.0
                        </span>
                    </Link>

                    {/* Nav Links */}
                    <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-zinc-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#templates" className="hover:text-white transition-colors">Templates</a>
                        <Link href="/canvas/hld-this-app" className="hover:text-blue-400 transition-colors flex items-center gap-1">
                            <span>Architecture</span>
                            <ArrowUpRight className="w-3 h-3 text-zinc-500" />
                        </Link>
                    </nav>

                    {/* Right Controls */}
                    <div className="flex items-center gap-3">
                        <a
                            href="https://github.com/Ankit28max/draw-app"
                            target="_blank"
                            rel="noreferrer"
                            className="text-zinc-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
                            title="GitHub Repository"
                        >
                            <GitBranch className="w-4 h-4" />
                        </a>
                        <Link
                            href="/canvas/1"
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                        >
                            <span>Open Canvas</span>
                        </Link>
                        <UserNav />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 z-10">
                {/* 1. Hero Section */}
                <section className="pt-12 pb-14 sm:pt-16 sm:pb-16 border-b border-zinc-800/60">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
                        {/* Status Tag */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-300 text-xs font-medium mb-6">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span>System design and architecture whiteboard</span>
                        </div>

                        {/* Direct, Honest Headline */}
                        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight mb-4">
                            System architecture diagrams,
                            <span className="block text-zinc-400 mt-1">made simple and collaborative.</span>
                        </h1>

                        <p className="mx-auto max-w-2xl text-sm sm:text-base text-zinc-400 leading-relaxed mb-8">
                            An infinite whiteboard built for engineering teams. Sketch distributed systems with real architecture shapes, simulate request flows, and export to Mermaid.js or PNG in one click.
                        </p>

                        {/* Room Launch Input */}
                        <RoomJoinSection />

                        {/* Quick Template Links */}
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500">
                            <span>Or explore:</span>
                            <Link href="/canvas/hld-this-app" className="text-blue-400 hover:underline">
                                VectorCraft Architecture
                            </Link>
                            <span>•</span>
                            <Link href="/canvas/hld-event-streaming" className="text-zinc-300 hover:underline">
                                Uber Ride Matching
                            </Link>
                            <span>•</span>
                            <Link href="/canvas/hld-url-shortener" className="text-zinc-300 hover:underline">
                                TinyURL HLD
                            </Link>
                        </div>

                        {/* Interactive Hero Canvas */}
                        <div className="mt-10 sm:mt-12 rounded-2xl overflow-hidden border border-zinc-800 shadow-xl bg-zinc-950">
                            <InteractiveHeroCanvas />
                        </div>
                    </div>
                </section>

                {/* 2. Core Capabilities (3 Focused Columns) */}
                <section id="features" className="py-16 sm:py-20 border-b border-zinc-800/60">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
                        <div className="text-center max-w-xl mx-auto mb-12">
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                Built for technical design
                            </h2>
                            <p className="mt-2 text-zinc-400 text-xs sm:text-sm">
                                Practical features for distributed systems modeling and whiteboard interviews.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Feature 1 */}
                            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                                    <Database className="w-4 h-4" />
                                </div>
                                <h3 className="font-semibold text-white text-base mb-2">Real System Shapes</h3>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    3D database cylinders, EC2 instances, server racks, and gateway routers. Labels and specs scale with shape resize, and connected arrows stay locked to cardinal ports.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                                    <Play className="w-4 h-4" />
                                </div>
                                <h3 className="font-semibold text-white text-base mb-2">Live Request Flow</h3>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    Animate request packets along connectors with real-time latency indicators. Demonstrate happy paths, caching hits, and database queries during architecture reviews.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                                    <Code2 className="w-4 h-4" />
                                </div>
                                <h3 className="font-semibold text-white text-base mb-2">1-Click Mermaid.js</h3>
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    Convert drawn diagrams into standard Mermaid.js markdown syntax. Paste directly into GitHub pull requests, architecture RFCs, and engineering wikis.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Architecture Starter Templates */}
                <section id="templates" className="py-16 sm:py-20 border-b border-zinc-800/60">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
                        <div className="text-center max-w-xl mx-auto mb-10">
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                                Architecture Templates
                            </h2>
                            <p className="mt-2 text-zinc-400 text-xs sm:text-sm">
                                Pre-wired system design topologies ready to inspect and edit.
                            </p>
                        </div>

                        {/* Featured Live Template: VectorCraft Architecture */}
                        <div className="mb-5">
                            <Link href="/canvas/hld-this-app" className="group block">
                                <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/70 border border-blue-500/40 hover:border-blue-400 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold uppercase">
                                                Featured Template
                                            </span>
                                            <span className="text-xs text-zinc-400">Live Web App</span>
                                        </div>
                                        <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                                            VectorCraft Architecture (This App)
                                        </h3>
                                        <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                                            Next.js 15 Client ➔ L7 Edge Proxy ➔ WebSocket Server (:8080) &amp; HTTP Backend (:3001) ➔ Write-Behind Buffer ➔ PostgreSQL.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shrink-0 transition-colors">
                                        <span>Open Template</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* 4 Standard Templates Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Uber */}
                            <Link href="/canvas/hld-event-streaming" className="group">
                                <div className="h-full p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col justify-between">
                                    <div>
                                        <div className="text-[10px] uppercase font-mono text-zinc-400 mb-1">HLD Template</div>
                                        <h4 className="font-semibold text-white text-sm group-hover:text-blue-400 transition-colors">
                                            Uber Ride Matching
                                        </h4>
                                        <p className="text-xs text-zinc-400 mt-1">
                                            Envoy, Kafka broker, Redis Geo H3 spatial index, and Sharded DB.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs text-blue-400">
                                        <span>Open</span>
                                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </Link>

                            {/* TinyURL */}
                            <Link href="/canvas/hld-url-shortener" className="group">
                                <div className="h-full p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col justify-between">
                                    <div>
                                        <div className="text-[10px] uppercase font-mono text-zinc-400 mb-1">HLD Template</div>
                                        <h4 className="font-semibold text-white text-sm group-hover:text-blue-400 transition-colors">
                                            TinyURL Shortener
                                        </h4>
                                        <p className="text-xs text-zinc-400 mt-1">
                                            Cloudflare CDN, Base62 ID Core, Redis L1 Cache, and Async Analytics.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs text-blue-400">
                                        <span>Open</span>
                                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </Link>

                            {/* Sagas */}
                            <Link href="/canvas/lld-state-machine" className="group">
                                <div className="h-full p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col justify-between">
                                    <div>
                                        <div className="text-[10px] uppercase font-mono text-zinc-400 mb-1">LLD Template</div>
                                        <h4 className="font-semibold text-white text-sm group-hover:text-blue-400 transition-colors">
                                            Order Sagas &amp; States
                                        </h4>
                                        <p className="text-xs text-zinc-400 mt-1">
                                            Idempotency guards, payment authorization, and failure compensation saga.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs text-blue-400">
                                        <span>Open</span>
                                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </Link>

                            {/* ERD */}
                            <Link href="/canvas/lld-database-erd" className="group">
                                <div className="h-full p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col justify-between">
                                    <div>
                                        <div className="text-[10px] uppercase font-mono text-zinc-400 mb-1">LLD Template</div>
                                        <h4 className="font-semibold text-white text-sm group-hover:text-blue-400 transition-colors">
                                            Relational DB Schema
                                        </h4>
                                        <p className="text-xs text-zinc-400 mt-1">
                                            E-commerce SQL schema: Users, Orders, OrderItems with PK &amp; FK constraints.
                                        </p>
                                    </div>
                                    <div className="mt-4 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs text-blue-400">
                                        <span>Open</span>
                                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* 4. Minimal Call to Action */}
                <section className="py-16 sm:py-20 text-center">
                    <div className="container mx-auto px-4 max-w-xl">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                            Start diagramming in seconds
                        </h2>
                        <p className="mt-2 text-xs sm:text-sm text-zinc-400">
                            Free and open source. No account required to draw or collaborate.
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <Link href="/canvas/1">
                                <Button size="lg" className="h-10 px-6 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors cursor-pointer">
                                    Launch Whiteboard
                                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                </Button>
                            </Link>
                            <Link href="/canvas/hld-this-app">
                                <Button size="lg" variant="outline" className="h-10 px-5 text-xs font-medium border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white rounded-xl cursor-pointer">
                                    Explore Architecture
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* Minimal Single-Row Footer */}
            <footer className="border-t border-zinc-800/80 py-6 bg-[#08090d] text-xs text-zinc-500">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-300">VectorCraft</span>
                        <span>•</span>
                        <span>Open source system design whiteboard</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/canvas/1" className="hover:text-zinc-300 transition-colors">Canvas</Link>
                        <a href="#templates" className="hover:text-zinc-300 transition-colors">Templates</a>
                        <Link href="/signin" className="hover:text-zinc-300 transition-colors">Sign in</Link>
                        <a href="https://github.com/Ankit28max/draw-app" target="_blank" rel="noreferrer" className="hover:text-zinc-300 transition-colors">
                            GitHub
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}