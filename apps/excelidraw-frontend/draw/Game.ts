import { getExistingShapes } from "./http";

export type Tool = "select" | "hand" | "pencil" | "rect" | "circle" | "line" | "arrow" | "text" | "eraser";

export type Point = {
    x: number;
    y: number;
};

export interface PeerCursor {
    connectionId: string;
    userName: string;
    color: string;
    targetX: number;
    targetY: number;
    currentX: number;
    currentY: number;
    lastSeen: number;
}

export interface PresenceUser {
    connectionId: string;
    userId: string;
    userName: string;
    color: string;
}

export interface TextEditSession {
    id?: string;
    worldX: number;
    worldY: number;
    initialText: string;
    fontSize: number;
    color: string;
}

export type Shape =
    | {
          id?: string;
          type: "rect";
          x: number;
          y: number;
          width: number;
          height: number;
          strokeColor?: string;
          strokeWidth?: number;
      }
    | {
          id?: string;
          type: "circle";
          centerX: number;
          centerY: number;
          radius: number;
          strokeColor?: string;
          strokeWidth?: number;
      }
    | {
          id?: string;
          type: "pencil";
          points?: Point[];
          strokeColor?: string;
          strokeWidth?: number;
          // Legacy format compatibility:
          startX?: number;
          startY?: number;
          endX?: number;
          endY?: number;
      }
    | {
          id?: string;
          type: "line";
          startX: number;
          startY: number;
          endX: number;
          endY: number;
          strokeColor?: string;
          strokeWidth?: number;
      }
    | {
          id?: string;
          type: "arrow";
          startX: number;
          startY: number;
          endX: number;
          endY: number;
          strokeColor?: string;
          strokeWidth?: number;
      }
    | {
          id?: string;
          type: "text";
          x: number;
          y: number;
          text: string;
          fontSize?: number;
          strokeColor?: string;
          strokeWidth?: number;
      };

