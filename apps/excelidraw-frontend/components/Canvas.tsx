"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton } from "./IconButton";
import {
    Circle,
    Pencil,
    RectangleHorizontalIcon,
    ArrowLeft,
    Minus,
    ArrowRight,
    Eraser,
    Hand,
    Undo2,
    Redo2,
    Trash2,
    Plus,
    Copy,
    Check,
    Palette,
    Users,
    MousePointer,
    Type,
    X,
    Download,
    Terminal,
    Sparkles,
    Database,
    Zap,
    Cloud,
    Shield,
    Cpu,
    Radio,
    Boxes,
    ChevronDown,
    Play,
    Square,
    Activity,
    BookOpen,
    Layers
} from "lucide-react";
import { Game, Tool, PresenceUser, Shape, TextEditSession } from "@/draw/Game";
import Link from "next/link";
import { DevCommandPalette } from "./DevCommandPalette";
import { DevTelemetryBar } from "./DevTelemetryBar";

const STROKE_COLORS = [
    { label: "White", value: "#ffffff" },
    { label: "Red", value: "#ef4444" },
    { label: "Green", value: "#22c55e" },
    { label: "Blue", value: "#3b82f6" },
    { label: "Yellow", value: "#eab308" },
    { label: "Purple", value: "#a855f7" },
];

const STROKE_WIDTHS = [
    { label: "Thin", value: 1 },
    { label: "Medium", value: 2 },
    { label: "Bold", value: 4 },
];

