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
    X
} from "lucide-react";
import { Game, Tool, PresenceUser, Shape, TextEditSession } from "@/draw/Game";
import Link from "next/link";

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

    const startTextEditSession = (session: TextEditSession) => {
        sessionMountedAtRef.current = Date.now();
        setActiveTextSession(session);
    };
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
            gameRef.current.onSelectionChange = (shape) => {
                setSelectedShape(shape);
                if (shape) {
                    if (shape.strokeColor) setSelectedColor(shape.strokeColor);
                    if (shape.strokeWidth) setSelectedWidth(shape.strokeWidth);
                }
            };
            gameRef.current.onToolChange = (tool) => setSelectedTool(tool);
            gameRef.current.onStartTextEdit = (session) => startTextEditSession(session);
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
        g.onSelectionChange = (shape) => {
            setSelectedShape(shape);
            if (shape) {
                if (shape.strokeColor) setSelectedColor(shape.strokeColor);
                if (shape.strokeWidth) setSelectedWidth(shape.strokeWidth);
            }
        };
        g.onToolChange = (tool) => setSelectedTool(tool);
        g.onStartTextEdit = (session) => startTextEditSession(session);
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
                <IconButton
                    title="Clear Canvas"
                    onClick={() => {
                        if (confirm("Are you sure you want to clear the entire whiteboard?")) {
                            gameRef.current?.clearRoom();
                        }
                    }}
                    icon={<Trash2 className="w-4 h-4 text-red-400" />}
                />

                <div className="h-5 w-px bg-zinc-700 mx-0.5" />

                {/* Style toggle */}
                <IconButton
                    title="Style options (Color & Stroke)"
                    onClick={() => setShowStyles((prev) => !prev)}
                    activated={showStyles}
                    icon={<Palette className="w-4 h-4" />}
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
                        {selectedShape.type} selected
                    </span>
                    <span className="text-zinc-600">|</span>
                    <span className="text-[11px] text-zinc-400 hidden sm:inline">
                        {selectedShape.type === "text" ? "Double-click to edit • Drag to move" : "Drag to move"}
                    </span>
                    <span className="text-zinc-600 hidden sm:inline">|</span>
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

            {/* Keyboard Shortcuts Hint Bar (Subtle bottom-center hint) */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none opacity-40 hover:opacity-100 transition-opacity hidden md:flex items-center gap-2.5 text-[11px] text-zinc-400 bg-zinc-950/80 px-3.5 py-1 rounded-full border border-zinc-800">
                <span><kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-200">V</kbd> Select</span>
                <span>•</span>
                <span><kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-200">T</kbd> Text</span>
                <span>•</span>
                <span><kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-200">Del</kbd> Delete</span>
                <span>•</span>
                <span>Hold <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-200">Space</kbd> Pan</span>
                <span>•</span>
                <span><kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-200">Ctrl + Scroll</kbd> Zoom</span>
            </div>
        </div>
    );
}