export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private existingShapes: Shape[];
    private undoStack: Shape[][] = [];
    private redoStack: Shape[][] = [];
    roomId: string;
    private clicked = false;
    private startWorldPoint: Point = { x: 0, y: 0 };
    private currentWorldPoint: Point = { x: 0, y: 0 };
    private currentPencilPoints: Point[] = [];
    private selectedTool: Tool = "pencil";
    private strokeColor = "#ffffff";
    private strokeWidth = 2;

    // Pan & Zoom
    private panOffset: Point = { x: 0, y: 0 };
    private zoom = 1.0;
    private isPanning = false;
    private panStartScreen: Point = { x: 0, y: 0 };
    private isSpacePressed = false;

    socket: WebSocket;
    onZoomChange?: (zoom: number) => void;
    onShapesChange?: (count: number) => void;

    // Live Multiplayer Cursors & Presence
    private peerCursors: Map<string, PeerCursor> = new Map();
    private myConnectionId: string | null = null;
    private myColor: string = "#3b82f6";
    private userName: string = "Collaborator";
    private lastCursorBroadcast = 0;
    private animFrameId: number | null = null;
    onPresenceChange?: (users: PresenceUser[]) => void;

    // Selection & Manipulation
    private selectedShapeId: string | null = null;
    private isDraggingShape: boolean = false;
    private dragStartWorld: Point = { x: 0, y: 0 };
    private initialShapeState: Shape | null = null;
    private activeSnapAnchor: Point | null = null;
    onSelectionChange?: (selectedShape: Shape | null) => void;
    onToolChange?: (tool: Tool) => void;
    onStartTextEdit?: (session: TextEditSession) => void;

    constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket, userName: string = "Collaborator") {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.existingShapes = [];
        this.roomId = roomId;
        this.socket = socket;
        this.userName = userName;

        this.init();
        this.initHandlers();
        this.initMouseHandlers();
        this.initKeyHandlers();
        this.startAnimationLoop();
    }

    destroy() {
        if (this.animFrameId !== null) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.socket) {
            this.socket.onmessage = null;
        }
        this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
        this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
        this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
        this.canvas.removeEventListener("mouseleave", this.mouseLeaveHandler);
        this.canvas.removeEventListener("dblclick", this.dblClickHandler);
        this.canvas.removeEventListener("wheel", this.wheelHandler);
        this.canvas.removeEventListener("touchstart", this.touchStartHandler);
        this.canvas.removeEventListener("touchmove", this.touchMoveHandler);
        this.canvas.removeEventListener("touchend", this.touchEndHandler);
        window.removeEventListener("keydown", this.keyDownHandler);
        window.removeEventListener("keyup", this.keyUpHandler);
        window.removeEventListener("blur", this.windowBlurHandler);
    }

    private startAnimationLoop() {
        const loop = () => {
            let hasActiveLerp = false;
            const now = Date.now();

            this.peerCursors.forEach((cursor, id) => {
                // Keep cursors visible for up to 20 seconds of inactivity before cleaning up
                if (now - cursor.lastSeen > 20000) {
                    this.peerCursors.delete(id);
                    hasActiveLerp = true;
                    return;
                }

                const dx = cursor.targetX - cursor.currentX;
                const dy = cursor.targetY - cursor.currentY;

                if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                    cursor.currentX += dx * 0.4;
                    cursor.currentY += dy * 0.4;
                    hasActiveLerp = true;
                } else if (cursor.currentX !== cursor.targetX || cursor.currentY !== cursor.targetY) {
                    cursor.currentX = cursor.targetX;
                    cursor.currentY = cursor.targetY;
                    hasActiveLerp = true;
                }
            });

            if (hasActiveLerp || this.peerCursors.size > 0) {
                this.clearCanvas();
            }

            this.animFrameId = requestAnimationFrame(loop);
        };

        this.animFrameId = requestAnimationFrame(loop);
    }

    setUserName(name: string) {
        this.userName = name;
    }

    updateSocket(newSocket: WebSocket) {
        this.socket = newSocket;
        this.initHandlers();
    }

    setTool(tool: Tool) {
        this.selectedTool = tool;
        if (tool !== "select") {
            this.selectedShapeId = null;
            this.initialShapeState = null;
            this.onSelectionChange?.(null);
            this.clearCanvas();
        }
        this.updateCursor();
        this.onToolChange?.(tool);
    }

    setColor(color: string) {
        this.strokeColor = color;
        if (this.selectedShapeId) {
            const shape = this.existingShapes.find((s) => s.id === this.selectedShapeId);
            if (shape) {
                shape.strokeColor = color;
                this.clearCanvas();
                this.syncShapeUpdate(shape);
            }
        }
    }

    setStrokeWidth(width: number) {
        this.strokeWidth = width;
        if (this.selectedShapeId) {
            const shape = this.existingShapes.find((s) => s.id === this.selectedShapeId);
            if (shape) {
                shape.strokeWidth = width;
                this.clearCanvas();
                this.syncShapeUpdate(shape);
            }
        }
    }

    getSelectedShape(): Shape | null {
        if (!this.selectedShapeId) return null;
        return this.existingShapes.find((s) => s.id === this.selectedShapeId) || null;
    }

    deleteSelectedShape() {
        if (!this.selectedShapeId) return;
        const id = this.selectedShapeId;
        this.undoStack.push([...this.existingShapes]);
        this.redoStack = [];
        this.existingShapes = this.existingShapes.filter((s) => s.id !== id);
        this.selectedShapeId = null;
        this.initialShapeState = null;
        this.clearCanvas();
        this.onShapesChange?.(this.existingShapes.length);
        this.onSelectionChange?.(null);

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(
                JSON.stringify({
                    type: "delete_shape",
                    shapeId: id,
                    roomId: this.roomId,
                })
            );
        }
    }

    syncShapeUpdate(shape: Shape) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(
                JSON.stringify({
                    type: "update_shape",
                    shape,
                    roomId: this.roomId,
                })
            );
        }
    }

    getZoom(): number {
        return this.zoom;
    }

    setZoomLevel(newZoom: number) {
        const clampedZoom = Math.min(Math.max(0.1, newZoom), 8);
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        this.panOffset.x = cx - (cx - this.panOffset.x) * (clampedZoom / this.zoom);
        this.panOffset.y = cy - (cy - this.panOffset.y) * (clampedZoom / this.zoom);
        this.zoom = clampedZoom;
        this.clearCanvas();
        this.onZoomChange?.(this.zoom);
    }

    zoomIn() {
        this.setZoomLevel(this.zoom * 1.2);
    }

    zoomOut() {
        this.setZoomLevel(this.zoom / 1.2);
    }

    resetZoom() {
        this.zoom = 1;
        this.panOffset = { x: 0, y: 0 };
        this.clearCanvas();
        this.onZoomChange?.(1);
    }

    toScreen(worldX: number, worldY: number): Point {
        return {
            x: worldX * this.zoom + this.panOffset.x,
            y: worldY * this.zoom + this.panOffset.y,
        };
    }

    getPanOffset(): Point {
        return { ...this.panOffset };
    }

    findSnapAnchor(point: Point): Point | null {
        const threshold = 18 / this.zoom;
        let closestAnchor: Point | null = null;
        let closestDist = Infinity;

        for (const shape of this.existingShapes) {
            let anchors: Point[] = [];
            if (shape.type === "rect") {
                anchors = [
                    { x: shape.x + shape.width / 2, y: shape.y },
                    { x: shape.x + shape.width / 2, y: shape.y + shape.height },
                    { x: shape.x, y: shape.y + shape.height / 2 },
                    { x: shape.x + shape.width, y: shape.y + shape.height / 2 },
                ];
            } else if (shape.type === "circle") {
                anchors = [
                    { x: shape.centerX, y: shape.centerY - Math.abs(shape.radius) },
                    { x: shape.centerX, y: shape.centerY + Math.abs(shape.radius) },
                    { x: shape.centerX - Math.abs(shape.radius), y: shape.centerY },
                    { x: shape.centerX + Math.abs(shape.radius), y: shape.centerY },
                ];
            } else if (shape.type === "text") {
                const b = this.getShapeBounds(shape);
                anchors = [
                    { x: b.minX + (b.maxX - b.minX) / 2, y: b.minY },
                    { x: b.minX + (b.maxX - b.minX) / 2, y: b.maxY },
                    { x: b.minX, y: b.minY + (b.maxY - b.minY) / 2 },
                    { x: b.maxX, y: b.minY + (b.maxY - b.minY) / 2 },
                ];
            }

            for (const a of anchors) {
                const d = Math.hypot(point.x - a.x, point.y - a.y);
                if (d < threshold && d < closestDist) {
                    closestDist = d;
                    closestAnchor = a;
                }
            }
        }

        return closestAnchor;
    }

    exportImage(fileName = `vectorcraft-${Date.now()}.png`): string | null {
        if (this.existingShapes.length === 0) {
            alert("Canvas is empty. Draw some shapes before exporting!");
            return null;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const shape of this.existingShapes) {
            const bounds = this.getShapeBounds(shape);
            if (bounds.minX < minX) minX = bounds.minX;
            if (bounds.minY < minY) minY = bounds.minY;
            if (bounds.maxX > maxX) maxX = bounds.maxX;
            if (bounds.maxY > maxY) maxY = bounds.maxY;
        }

        const padding = 50;
        const width = Math.max(300, (maxX - minX) + padding * 2);
        const height = Math.max(200, (maxY - minY) + padding * 2);

        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = width;
        exportCanvas.height = height;
        const exportCtx = exportCanvas.getContext("2d");
        if (!exportCtx) return null;

        // Draw crisp obsidian background
        exportCtx.fillStyle = "#0c0d11";
        exportCtx.fillRect(0, 0, width, height);

        // Draw subtle dot matrix
        exportCtx.fillStyle = "rgba(255, 255, 255, 0.05)";
        for (let x = 0; x < width; x += 30) {
            for (let y = 0; y < height; y += 30) {
                exportCtx.beginPath();
                exportCtx.arc(x, y, 1, 0, Math.PI * 2);
                exportCtx.fill();
            }
        }

        // Translate context to render centered diagram
        exportCtx.save();
        exportCtx.translate(-minX + padding, -minY + padding);

        const originalCtx = this.ctx;
        this.ctx = exportCtx;
        for (const shape of this.existingShapes) {
            this.renderShape(shape);
        }
        this.ctx = originalCtx;
        exportCtx.restore();

        const dataUrl = exportCanvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        return dataUrl;
    }

    getViewportCenter(): Point {
        return this.toWorld(this.canvas.width / 2, this.canvas.height / 2);
    }

    insertShapes(newShapes: Shape[]) {
        this.undoStack.push(JSON.parse(JSON.stringify(this.existingShapes)));
        this.redoStack = [];
        newShapes.forEach((s) => this.existingShapes.push(s));
        this.clearCanvas();
        this.onShapesChange?.(this.existingShapes.length);

        newShapes.forEach((shape) => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(
                    JSON.stringify({
                        type: "chat",
                        message: JSON.stringify({ shape }),
                        roomId: this.roomId,
                    })
                );
            }
        });
    }

    insertTechComponent(kind: "database" | "redis" | "service" | "queue" | "terminal" | "client") {
        const center = this.getViewportCenter();
        const id = (prefix: string) => `dev-${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        if (kind === "database") {
            const w = 210, h = 130;
            const x = center.x - w / 2, y = center.y - h / 2;
            const rectShape: Shape = {
                id: id("rect"),
                type: "rect",
                x,
                y,
                width: w,
                height: h,
                strokeColor: "#38bdf8",
                strokeWidth: 2,
            };
            const textShape: Shape = {
                id: id("text"),
                type: "text",
                x: x + 16,
                y: y + 14,
                text: "🗄️ PostgreSQL\n───────────────\nid: uuid (PK)\nemail: varchar(255)\ncreated_at: timestamp",
                fontSize: 13,
                strokeColor: "#38bdf8",
            };
            this.insertShapes([rectShape, textShape]);
        } else if (kind === "redis") {
            const w = 200, h = 120;
            const x = center.x - w / 2, y = center.y - h / 2;
            const rectShape: Shape = {
                id: id("rect"),
                type: "rect",
                x,
                y,
                width: w,
                height: h,
                strokeColor: "#f87171",
                strokeWidth: 2,
            };
            const textShape: Shape = {
                id: id("text"),
                type: "text",
                x: x + 16,
                y: y + 14,
                text: "⚡ Redis Cache\n───────────────\nsessions: TTL 3600s\nrate_limit: sliding_win\neviction: allkeys-lru",
                fontSize: 13,
                strokeColor: "#f87171",
            };
            this.insertShapes([rectShape, textShape]);
        } else if (kind === "service") {
            const w = 220, h = 125;
            const x = center.x - w / 2, y = center.y - h / 2;
            const rectShape: Shape = {
                id: id("rect"),
                type: "rect",
                x,
                y,
                width: w,
                height: h,
                strokeColor: "#c084fc",
                strokeWidth: 2,
            };
            const textShape: Shape = {
                id: id("text"),
                type: "text",
                x: x + 16,
                y: y + 14,
                text: "🔌 API Gateway\n───────────────\nGET  /api/v1/auth\nPOST /api/v1/sync\nWS   /live/:roomId",
                fontSize: 13,
                strokeColor: "#c084fc",
            };
            this.insertShapes([rectShape, textShape]);
        } else if (kind === "queue") {
            const w = 210, h = 120;
            const x = center.x - w / 2, y = center.y - h / 2;
            const rectShape: Shape = {
                id: id("rect"),
                type: "rect",
                x,
                y,
                width: w,
                height: h,
                strokeColor: "#34d399",
                strokeWidth: 2,
            };
            const textShape: Shape = {
                id: id("text"),
                type: "text",
                x: x + 16,
                y: y + 14,
                text: "📨 Kafka Event Bus\n───────────────\ntopic: canvas.events\npartitions: 6\nacks: all (-1)",
                fontSize: 13,
                strokeColor: "#34d399",
            };
            this.insertShapes([rectShape, textShape]);
        } else if (kind === "terminal") {
            const w = 270, h = 135;
            const x = center.x - w / 2, y = center.y - h / 2;
            const rectShape: Shape = {
                id: id("rect"),
                type: "rect",
                x,
                y,
                width: w,
                height: h,
                strokeColor: "#eab308",
                strokeWidth: 2,
            };
            const textShape: Shape = {
                id: id("text"),
                type: "text",
                x: x + 14,
                y: y + 12,
                text: "💻 server.ts\n─────────────────────────\nconst wss = new Server(8080);\nwss.on('conn', handleClient);\nawait prisma.$connect();",
                fontSize: 12,
                strokeColor: "#eab308",
            };
            this.insertShapes([rectShape, textShape]);
        } else if (kind === "client") {
            const w = 190, h = 100;
            const x = center.x - w / 2, y = center.y - h / 2;
            const rectShape: Shape = {
                id: id("rect"),
                type: "rect",
                x,
                y,
                width: w,
                height: h,
                strokeColor: "#60a5fa",
                strokeWidth: 2,
            };
            const textShape: Shape = {
                id: id("text"),
                type: "text",
                x: x + 16,
                y: y + 14,
                text: "🌐 Next.js Client\n───────────────\nReact 19 Frontend\nTailwind & Canvas UI",
                fontSize: 13,
                strokeColor: "#60a5fa",
            };
            this.insertShapes([rectShape, textShape]);
        }
    }

    exportMermaid(): string {
        const nodes: { id: string; label: string; shape: string; bounds: { minX: number; maxX: number; minY: number; maxY: number } }[] = [];
        const arrows: { fromId?: string; toId?: string }[] = [];

        let nodeCount = 0;
        for (const s of this.existingShapes) {
            if (s.type === "rect" || s.type === "circle") {
                nodeCount++;
                const b = this.getShapeBounds(s);
                const internalText = this.existingShapes.find(
                    (other) =>
                        other.type === "text" &&
                        other.x >= b.minX - 15 &&
                        other.x <= b.maxX + 15 &&
                        other.y >= b.minY - 15 &&
                        other.y <= b.maxY + 15
                );
                const label =
                    internalText && internalText.type === "text"
                        ? internalText.text.split("\n")[0]?.replace(/["\[\]\(\)]/g, "").trim()
                        : `Service_${nodeCount}`;
                nodes.push({
                    id: `node_${nodeCount}`,
                    label: label || `Service_${nodeCount}`,
                    shape: s.type === "circle" ? "((" : "[",
                    bounds: b,
                });
            }
        }

        for (const s of this.existingShapes) {
            if (s.type === "arrow" || s.type === "line") {
                const startPt = { x: s.startX, y: s.startY };
                const endPt = { x: s.endX, y: s.endY };

                let closestFrom: string | undefined;
                let minDistFrom = 90;
                for (const n of nodes) {
                    const cx = (n.bounds.minX + n.bounds.maxX) / 2;
                    const cy = (n.bounds.minY + n.bounds.maxY) / 2;
                    const d = Math.hypot(startPt.x - cx, startPt.y - cy);
                    if (d < minDistFrom) {
                        minDistFrom = d;
                        closestFrom = n.id;
                    }
                }

                let closestTo: string | undefined;
                let minDistTo = 90;
                for (const n of nodes) {
                    const cx = (n.bounds.minX + n.bounds.maxX) / 2;
                    const cy = (n.bounds.minY + n.bounds.maxY) / 2;
                    const d = Math.hypot(endPt.x - cx, endPt.y - cy);
                    if (d < minDistTo) {
                        minDistTo = d;
                        closestTo = n.id;
                    }
                }

                if (closestFrom && closestTo && closestFrom !== closestTo) {
                    arrows.push({ fromId: closestFrom, toId: closestTo });
                }
            }
        }

        let code = "```mermaid\nflowchart LR\n";
        if (nodes.length === 0) {
            return "```mermaid\nflowchart LR\n    empty[\"Draw shapes on VectorCraft\"]\n```";
        }

        nodes.forEach((n) => {
            const close = n.shape === "((" ? "))" : "]";
            code += `    ${n.id}${n.shape}"${n.label}"${close}\n`;
        });

        if (arrows.length > 0) {
            arrows.forEach((a) => {
                code += `    ${a.fromId} --> ${a.toId}\n`;
            });
        } else if (nodes.length > 1) {
            for (let i = 0; i < nodes.length - 1; i++) {
                code += `    ${nodes[i]!.id} -.-> ${nodes[i + 1]!.id}\n`;
            }
        }

        code += "```";
        return code;
    }

    exportSvg(fileName = `vectorcraft-${Date.now()}.svg`): string | null {
        if (this.existingShapes.length === 0) {
            alert("Canvas is empty. Draw some shapes before exporting!");
            return null;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const shape of this.existingShapes) {
            const bounds = this.getShapeBounds(shape);
            if (bounds.minX < minX) minX = bounds.minX;
            if (bounds.minY < minY) minY = bounds.minY;
            if (bounds.maxX > maxX) maxX = bounds.maxX;
            if (bounds.maxY > maxY) maxY = bounds.maxY;
        }

        const padding = 40;
        const width = Math.max(300, maxX - minX + padding * 2);
        const height = Math.max(200, maxY - minY + padding * 2);

        let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #0c0d11; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">\n`;
        svg += `  <defs>\n`;
        svg += `    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">\n`;
        svg += `      <path d="M 0 0 L 10 5 L 0 10 z" fill="#ffffff" />\n`;
        svg += `    </marker>\n`;
        svg += `  </defs>\n`;
        svg += `  <g transform="translate(${-minX + padding}, ${-minY + padding})">\n`;

        for (const shape of this.existingShapes) {
            const stroke = shape.strokeColor || "#ffffff";
            const strokeWidth = shape.strokeWidth || 2;

            if (shape.type === "rect") {
                svg += `    <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="8" fill="rgba(255,255,255,0.02)" stroke="${stroke}" stroke-width="${strokeWidth}" />\n`;
            } else if (shape.type === "circle") {
                svg += `    <circle cx="${shape.centerX}" cy="${shape.centerY}" r="${Math.abs(shape.radius)}" fill="rgba(255,255,255,0.02)" stroke="${stroke}" stroke-width="${strokeWidth}" />\n`;
            } else if (shape.type === "line") {
                svg += `    <line x1="${shape.startX}" y1="${shape.startY}" x2="${shape.endX}" y2="${shape.endY}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" />\n`;
            } else if (shape.type === "arrow") {
                svg += `    <line x1="${shape.startX}" y1="${shape.startY}" x2="${shape.endX}" y2="${shape.endY}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" marker-end="url(#arrow)" />\n`;
            } else if (shape.type === "pencil" && shape.points && shape.points.length > 0) {
                const pts = shape.points.map((p) => `${p.x},${p.y}`).join(" ");
                svg += `    <polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />\n`;
            } else if (shape.type === "text") {
                const lines = (shape.text || "").split("\n");
                const fs = shape.fontSize || 16;
                lines.forEach((line, i) => {
                    svg += `    <text x="${shape.x}" y="${shape.y + (i + 1) * fs * 1.2}" fill="${stroke}" font-size="${fs}" font-weight="bold">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>\n`;
                });
            }
        }

        svg += `  </g>\n</svg>`;

        const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return svg;
    }

    exportJson(fileName = `vectorcraft-${Date.now()}.json`): string {
        const payload = JSON.stringify(this.existingShapes, null, 2);
        const blob = new Blob([payload], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return payload;
    }

    commitText(
        id: string | undefined,
        text: string,
        worldX: number,
        worldY: number,
        fontSize: number = 20,
        color?: string
    ) {
        const trimmed = text.trim();
        if (!trimmed) {
            if (id) {
                this.deleteShapeById(id);
            }
            return;
        }

        if (id) {
            const shape = this.existingShapes.find((s) => s.id === id);
            if (shape && shape.type === "text") {
                this.undoStack.push(JSON.parse(JSON.stringify(this.existingShapes)));
                this.redoStack = [];
                shape.text = text;
                if (color) shape.strokeColor = color;
                this.selectedShapeId = shape.id;
                this.initialShapeState = JSON.parse(JSON.stringify(shape));
                this.onSelectionChange?.(shape);
                this.clearCanvas();
                this.syncShapeUpdate(shape);
            }
        } else {
            const newShape: Shape = {
                id: `shape-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                type: "text",
                x: worldX,
                y: worldY,
                text,
                fontSize,
                strokeColor: color || this.strokeColor,
            };

            this.undoStack.push([...this.existingShapes]);
            this.redoStack = [];
            this.existingShapes.push(newShape);
            this.selectedShapeId = newShape.id;
            this.initialShapeState = JSON.parse(JSON.stringify(newShape));
            this.onSelectionChange?.(newShape);
            this.clearCanvas();
            this.onShapesChange?.(this.existingShapes.length);

            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(
                    JSON.stringify({
                        type: "chat",
                        message: JSON.stringify({
                            shape: newShape,
                        }),
                        roomId: this.roomId,
                    })
                );
            }
        }
    }

    deleteShapeById(id: string) {
        this.undoStack.push([...this.existingShapes]);
        this.redoStack = [];
        this.existingShapes = this.existingShapes.filter((s) => s.id !== id);
        if (this.selectedShapeId === id) {
            this.selectedShapeId = null;
            this.initialShapeState = null;
            this.onSelectionChange?.(null);
        }
        this.clearCanvas();
        this.onShapesChange?.(this.existingShapes.length);

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(
                JSON.stringify({
                    type: "delete_shape",
                    shapeId: id,
                    roomId: this.roomId,
                })
            );
        }
    }

    async init() {
        const serverShapes = await getExistingShapes(this.roomId);
        // Merge server shapes with local shapes preserving order and avoiding duplicates
        const existingIds = new Set(this.existingShapes.map((s) => s.id).filter(Boolean));
        const merged = [...this.existingShapes];
        for (const s of serverShapes) {
            if (!s.id || !existingIds.has(s.id)) {
                merged.push(s);
            }
        }
        this.existingShapes = merged;

        if (this.existingShapes.length === 0) {
            const starterShapes = this.getStarterTemplateShapes();
            if (starterShapes.length > 0) {
                this.existingShapes = starterShapes;
                starterShapes.forEach((shape) => {
                    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                        this.socket.send(
                            JSON.stringify({
                                type: "chat",
                                message: JSON.stringify({ shape }),
                                roomId: this.roomId,
                            })
                        );
                    }
                });
            }
        }

        this.onShapesChange?.(this.existingShapes.length);
        this.clearCanvas();
    }

    private getStarterTemplateShapes(): Shape[] {
        const id = (prefix: string) => `tpl-${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const r = this.roomId.toLowerCase();

        if (r.includes("architecture")) {
            return [
                { id: id("t1"), type: "text", x: 200, y: 100, text: "System Architecture Overview", fontSize: 28, strokeColor: "#ffffff" },
                { id: id("r1"), type: "rect", x: 200, y: 180, width: 170, height: 90, strokeColor: "#3b82f6", strokeWidth: 2 },
                { id: id("t2"), type: "text", x: 220, y: 215, text: "Frontend App\n(Next.js 15)", fontSize: 16, strokeColor: "#3b82f6" },
                { id: id("r2"), type: "rect", x: 470, y: 180, width: 180, height: 90, strokeColor: "#a855f7", strokeWidth: 2 },
                { id: id("t3"), type: "text", x: 490, y: 215, text: "API Gateway\n(Express & WS)", fontSize: 16, strokeColor: "#a855f7" },
                { id: id("a1"), type: "arrow", startX: 370, startY: 225, endX: 470, endY: 225, strokeColor: "#ffffff", strokeWidth: 2 },
                { id: id("r3"), type: "rect", x: 750, y: 130, width: 170, height: 80, strokeColor: "#22c55e", strokeWidth: 2 },
                { id: id("t4"), type: "text", x: 770, y: 160, text: "Redis Pub/Sub\n(Broadcast)", fontSize: 16, strokeColor: "#22c55e" },
                { id: id("a2"), type: "arrow", startX: 650, startY: 210, endX: 750, endY: 170, strokeColor: "#22c55e", strokeWidth: 2 },
                { id: id("r4"), type: "rect", x: 750, y: 250, width: 170, height: 80, strokeColor: "#eab308", strokeWidth: 2 },
                { id: id("t5"), type: "text", x: 770, y: 280, text: "PostgreSQL DB\n(Prisma ORM)", fontSize: 16, strokeColor: "#eab308" },
                { id: id("a3"), type: "arrow", startX: 650, startY: 240, endX: 750, endY: 290, strokeColor: "#eab308", strokeWidth: 2 },
            ];
        }

        if (r.includes("database")) {
            return [
                { id: id("t1"), type: "text", x: 200, y: 100, text: "Database Schema (ER Diagram)", fontSize: 28, strokeColor: "#ffffff" },
                { id: id("r1"), type: "rect", x: 200, y: 180, width: 220, height: 160, strokeColor: "#3b82f6", strokeWidth: 2 },
                { id: id("t2"), type: "text", x: 220, y: 200, text: "User Table\n───────────────\nid: String (PK)\nemail: String\nname: String\npassword: Hash", fontSize: 15, strokeColor: "#3b82f6" },
                { id: id("r2"), type: "rect", x: 540, y: 180, width: 220, height: 160, strokeColor: "#a855f7", strokeWidth: 2 },
                { id: id("t3"), type: "text", x: 560, y: 200, text: "Room Table\n───────────────\nid: Int (PK)\nslug: String (Unique)\nadminId: String (FK)\ncreatedAt: DateTime", fontSize: 15, strokeColor: "#a855f7" },
                { id: id("a1"), type: "arrow", startX: 420, startY: 260, endX: 540, endY: 260, strokeColor: "#ffffff", strokeWidth: 2 },
            ];
        }

        if (r.includes("userflow")) {
            return [
                { id: id("t1"), type: "text", x: 200, y: 100, text: "User Journey & Onboarding Funnel", fontSize: 28, strokeColor: "#ffffff" },
                { id: id("c1"), type: "circle", centerX: 260, centerY: 230, radius: 45, strokeColor: "#22c55e", strokeWidth: 2 },
                { id: id("t2"), type: "text", x: 235, y: 220, text: "Start\nLanding", fontSize: 14, strokeColor: "#22c55e" },
                { id: id("a1"), type: "arrow", startX: 305, startY: 230, endX: 400, endY: 230, strokeColor: "#ffffff", strokeWidth: 2 },
                { id: id("r1"), type: "rect", x: 400, y: 190, width: 140, height: 80, strokeColor: "#3b82f6", strokeWidth: 2 },
                { id: id("t3"), type: "text", x: 425, y: 220, text: "Enter Room\nor Sign Up", fontSize: 14, strokeColor: "#3b82f6" },
                { id: id("a2"), type: "arrow", startX: 540, startY: 230, endX: 630, endY: 230, strokeColor: "#ffffff", strokeWidth: 2 },
                { id: id("r2"), type: "rect", x: 630, y: 190, width: 160, height: 80, strokeColor: "#eab308", strokeWidth: 2 },
                { id: id("t4"), type: "text", x: 650, y: 220, text: "Interactive Canvas\nCollaboration", fontSize: 14, strokeColor: "#eab308" },
            ];
        }

        if (r.includes("sprint")) {
            return [
                { id: id("t1"), type: "text", x: 200, y: 100, text: "Sprint Retrospective & Brainstorm", fontSize: 28, strokeColor: "#ffffff" },
                { id: id("r1"), type: "rect", x: 200, y: 180, width: 200, height: 200, strokeColor: "#22c55e", strokeWidth: 2 },
                { id: id("t2"), type: "text", x: 220, y: 200, text: "What Went Well\n───────────────\n• Fast WebSocket sync\n• Clean dark theme\n• Snappy peer cursors", fontSize: 14, strokeColor: "#22c55e" },
                { id: id("r2"), type: "rect", x: 450, y: 180, width: 200, height: 200, strokeColor: "#ef4444", strokeWidth: 2 },
                { id: id("t3"), type: "text", x: 470, y: 200, text: "What to Improve\n───────────────\n• Mobile touch latency\n• More diagram icons\n• PDF export support", fontSize: 14, strokeColor: "#ef4444" },
                { id: id("r3"), type: "rect", x: 700, y: 180, width: 200, height: 200, strokeColor: "#3b82f6", strokeWidth: 2 },
                { id: id("t4"), type: "text", x: 720, y: 200, text: "Action Items\n───────────────\n• Add Redis cluster\n• Expand templates\n• Ship v2.0", fontSize: 14, strokeColor: "#3b82f6" },
            ];
        }

        return [];
    }

    initHandlers() {
        // Guarantee socket joins room and receives init handshake
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(
                JSON.stringify({
                    type: "join_room",
                    roomId: this.roomId,
                    userName: this.userName,
                })
            );
        }

        this.socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                if (message.type === "init") {
                    this.myConnectionId = message.connectionId;
                    this.myColor = message.color;
                    return;
                }

                if (message.type === "cursor_move") {
                    if (!message.connectionId || (this.myConnectionId && message.connectionId === this.myConnectionId)) return;
                    const existing = this.peerCursors.get(message.connectionId);
                    if (existing) {
                        existing.targetX = message.x;
                        existing.targetY = message.y;
                        existing.userName = message.userName || existing.userName;
                        existing.color = message.color || existing.color;
                        existing.lastSeen = Date.now();
                    } else {
                        this.peerCursors.set(message.connectionId, {
                            connectionId: message.connectionId,
                            userName: message.userName || "Collaborator",
                            color: message.color || "#3b82f6",
                            targetX: message.x,
                            targetY: message.y,
                            currentX: message.x,
                            currentY: message.y,
                            lastSeen: Date.now(),
                        });
                    }
                    this.clearCanvas();
                    return;
                }

                if (message.type === "cursor_leave") {
                    // Do not delete cursor instantly; keep last position until presence update or timeout
                    return;
                }

                if (message.type === "presence_update") {
                    if (Array.isArray(message.users)) {
                        const activeIds = new Set(message.users.map((u: any) => u.connectionId));
                        for (const [id] of this.peerCursors.entries()) {
                            if (!activeIds.has(id)) {
                                this.peerCursors.delete(id);
                            }
                        }
                        this.onPresenceChange?.(message.users);
                        this.clearCanvas();
                    }
                    return;
                }

                if (message.type === "chat") {
                    const parsedShape = JSON.parse(message.message);
                    if (parsedShape && parsedShape.shape) {
                        const newShape: Shape = parsedShape.shape;
                        // Avoid adding duplicates if shape already exists
                        if (newShape.id && this.existingShapes.some((s) => s.id === newShape.id)) {
                            return;
                        }
                        this.existingShapes.push(newShape);
                        this.clearCanvas();
                        this.onShapesChange?.(this.existingShapes.length);
                    }
                } else if (message.type === "update_shape") {
                    const updated: Shape = message.shape;
                    if (updated && updated.id) {
                        const idx = this.existingShapes.findIndex((s) => s.id === updated.id);
                        if (idx !== -1) {
                            this.existingShapes[idx] = updated;
                            if (this.selectedShapeId === updated.id && !this.isDraggingShape) {
                                this.initialShapeState = JSON.parse(JSON.stringify(updated));
                                this.onSelectionChange?.(updated);
                            }
                            this.clearCanvas();
                        }
                    }
                } else if (message.type === "delete_shape") {
                    this.existingShapes = this.existingShapes.filter((s) => s.id !== message.shapeId);
                    if (this.selectedShapeId === message.shapeId) {
                        this.selectedShapeId = null;
                        this.initialShapeState = null;
                        this.onSelectionChange?.(null);
                    }
                    this.clearCanvas();
                    this.onShapesChange?.(this.existingShapes.length);
                } else if (message.type === "clear_canvas") {
                    this.existingShapes = [];
                    this.selectedShapeId = null;
                    this.initialShapeState = null;
                    this.onSelectionChange?.(null);
                    this.clearCanvas();
                    this.onShapesChange?.(0);
                }
            } catch (e) {
                console.error("Error processing socket message:", e);
            }
        };
    }

    private updateCursor() {
        if (this.isSpacePressed || this.selectedTool === "hand") {
            this.canvas.style.cursor = this.isPanning ? "grabbing" : "grab";
        } else if (this.selectedTool === "select") {
            this.canvas.style.cursor = this.isDraggingShape ? "grabbing" : "default";
        } else if (this.selectedTool === "eraser") {
            this.canvas.style.cursor = "pointer";
        } else if (this.selectedTool === "text") {
            this.canvas.style.cursor = "text";
        } else {
            this.canvas.style.cursor = "crosshair";
        }
    }

    toWorld(screenX: number, screenY: number): Point {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = screenX - rect.left;
        const clientY = screenY - rect.top;
        return {
            x: (clientX - this.panOffset.x) / this.zoom,
            y: (clientY - this.panOffset.y) / this.zoom,
        };
    }

    private drawGrid() {
        const step = 40;
        const left = -this.panOffset.x / this.zoom;
        const top = -this.panOffset.y / this.zoom;
        const right = left + this.canvas.width / this.zoom;
        const bottom = top + this.canvas.height / this.zoom;

        const startX = Math.floor(left / step) * step;
        const startY = Math.floor(top / step) * step;

        this.ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        for (let x = startX; x < right; x += step) {
            for (let y = startY; y < bottom; y += step) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, 1.2 / Math.min(this.zoom, 2), 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "#0c0d11";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Save context and apply Pan & Zoom transform (World Space)
        this.ctx.save();
        this.ctx.translate(this.panOffset.x, this.panOffset.y);
        this.ctx.scale(this.zoom, this.zoom);

        // Draw dot grid
        this.drawGrid();

        // Render all committed shapes
        this.existingShapes.forEach((shape) => {
            this.renderShape(shape);
        });

        // Render selection bounding box if a shape is selected
        if (this.selectedShapeId) {
            const selected = this.existingShapes.find((s) => s.id === this.selectedShapeId);
            if (selected) {
                this.renderSelectionBox(selected);
            }
        }

        // Live preview of active shape being drawn
        if (this.clicked && !this.isPanning && this.selectedTool !== "eraser" && this.selectedTool !== "select" && this.selectedTool !== "text") {
            const previewShape = this.createCurrentShape(this.currentWorldPoint, false);
            if (previewShape) {
                this.renderShape(previewShape);
            }
        }

        // Magnetic smart snap anchor indicator
        if (this.activeSnapAnchor) {
            this.ctx.save();
            this.ctx.fillStyle = "#38bdf8";
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 2 / this.zoom;
            this.ctx.beginPath();
            this.ctx.arc(this.activeSnapAnchor.x, this.activeSnapAnchor.y, 6 / this.zoom, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();

            // Outer subtle pulse ring
            this.ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
            this.ctx.lineWidth = 1.5 / this.zoom;
            this.ctx.beginPath();
            this.ctx.arc(this.activeSnapAnchor.x, this.activeSnapAnchor.y, 11 / this.zoom, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        }

        this.ctx.restore();

        // Render multiplayer peer cursors (Screen Space - zoom invariant)
        this.renderPeerCursors();
    }

    private getShapeBounds(shape: Shape): { minX: number; minY: number; maxX: number; maxY: number } {
        if (shape.type === "rect") {
            return {
                minX: Math.min(shape.x, shape.x + shape.width),
                minY: Math.min(shape.y, shape.y + shape.height),
                maxX: Math.max(shape.x, shape.x + shape.width),
                maxY: Math.max(shape.y, shape.y + shape.height),
            };
        } else if (shape.type === "circle") {
            return {
                minX: shape.centerX - Math.abs(shape.radius),
                minY: shape.centerY - Math.abs(shape.radius),
                maxX: shape.centerX + Math.abs(shape.radius),
                maxY: shape.centerY + Math.abs(shape.radius),
            };
        } else if (shape.type === "line" || shape.type === "arrow") {
            return {
                minX: Math.min(shape.startX, shape.endX),
                minY: Math.min(shape.startY, shape.endY),
                maxX: Math.max(shape.startX, shape.endX),
                maxY: Math.max(shape.startY, shape.endY),
            };
        } else if (shape.type === "pencil") {
            if (shape.points && shape.points.length > 0) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                for (const pt of shape.points) {
                    if (pt.x < minX) minX = pt.x;
                    if (pt.y < minY) minY = pt.y;
                    if (pt.x > maxX) maxX = pt.x;
                    if (pt.y > maxY) maxY = pt.y;
                }
                return { minX, minY, maxX, maxY };
            }
        } else if (shape.type === "text") {
            const fontSize = shape.fontSize || 20;
            this.ctx.save();
            this.ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            const lines = (shape.text || "").split("\n");
            let maxWidth = 0;
            for (const line of lines) {
                const width = this.ctx.measureText(line).width;
                if (width > maxWidth) maxWidth = width;
            }
            this.ctx.restore();
            const lineHeight = fontSize * 1.3;
            const totalHeight = Math.max(lineHeight, lines.length * lineHeight);
            return {
                minX: shape.x,
                minY: shape.y,
                maxX: shape.x + Math.max(10, maxWidth),
                maxY: shape.y + totalHeight,
            };
        }
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    private renderSelectionBox(shape: Shape) {
        const bounds = this.getShapeBounds(shape);
        const pad = 6 / this.zoom;
        const x = bounds.minX - pad;
        const y = bounds.minY - pad;
        const width = (bounds.maxX - bounds.minX) + pad * 2;
        const height = (bounds.maxY - bounds.minY) + pad * 2;

        this.ctx.save();
        // Dashed selection border
        this.ctx.strokeStyle = "#3b82f6";
        this.ctx.lineWidth = 1.5 / this.zoom;
        this.ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);
        this.ctx.strokeRect(x, y, width, height);

        // Selection handle corners
        this.ctx.setLineDash([]);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.strokeStyle = "#3b82f6";
        this.ctx.lineWidth = 1.5 / this.zoom;
        const handleSize = 7 / this.zoom;

        const corners = [
            { cx: x, cy: y },
            { cx: x + width, cy: y },
            { cx: x, cy: y + height },
            { cx: x + width, cy: y + height },
        ];

        corners.forEach((c) => {
            this.ctx.fillRect(c.cx - handleSize / 2, c.cy - handleSize / 2, handleSize, handleSize);
            this.ctx.strokeRect(c.cx - handleSize / 2, c.cy - handleSize / 2, handleSize, handleSize);
        });

        this.ctx.restore();
    }

    findShapeAt(point: Point): Shape | null {
        const tolerance = 12 / this.zoom;

        for (let i = this.existingShapes.length - 1; i >= 0; i--) {
            const shape = this.existingShapes[i];
            if (!shape) continue;

            if (shape.type === "rect") {
                const minX = Math.min(shape.x, shape.x + shape.width);
                const maxX = Math.max(shape.x, shape.x + shape.width);
                const minY = Math.min(shape.y, shape.y + shape.height);
                const maxY = Math.max(shape.y, shape.y + shape.height);
                if (
                    point.x >= minX - tolerance &&
                    point.x <= maxX + tolerance &&
                    point.y >= minY - tolerance &&
                    point.y <= maxY + tolerance
                ) {
                    return shape;
                }
            } else if (shape.type === "circle") {
                const dist = Math.hypot(point.x - shape.centerX, point.y - shape.centerY);
                if (dist <= Math.abs(shape.radius) + tolerance) {
                    return shape;
                }
            } else if (shape.type === "line" || shape.type === "arrow") {
                const start = { x: shape.startX, y: shape.startY };
                const end = { x: shape.endX, y: shape.endY };
                if (this.distToSegment(point, start, end) <= tolerance) {
                    return shape;
                }
            } else if (shape.type === "pencil") {
                if (shape.points && shape.points.length > 0) {
                    for (let j = 0; j < shape.points.length - 1; j++) {
                        if (this.distToSegment(point, shape.points[j]!, shape.points[j + 1]!) <= tolerance) {
                            return shape;
                        }
                    }
                }
            } else if (shape.type === "text") {
                const bounds = this.getShapeBounds(shape);
                if (
                    point.x >= bounds.minX - tolerance &&
                    point.x <= bounds.maxX + tolerance &&
                    point.y >= bounds.minY - tolerance &&
                    point.y <= bounds.maxY + tolerance
                ) {
                    return shape;
                }
            }
        }
        return null;
    }

    private renderPeerCursors() {
        this.peerCursors.forEach((cursor) => {
            // Project world coordinates to screen space
            const screenX = cursor.currentX * this.zoom + this.panOffset.x;
            const screenY = cursor.currentY * this.zoom + this.panOffset.y;

            // Skip rendering if outside viewport
            if (
                screenX < -60 ||
                screenX > this.canvas.width + 60 ||
                screenY < -60 ||
                screenY > this.canvas.height + 60
            ) {
                return;
            }

            this.ctx.save();
            this.ctx.translate(screenX, screenY);

            // 1. Draw modern SVG-style pointer arrow
            const color = cursor.color || "#3b82f6";
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(0, 16);
            this.ctx.lineTo(4.5, 12.5);
            this.ctx.lineTo(9.5, 20);
            this.ctx.lineTo(12.5, 18.5);
            this.ctx.lineTo(7.5, 11);
            this.ctx.lineTo(13.5, 11);
            this.ctx.closePath();

            this.ctx.fillStyle = color;
            this.ctx.fill();
            this.ctx.strokeStyle = "#ffffff";
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();

            // 2. Draw user name badge tag
            const name = cursor.userName || "Collaborator";
            this.ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            const textMetrics = this.ctx.measureText(name);
            const textWidth = textMetrics.width;
            const paddingX = 6;
            const badgeHeight = 18;
            const badgeWidth = textWidth + paddingX * 2;
            const badgeX = 14;
            const badgeY = 12;
            const radius = 4;

            // Draw badge background pill with cursor's assigned color
            this.ctx.beginPath();
            if (typeof this.ctx.roundRect === "function") {
                this.ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, radius);
            } else {
                this.ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
            }
            this.ctx.fillStyle = color;
            this.ctx.fill();

            // Badge border
            this.ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // Badge text
            this.ctx.fillStyle = "#ffffff";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(name, badgeX + paddingX, badgeY + badgeHeight / 2);

            this.ctx.restore();
        });
    }

    private renderShape(shape: Shape) {
        this.ctx.strokeStyle = shape.strokeColor || "#ffffff";
        this.ctx.lineWidth = shape.strokeWidth || 2;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";

        if (shape.type === "rect") {
            this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        } else if (shape.type === "circle") {
            this.ctx.beginPath();
            this.ctx.arc(shape.centerX, shape.centerY, Math.abs(shape.radius), 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.closePath();
        } else if (shape.type === "pencil") {
            if (shape.points && shape.points.length > 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(shape.points[0].x, shape.points[0].y);
                for (let i = 1; i < shape.points.length; i++) {
                    this.ctx.lineTo(shape.points[i].x, shape.points[i].y);
                }
                this.ctx.stroke();
                this.ctx.closePath();
            } else if (shape.startX !== undefined && shape.startY !== undefined) {
                // Backwards compatibility for straight-line pencil
                this.ctx.beginPath();
                this.ctx.moveTo(shape.startX, shape.startY);
                this.ctx.lineTo(shape.endX ?? shape.startX, shape.endY ?? shape.startY);
                this.ctx.stroke();
                this.ctx.closePath();
            }
        } else if (shape.type === "line") {
            this.ctx.beginPath();
            this.ctx.moveTo(shape.startX, shape.startY);
            this.ctx.lineTo(shape.endX, shape.endY);
            this.ctx.stroke();
            this.ctx.closePath();
        } else if (shape.type === "arrow") {
            this.drawArrow(shape.startX, shape.startY, shape.endX, shape.endY, shape.strokeWidth || 2);
        } else if (shape.type === "text") {
            this.renderText(shape);
        }
    }

    private renderText(shape: { x: number; y: number; text: string; fontSize?: number; strokeColor?: string }) {
        const fontSize = shape.fontSize || 20;
        this.ctx.save();
        this.ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        this.ctx.fillStyle = shape.strokeColor || "#ffffff";
        this.ctx.textBaseline = "top";
        const lineHeight = fontSize * 1.3;
        const lines = (shape.text || "").split("\n");
        for (let i = 0; i < lines.length; i++) {
            this.ctx.fillText(lines[i] || "", shape.x, shape.y + i * lineHeight);
        }
        this.ctx.restore();
    }

    private drawArrow(fromX: number, fromY: number, toX: number, toY: number, strokeWidth: number) {
        const headLength = Math.max(12, strokeWidth * 3.5);
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);

        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(
            toX - headLength * Math.cos(angle - Math.PI / 6),
            toY - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(
            toX - headLength * Math.cos(angle + Math.PI / 6),
            toY - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.stroke();
        this.ctx.closePath();
    }

    private eraseAtPoint(worldPoint: Point) {
        const tolerance = 15 / this.zoom;
        const initialCount = this.existingShapes.length;
        const previousShapes = [...this.existingShapes];
        const removedShapes: Shape[] = [];

        this.existingShapes = this.existingShapes.filter((shape) => {
            let hit = false;
            if (shape.type === "rect") {
                const minX = Math.min(shape.x, shape.x + shape.width);
                const maxX = Math.max(shape.x, shape.x + shape.width);
                const minY = Math.min(shape.y, shape.y + shape.height);
                const maxY = Math.max(shape.y, shape.y + shape.height);
                hit =
                    worldPoint.x >= minX - tolerance &&
                    worldPoint.x <= maxX + tolerance &&
                    worldPoint.y >= minY - tolerance &&
                    worldPoint.y <= maxY + tolerance;
            } else if (shape.type === "circle") {
                const dist = Math.hypot(worldPoint.x - shape.centerX, worldPoint.y - shape.centerY);
                hit = Math.abs(dist - shape.radius) <= tolerance || dist <= shape.radius;
            } else if (shape.type === "pencil") {
                if (shape.points && shape.points.length > 0) {
                    for (let i = 0; i < shape.points.length - 1; i++) {
                        if (this.distToSegment(worldPoint, shape.points[i], shape.points[i + 1]) < tolerance) {
                            hit = true;
                            break;
                        }
                    }
                } else if (shape.startX !== undefined && shape.startY !== undefined) {
                    const start = { x: shape.startX, y: shape.startY };
                    const end = { x: shape.endX ?? shape.startX, y: shape.endY ?? shape.startY };
                    hit = this.distToSegment(worldPoint, start, end) < tolerance;
                }
            } else if (shape.type === "line" || shape.type === "arrow") {
                const start = { x: shape.startX, y: shape.startY };
                const end = { x: shape.endX, y: shape.endY };
                hit = this.distToSegment(worldPoint, start, end) < tolerance;
            } else if (shape.type === "text") {
                const bounds = this.getShapeBounds(shape);
                hit =
                    worldPoint.x >= bounds.minX - tolerance &&
                    worldPoint.x <= bounds.maxX + tolerance &&
                    worldPoint.y >= bounds.minY - tolerance &&
                    worldPoint.y <= bounds.maxY + tolerance;
            }

            if (hit) {
                removedShapes.push(shape);
                return false;
            }
            return true;
        });

        if (this.existingShapes.length !== initialCount) {
            this.undoStack.push(previousShapes);
            this.redoStack = [];
            this.clearCanvas();
            this.onShapesChange?.(this.existingShapes.length);

            // Broadcast deletions to other tabs
            removedShapes.forEach((shape) => {
                if (shape.id && this.socket.readyState === WebSocket.OPEN) {
                    this.socket.send(
                        JSON.stringify({
                            type: "delete_shape",
                            shapeId: shape.id,
                            roomId: this.roomId,
                        })
                    );
                }
            });
        }
    }

    private distToSegment(p: Point, v: Point, w: Point): number {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }

    mouseDownHandler = (e: MouseEvent) => {
        // Middle click (button === 1) or Spacebar held or Hand tool initiates panning
        if (e.button === 1 || this.isSpacePressed || this.selectedTool === "hand") {
            this.isPanning = true;
            this.panStartScreen = { x: e.clientX, y: e.clientY };
            this.updateCursor();
            return;
        }

        if (e.button !== 0) return; // Only process left click for drawing

        const worldPos = this.toWorld(e.clientX, e.clientY);
        this.startWorldPoint = worldPos;
        this.currentWorldPoint = worldPos;

        if (this.selectedTool === "select") {
            const hit = this.findShapeAt(worldPos);
            if (hit) {
                this.selectedShapeId = hit.id || null;
                this.initialShapeState = JSON.parse(JSON.stringify(hit));
                this.isDraggingShape = true;
                this.dragStartWorld = worldPos;
                this.onSelectionChange?.(hit);
            } else {
                this.selectedShapeId = null;
                this.initialShapeState = null;
                this.isDraggingShape = false;
                this.onSelectionChange?.(null);
            }
            this.clearCanvas();
            this.updateCursor();
            return;
        }

        if (this.selectedTool === "text") {
            const hit = this.findShapeAt(worldPos);
            if (hit && hit.type === "text") {
                this.onStartTextEdit?.({
                    id: hit.id,
                    worldX: hit.x,
                    worldY: hit.y,
                    initialText: hit.text,
                    fontSize: hit.fontSize || 20,
                    color: hit.strokeColor || this.strokeColor,
                });
            } else {
                this.onStartTextEdit?.({
                    worldX: worldPos.x,
                    worldY: worldPos.y,
                    initialText: "",
                    fontSize: 20,
                    color: this.strokeColor,
                });
            }
            return;
        }

        if (this.selectedTool === "line" || this.selectedTool === "arrow") {
            const snap = this.findSnapAnchor(worldPos);
            if (snap) {
                worldPos = snap;
                this.startWorldPoint = snap;
                this.currentWorldPoint = snap;
            }
        }

        this.clicked = true;

        if (this.selectedTool === "eraser") {
            this.eraseAtPoint(worldPos);
            return;
        }

        if (this.selectedTool === "pencil") {
            this.currentPencilPoints = [worldPos];
        }
    };

    dblClickHandler = (e: MouseEvent) => {
        const worldPos = this.toWorld(e.clientX, e.clientY);
        const hit = this.findShapeAt(worldPos);
        if (hit && hit.type === "text") {
            this.onStartTextEdit?.({
                id: hit.id,
                worldX: hit.x,
                worldY: hit.y,
                initialText: hit.text,
                fontSize: hit.fontSize || 20,
                color: hit.strokeColor || this.strokeColor,
            });
        }
    };

    private broadcastCursor(worldPos: Point) {
        const now = performance.now();
        if (now - this.lastCursorBroadcast < 30) {
            return;
        }
        this.lastCursorBroadcast = now;

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(
                JSON.stringify({
                    type: "cursor_move",
                    roomId: this.roomId,
                    x: Math.round(worldPos.x * 10) / 10,
                    y: Math.round(worldPos.y * 10) / 10,
                })
            );
        }
    }

    mouseLeaveHandler = () => {
        // Do not immediately vanish cursor on mouseleave so alt-tabbing or dual-screen testing still shows last position
    };

    mouseMoveHandler = (e: MouseEvent) => {
        const worldPos = this.toWorld(e.clientX, e.clientY);
        this.broadcastCursor(worldPos);

        if (this.isPanning) {
            const dx = e.clientX - this.panStartScreen.x;
            const dy = e.clientY - this.panStartScreen.y;
            this.panOffset.x += dx;
            this.panOffset.y += dy;
            this.panStartScreen = { x: e.clientX, y: e.clientY };
            this.clearCanvas();
            return;
        }

        if (this.selectedTool === "select") {
            if (this.isDraggingShape && this.selectedShapeId && this.initialShapeState) {
                const dx = worldPos.x - this.dragStartWorld.x;
                const dy = worldPos.y - this.dragStartWorld.y;

                const shape = this.existingShapes.find((s) => s.id === this.selectedShapeId);
                const init = this.initialShapeState;
                if (shape && init) {
                    if (shape.type === "rect" && init.type === "rect") {
                        shape.x = init.x + dx;
                        shape.y = init.y + dy;
                    } else if (shape.type === "circle" && init.type === "circle") {
                        shape.centerX = init.centerX + dx;
                        shape.centerY = init.centerY + dy;
                    } else if (
                        (shape.type === "line" || shape.type === "arrow") &&
                        (init.type === "line" || init.type === "arrow")
                    ) {
                        shape.startX = init.startX + dx;
                        shape.startY = init.startY + dy;
                        shape.endX = init.endX + dx;
                        shape.endY = init.endY + dy;
                    } else if (shape.type === "pencil" && init.type === "pencil") {
                        if (init.points) {
                            shape.points = init.points.map((p) => ({
                                x: p.x + dx,
                                y: p.y + dy,
                            }));
                        }
                    } else if (shape.type === "text" && init.type === "text") {
                        shape.x = init.x + dx;
                        shape.y = init.y + dy;
                    }
                    this.clearCanvas();
                }
            } else {
                const hit = this.findShapeAt(worldPos);
                if (hit) {
                    this.canvas.style.cursor = "move";
                } else {
                    this.canvas.style.cursor = "default";
                }
            }
            return;
        }

        if (this.selectedTool === "line" || this.selectedTool === "arrow") {
            const snap = this.findSnapAnchor(worldPos);
            this.activeSnapAnchor = snap;
            if (snap) {
                worldPos = snap;
            }
        } else {
            this.activeSnapAnchor = null;
        }

        if (!this.clicked) {
            if (this.activeSnapAnchor) {
                this.clearCanvas();
            }
            return;
        }

        this.currentWorldPoint = worldPos;

        if (this.selectedTool === "eraser") {
            this.eraseAtPoint(worldPos);
            return;
        }

        if (this.selectedTool === "pencil") {
            this.currentPencilPoints.push(worldPos);
        }

        this.clearCanvas();
    };

    mouseUpHandler = (e: MouseEvent) => {
        if (this.isPanning) {
            this.isPanning = false;
            this.updateCursor();
            return;
        }

        if (this.selectedTool === "select") {
            if (this.isDraggingShape && this.selectedShapeId && this.initialShapeState) {
                const worldPos = this.toWorld(e.clientX, e.clientY);
                const dx = worldPos.x - this.dragStartWorld.x;
                const dy = worldPos.y - this.dragStartWorld.y;

                if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                    const previousShapes = this.existingShapes.map((s) =>
                        s.id === this.selectedShapeId ? { ...this.initialShapeState! } : { ...s }
                    );
                    this.undoStack.push(previousShapes);
                    this.redoStack = [];

                    const updatedShape = this.existingShapes.find((s) => s.id === this.selectedShapeId);
                    if (updatedShape) {
                        this.initialShapeState = JSON.parse(JSON.stringify(updatedShape));
                        this.syncShapeUpdate(updatedShape);
                    }
                }
                this.isDraggingShape = false;
                this.updateCursor();
                this.clearCanvas();
            }
            return;
        }

        if (!this.clicked) return;
        this.clicked = false;

        if (this.selectedTool === "eraser") {
            return;
        }

        let worldPos = this.toWorld(e.clientX, e.clientY);
        if (this.selectedTool === "line" || this.selectedTool === "arrow") {
            const snap = this.findSnapAnchor(worldPos);
            if (snap) {
                worldPos = snap;
            }
        }
        this.activeSnapAnchor = null;
        const finalShape = this.createCurrentShape(worldPos, true);

        if (!finalShape) return;

        // Save current state for undo
        this.undoStack.push([...this.existingShapes]);
        this.redoStack = [];

        this.existingShapes.push(finalShape);
        this.currentPencilPoints = [];
        this.clearCanvas();
        this.onShapesChange?.(this.existingShapes.length);

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(
                JSON.stringify({
                    type: "chat",
                    message: JSON.stringify({
                        shape: finalShape,
                    }),
                    roomId: this.roomId,
                })
            );
        }
    };

    private createCurrentShape(endPoint: Point, assignId = false): Shape | null {
        const start = this.startWorldPoint;
        const color = this.strokeColor;
        const width = this.strokeWidth;
        const id = assignId ? `shape-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` : undefined;

        if (this.selectedTool === "rect") {
            const x = Math.min(start.x, endPoint.x);
            const y = Math.min(start.y, endPoint.y);
            const w = Math.abs(endPoint.x - start.x);
            const h = Math.abs(endPoint.y - start.y);
            if (w < 1 && h < 1) return null;
            return {
                id,
                type: "rect",
                x,
                y,
                width: w,
                height: h,
                strokeColor: color,
                strokeWidth: width,
            };
        } else if (this.selectedTool === "circle") {
            const w = endPoint.x - start.x;
            const h = endPoint.y - start.y;
            const radius = Math.max(Math.abs(w), Math.abs(h)) / 2;
            const centerX = Math.min(start.x, endPoint.x) + Math.abs(w) / 2;
            const centerY = Math.min(start.y, endPoint.y) + Math.abs(h) / 2;
            if (radius < 1) return null;
            return {
                id,
                type: "circle",
                radius,
                centerX,
                centerY,
                strokeColor: color,
                strokeWidth: width,
            };
        } else if (this.selectedTool === "pencil") {
            if (this.currentPencilPoints.length === 0) return null;
            const pts =
                this.currentPencilPoints.length === 1 && this.currentPencilPoints[0]
                    ? [
                          this.currentPencilPoints[0],
                          {
                              x: this.currentPencilPoints[0].x + 0.2,
                              y: this.currentPencilPoints[0].y + 0.2,
                          },
                      ]
                    : [...this.currentPencilPoints];
            return {
                id,
                type: "pencil",
                points: pts,
                strokeColor: color,
                strokeWidth: width,
            };
        } else if (this.selectedTool === "line") {
            if (Math.hypot(endPoint.x - start.x, endPoint.y - start.y) < 1) return null;
            return {
                id,
                type: "line",
                startX: start.x,
                startY: start.y,
                endX: endPoint.x,
                endY: endPoint.y,
                strokeColor: color,
                strokeWidth: width,
            };
        } else if (this.selectedTool === "arrow") {
            if (Math.hypot(endPoint.x - start.x, endPoint.y - start.y) < 1) return null;
            return {
                id,
                type: "arrow",
                startX: start.x,
                startY: start.y,
                endX: endPoint.x,
                endY: endPoint.y,
                strokeColor: color,
                strokeWidth: width,
            };
        }

        return null;
    }

    wheelHandler = (e: WheelEvent) => {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (e.ctrlKey || e.metaKey) {
            // Pinch to zoom
            const zoomDelta = e.deltaY < 0 ? 1.08 : 0.92;
            const newZoom = Math.min(Math.max(0.1, this.zoom * zoomDelta), 8);
            this.panOffset.x = mouseX - (mouseX - this.panOffset.x) * (newZoom / this.zoom);
            this.panOffset.y = mouseY - (mouseY - this.panOffset.y) * (newZoom / this.zoom);
            this.zoom = newZoom;
        } else {
            // Trackpad / mouse pan
            this.panOffset.x -= e.deltaX;
            this.panOffset.y -= e.deltaY;
        }

        this.clearCanvas();
        this.onZoomChange?.(this.zoom);
    };

    keyDownHandler = (e: KeyboardEvent) => {
        // Never process hotkeys or deletions when user is typing inside an input or textarea
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        if (e.code === "Space" && !this.isSpacePressed) {
            this.isSpacePressed = true;
            this.updateCursor();
        }

        // Delete selected shape (Delete or Backspace)
        if ((e.key === "Delete" || e.key === "Backspace") && this.selectedShapeId) {
            e.preventDefault();
            this.deleteSelectedShape();
            return;
        }

        // Deselect on Escape
        if (e.key === "Escape" && this.selectedShapeId) {
            e.preventDefault();
            this.selectedShapeId = null;
            this.initialShapeState = null;
            this.onSelectionChange?.(null);
            this.clearCanvas();
            return;
        }

        // Undo (Ctrl+Z)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
            e.preventDefault();
            this.undo();
            return;
        }

        // Redo (Ctrl+Y or Ctrl+Shift+Z)
        if (
            ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
            ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
        ) {
            e.preventDefault();
            this.redo();
            return;
        }

        // Quick tool hotkeys
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            const key = e.key.toLowerCase();
            if (key === "v" || key === "1") this.setTool("select");
            else if (key === "h" || key === "2") this.setTool("hand");
            else if (key === "p" || key === "3") this.setTool("pencil");
            else if (key === "r" || key === "4") this.setTool("rect");
            else if (key === "c" || key === "5") this.setTool("circle");
            else if (key === "l" || key === "6") this.setTool("line");
            else if (key === "a" || key === "7") this.setTool("arrow");
            else if (key === "t" || key === "8") this.setTool("text");
            else if (key === "e" || key === "0") this.setTool("eraser");
        }
    };

    keyUpHandler = (e: KeyboardEvent) => {
        if (e.code === "Space") {
            this.isSpacePressed = false;
            this.updateCursor();
        }
    };

    undo() {
        if (this.existingShapes.length === 0) return;
        const last = this.existingShapes.pop();
        if (last) {
            this.redoStack.push([last]);
            this.clearCanvas();
            this.onShapesChange?.(this.existingShapes.length);

            // Broadcast shape deletion to other tabs
            if (last.id && this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(
                    JSON.stringify({
                        type: "delete_shape",
                        shapeId: last.id,
                        roomId: this.roomId,
                    })
                );
            }
        }
    }

    redo() {
        const next = this.redoStack.pop();
        if (next && next[0]) {
            const restored = next[0];
            this.existingShapes.push(restored);
            this.clearCanvas();
            this.onShapesChange?.(this.existingShapes.length);

            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(
                    JSON.stringify({
                        type: "chat",
                        message: JSON.stringify({
                            shape: restored,
                        }),
                        roomId: this.roomId,
                    })
                );
            }
        }
    }

    clearRoom() {
        this.existingShapes = [];
        this.clearCanvas();
        this.onShapesChange?.(0);

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(
                JSON.stringify({
                    type: "clear_canvas",
                    roomId: this.roomId,
                })
            );
        }
    }

    touchStartHandler = (e: TouchEvent) => {
        if (e.touches.length === 1 && e.touches[0]) {
            const touch = e.touches[0];
            this.mouseDownHandler({
                clientX: touch.clientX,
                clientY: touch.clientY,
                button: 0,
            } as MouseEvent);
        }
    };

    touchMoveHandler = (e: TouchEvent) => {
        if (e.touches.length === 1 && e.touches[0]) {
            const touch = e.touches[0];
            this.mouseMoveHandler({
                clientX: touch.clientX,
                clientY: touch.clientY,
            } as MouseEvent);
        }
    };

    touchEndHandler = () => {
        const screenPos = this.toScreen(this.currentWorldPoint.x, this.currentWorldPoint.y);
        this.mouseUpHandler({
            clientX: screenPos.x,
            clientY: screenPos.y,
            button: 0,
        } as MouseEvent);
    };

    windowBlurHandler = () => {
        this.isSpacePressed = false;
        this.isPanning = false;
        this.updateCursor();
    };

    initMouseHandlers() {
        this.canvas.addEventListener("mousedown", this.mouseDownHandler);
        this.canvas.addEventListener("mouseup", this.mouseUpHandler);
        this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
        this.canvas.addEventListener("mouseleave", this.mouseLeaveHandler);
        this.canvas.addEventListener("dblclick", this.dblClickHandler);
        this.canvas.addEventListener("wheel", this.wheelHandler, { passive: false });
        this.canvas.addEventListener("touchstart", this.touchStartHandler, { passive: true });
        this.canvas.addEventListener("touchmove", this.touchMoveHandler, { passive: true });
        this.canvas.addEventListener("touchend", this.touchEndHandler);
        window.addEventListener("blur", this.windowBlurHandler);
    }

    initKeyHandlers() {
        window.addEventListener("keydown", this.keyDownHandler);
        window.addEventListener("keyup", this.keyUpHandler);
    }
}