export function Canvas({
    roomId,
    socket,
    userName = "Collaborator"
}: {
    socket: WebSocket;
    roomId: string;
    userName?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<Game | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const sessionMountedAtRef = useRef<number>(0);
    const [selectedTool, setSelectedTool] = useState<Tool>("pencil");
    const [selectedColor, setSelectedColor] = useState<string>("#ffffff");
    const [selectedWidth, setSelectedWidth] = useState<number>(2);
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [showStyles, setShowStyles] = useState<boolean>(false);
    const [copied, setCopied] = useState(false);
    const [collaborators, setCollaborators] = useState<PresenceUser[]>([]);
    const [selectedShape, setSelectedShape] = useState<Shape | null>(null);
    const [activeTextSession, setActiveTextSession] = useState<TextEditSession | null>(null);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isArchMenuOpen, setIsArchMenuOpen] = useState(false);
    const archMenuRef = useRef<HTMLDivElement>(null);
    const [isTemplatesMenuOpen, setIsTemplatesMenuOpen] = useState(false);
    const templatesMenuRef = useRef<HTMLDivElement>(null);
    const [isSimulatingFlow, setIsSimulatingFlow] = useState(false);
    const [shapeCount, setShapeCount] = useState(0);

    const startTextEditSession = (session: TextEditSession) => {
        sessionMountedAtRef.current = Date.now();
        setActiveTextSession(session);
    };

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (archMenuRef.current && !archMenuRef.current.contains(e.target as Node)) {
                setIsArchMenuOpen(false);
            }
            if (templatesMenuRef.current && !templatesMenuRef.current.contains(e.target as Node)) {
                setIsTemplatesMenuOpen(false);
            }
        };
        if (isArchMenuOpen || isTemplatesMenuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isArchMenuOpen, isTemplatesMenuOpen]);

    // Global developer shortcut: Cmd+K or Ctrl+K opens DevCommandPalette
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setIsCommandPaletteOpen((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Global keyboard deletion for selected shape (Delete / Backspace)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Do not delete shape if user is typing in an input or textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }
            if (e.key === "Delete" || e.key === "Backspace" || e.code === "Delete" || e.code === "Backspace") {
                if (selectedShape) {
                    e.preventDefault();
                    gameRef.current?.deleteSelectedShape();
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedShape]);
    const [dimensions, setDimensions] = useState({
        width: typeof window !== "undefined" ? window.innerWidth : 1200,
        height: typeof window !== "undefined" ? window.innerHeight : 800,
    });

    // Handle window resize without recreating Game or losing listeners
    useEffect(() => {
        function handleResize() {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
            setTimeout(() => {
                gameRef.current?.clearCanvas();
            }, 50);
        }
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Tool changes
    useEffect(() => {
        gameRef.current?.setTool(selectedTool);
    }, [selectedTool]);

    // Color changes
    useEffect(() => {
        gameRef.current?.setColor(selectedColor);
    }, [selectedColor]);

    // Stroke width changes
    useEffect(() => {
        gameRef.current?.setStrokeWidth(selectedWidth);
    }, [selectedWidth]);

    // Initialize Game engine once per room/socket - uses ref so listeners are NEVER detached prematurely
    useEffect(() => {
        if (!canvasRef.current || !socket) return;

        // If game instance already exists for this room, just update its active socket
        if (gameRef.current && gameRef.current.roomId === roomId) {
            gameRef.current.updateSocket(socket);
            gameRef.current.setUserName(userName);
            gameRef.current.onPresenceChange = (users) => setCollaborators(users);
            gameRef.current.onShapesChange = (count) => setShapeCount(count);
            gameRef.current.onSelectionChange = (shape) => {
                setSelectedShape(shape);
                if (shape) {
                    if (shape.strokeColor) setSelectedColor(shape.strokeColor);
                    if (shape.strokeWidth) setSelectedWidth(shape.strokeWidth);
                }
            };
            gameRef.current.onToolChange = (tool) => setSelectedTool(tool);
            gameRef.current.onStartTextEdit = (session) => startTextEditSession(session);
            gameRef.current.onSimulationChange = (isActive) => setIsSimulatingFlow(isActive);
            return;
        }

        // Clean up previous game if switching rooms
        if (gameRef.current) {
            gameRef.current.destroy();
        }

        const g = new Game(canvasRef.current, roomId, socket, userName);
        g.setTool(selectedTool);
        g.setColor(selectedColor);
        g.setStrokeWidth(selectedWidth);
        g.onZoomChange = (z) => setZoomLevel(z);
        g.onPresenceChange = (users) => setCollaborators(users);
        g.onShapesChange = (count) => setShapeCount(count);
        g.onSelectionChange = (shape) => {
            setSelectedShape(shape);
            if (shape) {
                if (shape.strokeColor) setSelectedColor(shape.strokeColor);
                if (shape.strokeWidth) setSelectedWidth(shape.strokeWidth);
            }
        };
        g.onToolChange = (tool) => setSelectedTool(tool);
        g.onStartTextEdit = (session) => startTextEditSession(session);
        g.onSimulationChange = (isActive) => setIsSimulatingFlow(isActive);
        gameRef.current = g;

        return () => {
            g.destroy();
            gameRef.current = null;
        };
    }, [roomId, socket, userName]);

    // Focus & auto-size textarea when text editing starts
    useEffect(() => {
        if (activeTextSession && textareaRef.current) {
            textareaRef.current.value = activeTextSession.initialText || "";
            const timer = setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    const len = textareaRef.current.value.length;
                    textareaRef.current.setSelectionRange(len, len);
                    textareaRef.current.style.height = "auto";
                    textareaRef.current.style.height = `${Math.max(42, textareaRef.current.scrollHeight)}px`;
                    textareaRef.current.style.width = "auto";
                    textareaRef.current.style.width = `${Math.max(180, textareaRef.current.scrollWidth + 24)}px`;
                }
            }, 15);
            return () => clearTimeout(timer);
        }
    }, [activeTextSession]);

    const handleCommitText = (text: string) => {
        if (!activeTextSession) return;
        gameRef.current?.commitText(
            activeTextSession.id,
            text,
            activeTextSession.worldX,
            activeTextSession.worldY,
            activeTextSession.fontSize,
            activeTextSession.color
        );
        setActiveTextSession(null);
        if (selectedTool === "text") {
            setSelectedTool("select");
        }
    };

    const handleCopyLink = () => {
        if (typeof window !== "undefined") {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-[#0c0d11] select-none">
            {/* Whiteboard Canvas */}
            <canvas
                ref={canvasRef}
                width={dimensions.width}
                height={dimensions.height}
                className="block touch-none"
            />

            {/* Top Toolbar */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/60 rounded-2xl px-3 py-1.5 shadow-2xl">
                <Link
                    href="/"
                    className="mr-1 text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-zinc-800 flex items-center"
                    title="Back to Home"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Link>

                <div className="h-5 w-px bg-zinc-700 mx-0.5" />

                {/* Drawing & Navigation Tools */}
                <IconButton
                    title="Select & Move tool (V or 1)"
                    onClick={() => setSelectedTool("select")}
                    activated={selectedTool === "select"}
                    icon={<MousePointer className="w-4 h-4" />}
                />
                <IconButton
                    title="Pan / Hand tool (H, 2, or hold Spacebar)"
                    onClick={() => setSelectedTool("hand")}
                    activated={selectedTool === "hand"}
                    icon={<Hand className="w-4 h-4" />}
                />
                <IconButton
                    title="Pencil / Freehand (P or 3)"
                    onClick={() => setSelectedTool("pencil")}
                    activated={selectedTool === "pencil"}
                    icon={<Pencil className="w-4 h-4" />}
                />
                <IconButton
                    title="Rectangle (R or 4)"
                    onClick={() => setSelectedTool("rect")}
                    activated={selectedTool === "rect"}
                    icon={<RectangleHorizontalIcon className="w-4 h-4" />}
                />
                <IconButton
                    title="Circle (C or 5)"
                    onClick={() => setSelectedTool("circle")}
                    activated={selectedTool === "circle"}
                    icon={<Circle className="w-4 h-4" />}
                />
                <IconButton
                    title="Line (L or 6)"
                    onClick={() => setSelectedTool("line")}
                    activated={selectedTool === "line"}
                    icon={<Minus className="w-4 h-4" />}
                />
                <IconButton
                    title="Arrow (A or 7)"
                    onClick={() => setSelectedTool("arrow")}
                    activated={selectedTool === "arrow"}
                    icon={<ArrowRight className="w-4 h-4" />}
                />
                <IconButton
                    title="Text / Notes (T or 8)"
                    onClick={() => setSelectedTool("text")}
                    activated={selectedTool === "text"}
                    icon={<Type className="w-4 h-4" />}
                />
                <IconButton
                    title="Eraser (E or 0)"
                    onClick={() => setSelectedTool("eraser")}
                    activated={selectedTool === "eraser"}
                    icon={<Eraser className="w-4 h-4" />}
                />

                <div className="h-5 w-px bg-zinc-700 mx-0.5" />

                {/* History Actions */}
                <IconButton
                    title="Undo (Ctrl+Z)"
                    onClick={() => gameRef.current?.undo()}
                    icon={<Undo2 className="w-4 h-4" />}
                />
                <IconButton
                    title="Redo (Ctrl+Y)"
                    onClick={() => gameRef.current?.redo()}
                    icon={<Redo2 className="w-4 h-4" />}
                />
                <div className="h-5 w-px bg-zinc-700 mx-0.5" />

                {/* Style toggle */}
                <IconButton
                    title="Style options (Color & Stroke)"
                    onClick={() => setShowStyles((prev) => !prev)}
                    activated={showStyles}
                    icon={<Palette className="w-4 h-4" />}
                />

                <div className="h-5 w-px bg-zinc-700 mx-0.5" />

                {/* System Design HLD & LLD Templates Dropdown */}
                <div className="relative" ref={templatesMenuRef}>
                    <button
                        onClick={() => setIsTemplatesMenuOpen((prev) => !prev)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                            isTemplatesMenuOpen
                                ? "bg-purple-600/20 text-purple-400 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                                : "bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800 hover:text-white hover:border-zinc-500"
                        }`}
                        title="Instant HLD & LLD System Design Templates"
                    >
                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                        <span className="hidden sm:inline">Templates</span>
                        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isTemplatesMenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isTemplatesMenuOpen && (
                        <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 w-80 bg-zinc-950/95 backdrop-blur-xl border border-zinc-700/80 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1 ring-1 ring-white/10">
                            <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold border-b border-zinc-800 flex items-center justify-between">
                                <span>Architecture Starter Kits</span>
                                <span className="text-purple-400 font-mono text-[9px]">HLD & LLD</span>
                            </div>

                            {/* Featured: This App's Architecture */}
                            <button
                                onClick={() => {
                                    gameRef.current?.loadArchitectureTemplate("hld_this_app");
                                    setIsTemplatesMenuOpen(false);
                                }}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-cyan-500/15 hover:text-cyan-300 transition-colors cursor-pointer group bg-cyan-500/5 border border-cyan-500/25"
                            >
                                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                                    <Sparkles className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold flex items-center justify-between">
                                        <span className="truncate text-cyan-200 font-bold">This App's Architecture</span>
                                        <span className="text-[9px] text-cyan-400 font-mono font-bold bg-cyan-500/20 px-1 py-0.5 rounded">FEATURED</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">Next.js, WS :8080, HTTP :3001, Write-Behind & DB</div>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    gameRef.current?.loadArchitectureTemplate("hld_uber");
                                    setIsTemplatesMenuOpen(false);
                                }}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-purple-500/15 hover:text-purple-300 transition-colors cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                                    <Activity className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold flex items-center justify-between">
                                        <span className="truncate">Event Stream & Matching</span>
                                        <span className="text-[9px] text-purple-400 font-mono">HLD</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">Uber / Kafka / Redis Geo Cluster</div>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    gameRef.current?.loadArchitectureTemplate("hld_tinyurl");
                                    setIsTemplatesMenuOpen(false);
                                }}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-blue-500/15 hover:text-blue-300 transition-colors cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                                    <Zap className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold flex items-center justify-between">
                                        <span className="truncate">High-QPS URL Shortener</span>
                                        <span className="text-[9px] text-blue-400 font-mono">HLD</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">TinyURL / Edge CDN / Base62 Core</div>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    gameRef.current?.loadArchitectureTemplate("lld_state_machine");
                                    setIsTemplatesMenuOpen(false);
                                }}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-emerald-500/15 hover:text-emerald-300 transition-colors cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                                    <Shield className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold flex items-center justify-between">
                                        <span className="truncate">Order State Machine & Sagas</span>
                                        <span className="text-[9px] text-emerald-400 font-mono">LLD</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">Idempotency & Stripe Gateways</div>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    gameRef.current?.loadArchitectureTemplate("lld_erd");
                                    setIsTemplatesMenuOpen(false);
                                }}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs text-left text-zinc-200 hover:bg-amber-500/15 hover:text-amber-300 transition-colors cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                                    <Database className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold flex items-center justify-between">
                                        <span className="truncate">Normalized Relational ERD</span>
                                        <span className="text-[9px] text-amber-400 font-mono">LLD</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">Users, Orders & Products PK/FK Schema</div>
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                {/* Architecture Nodes Quick Menu */}
                <div className="relative" ref={archMenuRef}>
                    <button
                        onClick={() => setIsArchMenuOpen((prev) => !prev)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                            isArchMenuOpen
                                ? "bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.25)]"
                                : "bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800 hover:text-white hover:border-zinc-500"
                        }`}
                        title="Architecture Components (Database, EC2, Backend Server, Redis, Load Balancer)"
                    >
                        <Database className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden sm:inline">Components</span>
                        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isArchMenuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isArchMenuOpen && (
                        <div className="absolute top-full mt-2.5 left-1/2 -translate-x-1/2 w-72 bg-zinc-950/95 backdrop-blur-xl border border-zinc-700/80 rounded-2xl p-2 shadow-2xl z-50 flex flex-col gap-1 ring-1 ring-white/10 max-h-[440px] overflow-y-auto">
                            <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold border-b border-zinc-800 flex items-center justify-between">
                                <span>Architecture Shapes</span>
                                <span className="text-blue-400 font-mono text-[9px]">Click & Drag</span>
                            </div>

                            {/* Database */}
                            <button
                                onClick={() => {
                                    gameRef.current?.insertTechComponent("database");
                                    setIsArchMenuOpen(false);
                                }}
                                className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-xs text-left text-zinc-200 hover:bg-blue-500/15 hover:text-blue-300 transition-colors cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                                    <Database className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold flex items-center justify-between">
                                        <span className="truncate">PostgreSQL DB</span>
                                        <span className="text-[9px] text-blue-400/80 font-mono">DATABASE</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">SQL Schema & Primary Keys</div>
                                </div>
                            </button>

                            {/* Backend Server */}
                            <button
                                onClick={() => {
                                    gameRef.current?.insertTechComponent("server");
                                    setIsArchMenuOpen(false);
                                }}
                                className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-xs text-left text-zinc-200 hover:bg-cyan-500/15 hover:text-cyan-300 transition-colors cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                                    <Cpu className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold flex items-center justify-between">
                                        <span className="truncate">Backend Server</span>
                                        <span className="text-[9px] text-cyan-400/80 font-mono">NODE / GO</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">Express REST API on :3001</div>
                                </div>
                            </button>

                            {/* AWS EC2 Compute VM */}
                            <button
                                onClick={() => {
                                    gameRef.current?.insertTechComponent("ec2");
                                    setIsArchMenuOpen(false);
                                }}
                                className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-xs text-left text-zinc-200 hover:bg-orange-500/15 hover:text-orange-300 transition-colors cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-105 transition-transform">
                                    <Boxes className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold flex items-center justify-between">
                                        <span className="truncate">AWS EC2 Instance</span>
                                        <span className="text-[9px] text-orange-400/80 font-mono">COMPUTE</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">t4g.xlarge Linux Cloud VM</div>
                                </div>
                            </button>

                            {/* Load Balancer */}
                            <button
                                onClick={() => {
                                    gameRef.current?.insertTechComponent("load_balancer");
                                    setIsArchMenuOpen(false);
                                }}
                                className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-xs text-left text-zinc-200 hover:bg-purple-500/15 hover:text-purple-300 transition-colors cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                                    <Layers className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold flex items-center justify-between">
                                        <span className="truncate">L7 Load Balancer</span>
                                        <span className="text-[9px] text-purple-400/80 font-mono">GATEWAY</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">Cloudflare & Nginx Reverse Proxy</div>
                                </div>
                            </button>

                            {/* Redis Cache */}
                            <button
                                onClick={() => {
                                    gameRef.current?.insertTechComponent("redis");
                                    setIsArchMenuOpen(false);
                                }}
                                className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-xs text-left text-zinc-200 hover:bg-red-500/15 hover:text-red-300 transition-colors cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
                                    <Zap className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold flex items-center justify-between">
                                        <span className="truncate">Redis Cache</span>
                                        <span className="text-[9px] text-red-400/80 font-mono">CACHE</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">In-memory TTL & Sessions</div>
                                </div>
                            </button>

                            {/* Kafka Queue */}
                            <button
                                onClick={() => {
                                    gameRef.current?.insertTechComponent("queue");
                                    setIsArchMenuOpen(false);
                                }}
                                className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-xs text-left text-zinc-200 hover:bg-emerald-500/15 hover:text-emerald-300 transition-colors cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                                    <Radio className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold flex items-center justify-between">
                                        <span className="truncate">Kafka Queue</span>
                                        <span className="text-[9px] text-emerald-400/80 font-mono">STREAM</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">Event Bus & Partitioning</div>
                                </div>
                            </button>

                            {/* Auth & Security Shield */}
                            <button
                                onClick={() => {
                                    gameRef.current?.insertTechComponent("security");
                                    setIsArchMenuOpen(false);
                                }}
                                className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-xs text-left text-zinc-200 hover:bg-amber-500/15 hover:text-amber-300 transition-colors cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                                    <Shield className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold flex items-center justify-between">
                                        <span className="truncate">Auth & Shield</span>
                                        <span className="text-[9px] text-amber-400/80 font-mono">SECURITY</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">JWT Auth & Rate Limiter</div>
                                </div>
                            </button>

                            {/* Frontend Client */}
                            <button
                                onClick={() => {
                                    gameRef.current?.insertTechComponent("client");
                                    setIsArchMenuOpen(false);
                                }}
                                className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl text-xs text-left text-zinc-200 hover:bg-blue-500/15 hover:text-blue-300 transition-colors cursor-pointer group"
                            >
                                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                                    <Terminal className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold flex items-center justify-between">
                                        <span className="truncate">Web / Mobile Client</span>
                                        <span className="text-[9px] text-blue-400/80 font-mono">FRONTEND</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 truncate">Next.js 15 & React Native</div>
                                </div>
                            </button>

                            <div className="border-t border-zinc-800/80 pt-1 mt-0.5">
                                <button
                                    onClick={() => {
                                        setIsArchMenuOpen(false);
                                        setIsCommandPaletteOpen(true);
                                    }}
                                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer font-mono"
                                >
                                    <span>More in Palette...</span>
                                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-300">⌘K</kbd>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-5 w-px bg-zinc-700 mx-0.5" />

                {/* Simulate Request Flow Button */}
                <button
                    onClick={() => gameRef.current?.toggleFlowSimulation()}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isSimulatingFlow
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.35)] animate-pulse"
                            : "bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/40"
                    }`}
                    title={isSimulatingFlow ? "Stop Flow Simulation" : "Simulate Live Request Flow along connectors"}
                >
                    {isSimulatingFlow ? (
                        <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span className="hidden sm:inline">Flow Live</span>
                        </>
                    ) : (
                        <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span className="hidden sm:inline">Simulate Flow</span>
                        </>
                    )}
                </button>

                <div className="h-5 w-px bg-zinc-700 mx-0.5" />

                {/* Dev Command Palette & Tech Nodes */}
                <IconButton
                    title="Developer Command Palette & Architecture Nodes (⌘K)"
                    onClick={() => setIsCommandPaletteOpen(true)}
                    activated={isCommandPaletteOpen}
                    icon={<Terminal className="w-4 h-4 text-purple-400" />}
                />
            </div>

            {/* Top-Right Active Collaborators Presence Widget */}
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/60 rounded-2xl px-3 py-1.5 shadow-2xl">
                <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-medium text-zinc-300">
                        {collaborators.length > 0 ? collaborators.length : 1} online
                    </span>
                </div>

                {collaborators.length > 0 && (
                    <div className="flex items-center -space-x-1.5 ml-1">
                        {collaborators.slice(0, 4).map((user) => (
                            <div
                                key={user.connectionId}
                                title={user.userName}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow ring-2 ring-zinc-900 select-none uppercase cursor-default"
                                style={{ backgroundColor: user.color || "#3b82f6" }}
                            >
                                {user.userName.charAt(0) || "U"}
                            </div>
                        ))}
                        {collaborators.length > 4 && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-300 bg-zinc-800 ring-2 ring-zinc-900">
                                +{collaborators.length - 4}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Contextual Selection Action Bar */}
            {selectedShape && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 bg-zinc-900/95 backdrop-blur-md border border-blue-500/60 rounded-xl px-3.5 py-1.5 shadow-2xl text-xs text-zinc-200">
                    <span className="capitalize font-medium text-blue-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        {selectedShape.type === "tech_node"
                            ? `${(selectedShape as any).title || "Architecture Icon"}`
                            : `${selectedShape.type} selected`}
                    </span>
                    <span className="text-zinc-600">|</span>
                    <span className="text-[11px] text-zinc-400 hidden sm:inline">
                        {selectedShape.type === "text"
                            ? "Double-click to edit • Drag to move"
                            : selectedShape.type === "tech_node"
                            ? "Drag handles to resize • Double-click to edit"
                            : "Drag handles to resize • Drag to move"}
                    </span>
                    <span className="text-zinc-600 hidden sm:inline">|</span>

                    {/* Quick Size Controls for Architecture Icons */}
                    {selectedShape.type === "tech_node" && (
                        <>
                            <div className="flex items-center gap-1 bg-zinc-800/90 px-1.5 py-0.5 rounded-lg border border-zinc-700/60">
                                <span className="text-[10px] font-mono text-zinc-400 mr-0.5">Size:</span>
                                <button
                                    onClick={() => gameRef.current?.scaleSelectedShape(0.85)}
                                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs cursor-pointer"
                                    title="Scale smaller (-15%)"
                                >
                                    -
                                </button>
                                <button
                                    onClick={() => gameRef.current?.scaleSelectedShape(1.18)}
                                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs cursor-pointer"
                                    title="Scale larger (+18%)"
                                >
                                    +
                                </button>
                                <div className="h-3 w-px bg-zinc-700 mx-0.5" />
                                <button
                                    onClick={() => gameRef.current?.resizeSelectedShape(120, 85)}
                                    className="px-1.5 py-0.5 text-[10px] font-mono rounded hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
                                    title="Compact size (120 × 85)"
                                >
                                    S
                                </button>
                                <button
                                    onClick={() => gameRef.current?.resizeSelectedShape(150, 110)}
                                    className="px-1.5 py-0.5 text-[10px] font-mono rounded hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer font-bold text-blue-400"
                                    title="Standard size (150 × 110)"
                                >
                                    M
                                </button>
                                <button
                                    onClick={() => gameRef.current?.resizeSelectedShape(200, 140)}
                                    className="px-1.5 py-0.5 text-[10px] font-mono rounded hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
                                    title="Large size (200 × 140)"
                                >
                                    L
                                </button>
                            </div>
                            <span className="text-zinc-600">|</span>
                        </>
                    )}

                    {(selectedShape.type === "tech_node" || selectedShape.type === "text") && (
                        <>
                            <button
                                onClick={() => gameRef.current?.startEditingSelectedShape()}
                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded hover:bg-blue-500/10 cursor-pointer font-medium"
                                title="Edit text (Double-click or press Enter)"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit Label</span>
                            </button>
                            <span className="text-zinc-600">|</span>
                        </>
                    )}
                    <button
                        onClick={() => gameRef.current?.deleteSelectedShape()}
                        className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-zinc-800 cursor-pointer font-medium"
                        title="Delete selected shape (Del / Backspace)"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                    </button>
                </div>
            )}

            {/* Floating Textarea Overlay for Text Tool */}
            {activeTextSession && (
                <>
                    {/* Transparent Click-Outside Capture Backdrop */}
                    <div
                        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (textareaRef.current) {
                                handleCommitText(textareaRef.current.value);
                            } else {
                                setActiveTextSession(null);
                            }
                        }}
                    />

                    {/* Floating Textarea Editor Box */}
                    <div
                        className="fixed z-50 pointer-events-auto flex flex-col items-start gap-1.5"
                        style={{
                            left: `${Math.max(16, Math.min(dimensions.width - 260, (canvasRef.current?.getBoundingClientRect().left ?? 0) + activeTextSession.worldX * zoomLevel + (gameRef.current?.getPanOffset().x ?? 0)))}px`,
                            top: `${Math.max(64, Math.min(dimensions.height - 120, (canvasRef.current?.getBoundingClientRect().top ?? 0) + activeTextSession.worldY * zoomLevel + (gameRef.current?.getPanOffset().y ?? 0)))}px`,
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <textarea
                            ref={textareaRef}
                            key={activeTextSession.id || `${activeTextSession.worldX}-${activeTextSession.worldY}`}
                            defaultValue={activeTextSession.initialText}
                            placeholder="Type text here..."
                            rows={1}
                            style={{
                                fontSize: `${Math.max(16, (activeTextSession.fontSize || 20) * zoomLevel)}px`,
                                color: activeTextSession.color || selectedColor || "#ffffff",
                                lineHeight: 1.35,
                            }}
                            className="bg-zinc-950/95 text-white backdrop-blur-md border-2 border-blue-500 rounded-xl p-3 outline-none shadow-2xl min-w-[180px] max-w-[600px] font-sans font-bold resize-none overflow-hidden ring-4 ring-blue-500/20"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleCommitText(e.currentTarget.value);
                                } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                    e.preventDefault();
                                    handleCommitText(e.currentTarget.value);
                                } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    setActiveTextSession(null);
                                }
                            }}
                            onBlur={(e) => {
                                // Guard against instant blur on canvas clickup race condition
                                if (Date.now() - sessionMountedAtRef.current < 350) {
                                    textareaRef.current?.focus();
                                    return;
                                }
                                handleCommitText(e.target.value);
                            }}
                            onInput={(e) => {
                                const target = e.currentTarget;
                                target.style.height = "auto";
                                target.style.height = `${Math.max(42, target.scrollHeight)}px`;
                                target.style.width = "auto";
                                target.style.width = `${Math.max(180, target.scrollWidth + 24)}px`;
                            }}
                        />

                        {/* Text Action Bar & Shortcuts */}
                        <div className="flex items-center gap-2 bg-zinc-900/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg shadow-xl border border-zinc-800 text-xs text-zinc-300">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (textareaRef.current) {
                                        handleCommitText(textareaRef.current.value);
                                    }
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-sm"
                                title="Save text (Enter)"
                            >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save</span>
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTextSession(null);
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white text-[11px] transition-colors cursor-pointer"
                                title="Cancel (Esc)"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span>Cancel</span>
                            </button>
                            <span className="text-zinc-600">|</span>
                            <span className="text-[10px] text-zinc-400">
                                <kbd className="text-zinc-200 font-mono">Enter</kbd> save • <kbd className="text-zinc-200 font-mono">Shift+Enter</kbd> newline
                            </span>
                        </div>
                    </div>
                </>
            )}

            {/* Expandable Style Palette (Left side or below topbar) */}
            {showStyles && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/60 rounded-2xl p-3 shadow-2xl flex flex-col gap-3 min-w-[280px]">
                    <div>
                        <span className="text-xs font-semibold text-zinc-400 block mb-2">Stroke Color</span>
                        <div className="flex items-center gap-2">
                            {STROKE_COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    title={c.label}
                                    onClick={() => setSelectedColor(c.value)}
                                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer border ${
                                        selectedColor === c.value
                                            ? "scale-125 border-white ring-2 ring-primary ring-offset-2 ring-offset-zinc-900"
                                            : "border-zinc-700 hover:scale-110"
                                    }`}
                                    style={{ backgroundColor: c.value }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-2">
                        <span className="text-xs font-semibold text-zinc-400 block mb-2">Stroke Thickness</span>
                        <div className="flex items-center gap-2">
                            {STROKE_WIDTHS.map((w) => (
                                <button
                                    key={w.value}
                                    onClick={() => setSelectedWidth(w.value)}
                                    className={`flex-1 py-1 px-2 text-xs rounded-lg border transition-all cursor-pointer ${
                                        selectedWidth === w.value
                                            ? "bg-primary/20 text-primary border-primary/50 font-bold"
                                            : "text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-white"
                                    }`}
                                >
                                    {w.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom-Left Zoom Controls */}
            <div className="fixed bottom-4 left-4 z-40 flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/60 rounded-xl p-1 shadow-lg text-zinc-300">
                <IconButton
                    title="Zoom Out"
                    onClick={() => gameRef.current?.zoomOut()}
                    icon={<Minus className="w-3.5 h-3.5" />}
                />
                <button
                    onClick={() => gameRef.current?.resetZoom()}
                    title="Click to reset zoom (100%)"
                    className="text-xs font-mono px-2 py-1 rounded hover:bg-zinc-800 cursor-pointer min-w-[48px] text-center"
                >
                    {Math.round(zoomLevel * 100)}%
                </button>
                <IconButton
                    title="Zoom In"
                    onClick={() => gameRef.current?.zoomIn()}
                    icon={<Plus className="w-3.5 h-3.5" />}
                />
            </div>

            {/* Bottom-Right Room Badge & Share Link */}
            <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/60 rounded-xl px-3 py-1.5 shadow-lg text-xs font-mono text-zinc-300">
                <span className="text-zinc-400">Room:</span>
                <span className="text-primary font-semibold">{roomId}</span>
                <button
                    onClick={handleCopyLink}
                    title="Copy Room Link to Clipboard"
                    className="ml-2 p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Share"}</span>
                </button>
            </div>

            {/* Left Quick Architecture Components Dock */}
            <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden sm:flex flex-col gap-1.5 p-1.5 bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/60 rounded-2xl shadow-2xl">
                <div className="text-[9px] font-mono uppercase text-zinc-500 font-bold text-center py-1">
                    Nodes
                </div>
                
                <button
                    onClick={() => gameRef.current?.insertTechComponent("database")}
                    className="p-2 rounded-xl text-blue-400 hover:bg-blue-500/20 hover:scale-105 transition-all cursor-pointer group relative"
                    title="Insert PostgreSQL Database"
                >
                    <Database className="w-4 h-4" />
                    <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-950 border border-zinc-700 text-white text-[11px] font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
                        PostgreSQL Database
                    </span>
                </button>

                <button
                    onClick={() => gameRef.current?.insertTechComponent("server")}
                    className="p-2 rounded-xl text-cyan-400 hover:bg-cyan-500/20 hover:scale-105 transition-all cursor-pointer group relative"
                    title="Insert Backend Server"
                >
                    <Cpu className="w-4 h-4" />
                    <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-950 border border-zinc-700 text-white text-[11px] font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
                        Backend Server (Express / Node)
                    </span>
                </button>

                <button
                    onClick={() => gameRef.current?.insertTechComponent("ec2")}
                    className="p-2 rounded-xl text-orange-400 hover:bg-orange-500/20 hover:scale-105 transition-all cursor-pointer group relative"
                    title="Insert AWS EC2 Instance"
                >
                    <Boxes className="w-4 h-4" />
                    <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-950 border border-zinc-700 text-white text-[11px] font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
                        AWS EC2 Virtual Machine
                    </span>
                </button>

                <button
                    onClick={() => gameRef.current?.insertTechComponent("load_balancer")}
                    className="p-2 rounded-xl text-purple-400 hover:bg-purple-500/20 hover:scale-105 transition-all cursor-pointer group relative"
                    title="Insert L7 Load Balancer"
                >
                    <Layers className="w-4 h-4" />
                    <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-950 border border-zinc-700 text-white text-[11px] font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
                        Load Balancer / Proxy
                    </span>
                </button>

                <button
                    onClick={() => gameRef.current?.insertTechComponent("redis")}
                    className="p-2 rounded-xl text-red-400 hover:bg-red-500/20 hover:scale-105 transition-all cursor-pointer group relative"
                    title="Insert Redis Cache"
                >
                    <Zap className="w-4 h-4" />
                    <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-950 border border-zinc-700 text-white text-[11px] font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
                        Redis Cache (In-Memory)
                    </span>
                </button>

                <button
                    onClick={() => gameRef.current?.insertTechComponent("queue")}
                    className="p-2 rounded-xl text-emerald-400 hover:bg-emerald-500/20 hover:scale-105 transition-all cursor-pointer group relative"
                    title="Insert Kafka Event Bus"
                >
                    <Radio className="w-4 h-4" />
                    <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-950 border border-zinc-700 text-white text-[11px] font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
                        Kafka Event Bus
                    </span>
                </button>

                <button
                    onClick={() => gameRef.current?.insertTechComponent("security")}
                    className="p-2 rounded-xl text-amber-400 hover:bg-amber-500/20 hover:scale-105 transition-all cursor-pointer group relative"
                    title="Insert Auth & Shield"
                >
                    <Shield className="w-4 h-4" />
                    <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-950 border border-zinc-700 text-white text-[11px] font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
                        Auth & Security Shield
                    </span>
                </button>

                <div className="h-px bg-zinc-800 my-0.5" />

                <button
                    onClick={() => setIsCommandPaletteOpen(true)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer group relative"
                    title="Open Command Palette (⌘K)"
                >
                    <Terminal className="w-4 h-4" />
                    <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-950 border border-zinc-700 text-white text-[11px] font-medium rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50 font-mono">
                        Command Palette (⌘K)
                    </span>
                </button>
            </div>

            {/* Dev Telemetry HUD Status Bar */}
            <DevTelemetryBar
                game={gameRef.current}
                shapeCount={shapeCount}
                zoomLevel={zoomLevel}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            />

            {/* Developer Command Palette Modal (Cmd+K) */}
            <DevCommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
                game={gameRef.current}
            />
        </div>
    );
}