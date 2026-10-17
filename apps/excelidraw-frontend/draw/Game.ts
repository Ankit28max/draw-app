import { getExistingShapes } from "./http";

export type Tool = "select" | "hand" | "pencil" | "rect" | "circle" | "line" | "arrow" | "text" | "eraser";

export type Point = {
    x: number;
    y: number;
};

export type ResizeHandle = "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w" | "start" | "end";

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
      }
    | {
          id?: string;
          type: "tech_node";
          x: number;
          y: number;
          width: number;
          height: number;
          nodeType: TechNodeType;
          title: string;
          subtitle?: string;
          specs?: string[];
          strokeColor?: string;
          strokeWidth?: number;
      };

export type TechNodeType = "database" | "redis" | "service" | "queue" | "cloud" | "security" | "terminal" | "client" | "ec2" | "server" | "load_balancer";

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

    // Live Request Flow Simulation
    private isSimulatingFlow: boolean = false;
    private simulationProgress: number = 0;
    onSimulationChange?: (isActive: boolean) => void;

    // Selection & Manipulation
    private selectedShapeId: string | null = null;
    private isDraggingShape: boolean = false;
    private isResizingShape: boolean = false;
    private activeResizeHandle: ResizeHandle | null = null;
    private dragStartWorld: Point = { x: 0, y: 0 };
    private initialShapeState: Shape | null = null;
    private dragInitialShapes: Map<string, Shape> = new Map();
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

            if (this.isSimulatingFlow) {
                this.simulationProgress = (this.simulationProgress + 0.007) % 1;
            }

            if (hasActiveLerp || this.peerCursors.size > 0 || this.isSimulatingFlow) {
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

    toggleFlowSimulation(): boolean {
        this.isSimulatingFlow = !this.isSimulatingFlow;
        this.clearCanvas();
        this.onSimulationChange?.(this.isSimulatingFlow);

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(
                JSON.stringify({
                    type: "flow_simulation_toggle",
                    active: this.isSimulatingFlow,
                    roomId: this.roomId,
                })
            );
        }
        return this.isSimulatingFlow;
    }

    isFlowActive(): boolean {
        return this.isSimulatingFlow;
    }

    setFlowSimulation(active: boolean) {
        if (this.isSimulatingFlow !== active) {
            this.isSimulatingFlow = active;
            this.clearCanvas();
            this.onSimulationChange?.(this.isSimulatingFlow);
        }
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
        let id = this.selectedShapeId;
        if (!id && this.initialShapeState && this.initialShapeState.id) {
            id = this.initialShapeState.id;
        }
        if (!id) return;
        this.undoStack.push(JSON.parse(JSON.stringify(this.existingShapes)));
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

    scaleSelectedShape(factor: number) {
        if (!this.selectedShapeId) return;
        const shape = this.existingShapes.find((s) => s.id === this.selectedShapeId);
        if (!shape) return;

        this.undoStack.push(JSON.parse(JSON.stringify(this.existingShapes)));
        this.redoStack = [];

        if (shape.type === "tech_node" || shape.type === "rect") {
            const cx = shape.x + shape.width / 2;
            const cy = shape.y + shape.height / 2;
            const newW = Math.max(70, Math.round(shape.width * factor));
            const newH = Math.max(50, Math.round(shape.height * factor));
            shape.width = newW;
            shape.height = newH;
            shape.x = cx - newW / 2;
            shape.y = cy - newH / 2;
        } else if (shape.type === "circle") {
            shape.radius = Math.max(10, Math.round(Math.abs(shape.radius) * factor));
        }

        this.initialShapeState = JSON.parse(JSON.stringify(shape));
        this.clearCanvas();
        this.syncShapeUpdate(shape);
        this.onSelectionChange?.(shape);
    }

    resizeSelectedShape(width: number, height: number) {
        if (!this.selectedShapeId) return;
        const shape = this.existingShapes.find((s) => s.id === this.selectedShapeId);
        if (!shape) return;

        this.undoStack.push(JSON.parse(JSON.stringify(this.existingShapes)));
        this.redoStack = [];

        if (shape.type === "tech_node" || shape.type === "rect") {
            const cx = shape.x + shape.width / 2;
            const cy = shape.y + shape.height / 2;
            shape.width = Math.max(70, width);
            shape.height = Math.max(50, height);
            shape.x = cx - shape.width / 2;
            shape.y = cy - shape.height / 2;
        }

        this.initialShapeState = JSON.parse(JSON.stringify(shape));
        this.clearCanvas();
        this.syncShapeUpdate(shape);
        this.onSelectionChange?.(shape);
    }

    private updateResizeCursor(handle: ResizeHandle) {
        if (handle === "nw" || handle === "se") {
            this.canvas.style.cursor = "nwse-resize";
        } else if (handle === "ne" || handle === "sw") {
            this.canvas.style.cursor = "nesw-resize";
        } else if (handle === "n" || handle === "s") {
            this.canvas.style.cursor = "ns-resize";
        } else if (handle === "w" || handle === "e") {
            this.canvas.style.cursor = "ew-resize";
        } else {
            this.canvas.style.cursor = "crosshair";
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
            } else if (shape.type === "tech_node") {
                anchors = [
                    { x: shape.x + shape.width / 2, y: shape.y },
                    { x: shape.x + shape.width / 2, y: shape.y + shape.height },
                    { x: shape.x, y: shape.y + shape.height / 2 },
                    { x: shape.x + shape.width, y: shape.y + shape.height / 2 },
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

    insertTechComponent(kind: TechNodeType) {
        const center = this.getViewportCenter();
        const id = `node-${kind}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        let nodeShape: Shape;

        if (kind === "database") {
            nodeShape = {
                id,
                type: "tech_node",
                nodeType: "database",
                x: center.x - 75,
                y: center.y - 55,
                width: 150,
                height: 110,
                title: "PostgreSQL",
                subtitle: "DATABASE",
                specs: ["id: uuid (PK)"],
                strokeColor: "#38bdf8",
                strokeWidth: 2,
            };
        } else if (kind === "redis") {
            nodeShape = {
                id,
                type: "tech_node",
                nodeType: "redis",
                x: center.x - 70,
                y: center.y - 52,
                width: 140,
                height: 105,
                title: "Redis Cache",
                subtitle: "IN-MEMORY",
                specs: ["TTL 3600s"],
                strokeColor: "#f87171",
                strokeWidth: 2,
            };
        } else if (kind === "service") {
            nodeShape = {
                id,
                type: "tech_node",
                nodeType: "service",
                x: center.x - 70,
                y: center.y - 52,
                width: 140,
                height: 105,
                title: "API Gateway",
                subtitle: "ROUTER",
                specs: ["REST /api/v1"],
                strokeColor: "#c084fc",
                strokeWidth: 2,
            };
        } else if (kind === "queue") {
            nodeShape = {
                id,
                type: "tech_node",
                nodeType: "queue",
                x: center.x - 75,
                y: center.y - 50,
                width: 150,
                height: 100,
                title: "Kafka Bus",
                subtitle: "STREAM",
                specs: ["topic: events"],
                strokeColor: "#34d399",
                strokeWidth: 2,
            };
        } else if (kind === "cloud") {
            nodeShape = {
                id,
                type: "tech_node",
                nodeType: "cloud",
                x: center.x - 72,
                y: center.y - 52,
                width: 145,
                height: 105,
                title: "Cloud Service",
                subtitle: "CONTAINER",
                specs: ["pod: alpine"],
                strokeColor: "#60a5fa",
                strokeWidth: 2,
            };
        } else if (kind === "security") {
            nodeShape = {
                id,
                type: "tech_node",
                nodeType: "security",
                x: center.x - 67,
                y: center.y - 57,
                width: 135,
                height: 115,
                title: "Auth Shield",
                subtitle: "SECURITY",
                specs: ["JWT HS256"],
                strokeColor: "#f59e0b",
                strokeWidth: 2,
            };
        } else if (kind === "terminal") {
            nodeShape = {
                id,
                type: "tech_node",
                nodeType: "terminal",
                x: center.x - 77,
                y: center.y - 52,
                width: 155,
                height: 105,
                title: "server.ts",
                subtitle: "CODE",
                specs: ["node :3001"],
                strokeColor: "#eab308",
                strokeWidth: 2,
            };
        } else if (kind === "ec2") {
            nodeShape = {
                id,
                type: "tech_node",
                nodeType: "ec2",
                x: center.x - 70,
                y: center.y - 55,
                width: 140,
                height: 110,
                title: "AWS EC2 VM",
                subtitle: "COMPUTE",
                specs: ["t4g.xlarge"],
                strokeColor: "#f97316",
                strokeWidth: 2,
            };
        } else if (kind === "server") {
            nodeShape = {
                id,
                type: "tech_node",
                nodeType: "server",
                x: center.x - 75,
                y: center.y - 52,
                width: 150,
                height: 105,
                title: "Backend Server",
                subtitle: "API HOST",
                specs: ["Express :3001"],
                strokeColor: "#38bdf8",
                strokeWidth: 2,
            };
        } else if (kind === "load_balancer") {
            nodeShape = {
                id,
                type: "tech_node",
                nodeType: "load_balancer",
                x: center.x - 75,
                y: center.y - 55,
                width: 150,
                height: 110,
                title: "L7 Load Balancer",
                subtitle: "GATEWAY",
                specs: ["Cloudflare Proxy"],
                strokeColor: "#a855f7",
                strokeWidth: 2,
            };
        } else {
            nodeShape = {
                id,
                type: "tech_node",
                nodeType: "client",
                x: center.x - 70,
                y: center.y - 52,
                width: 140,
                height: 105,
                title: "Next.js Client",
                subtitle: "FRONTEND",
                specs: ["React 19 App"],
                strokeColor: "#38bdf8",
                strokeWidth: 2,
            };
        }

        this.insertShapes([nodeShape]);

        // Automatically switch to select tool and select the newly inserted tech node so user can drag it immediately
        this.setTool("select");
        this.selectedShapeId = nodeShape.id;
        this.initialShapeState = JSON.parse(JSON.stringify(nodeShape));
        this.onSelectionChange?.(nodeShape);
        this.onToolChange?.("select");
        this.clearCanvas();
    }

    exportMermaid(): string {
        const nodes: { id: string; label: string; shape: string; bounds: { minX: number; maxX: number; minY: number; maxY: number } }[] = [];
        const arrows: { fromId?: string; toId?: string }[] = [];

        let nodeCount = 0;
        for (const s of this.existingShapes) {
            if (s.type === "rect" || s.type === "circle" || s.type === "tech_node") {
                nodeCount++;
                const b = this.getShapeBounds(s);
                let label = `Service_${nodeCount}`;
                let shapeChar = "[";

                if (s.type === "tech_node") {
                    label = s.title;
                    shapeChar = s.nodeType === "database" ? "[(" : s.nodeType === "queue" ? ">" : "[";
                } else {
                    const internalText = this.existingShapes.find(
                        (other) =>
                            other.type === "text" &&
                            other.x >= b.minX - 15 &&
                            other.x <= b.maxX + 15 &&
                            other.y >= b.minY - 15 &&
                            other.y <= b.maxY + 15
                    );
                    label =
                        internalText && internalText.type === "text"
                            ? internalText.text.split("\n")[0]?.replace(/["\[\]\(\)]/g, "").trim() || `Service_${nodeCount}`
                            : `Service_${nodeCount}`;
                    shapeChar = s.type === "circle" ? "((" : "[";
                }

                nodes.push({
                    id: `node_${nodeCount}`,
                    label,
                    shape: shapeChar,
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
            const close = n.shape === "((" ? "))" : n.shape === "[(" ? ")]" : n.shape === ">" ? "]" : "]";
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
            } else if (shape.type === "tech_node") {
                const cx = shape.x + shape.width / 2;
                if (shape.nodeType === "database") {
                    const rx = shape.width / 2;
                    const ry = Math.min(16, shape.height * 0.16);
                    const topY = shape.y + ry;
                    const botY = shape.y + shape.height - ry;
                    svg += `    <path d="M ${shape.x} ${topY} L ${shape.x} ${botY} A ${rx} ${ry} 0 0 0 ${shape.x + shape.width} ${botY} L ${shape.x + shape.width} ${topY} A ${rx} ${ry} 0 0 0 ${shape.x} ${topY} Z" fill="#0f172a" stroke="${stroke}" stroke-width="${strokeWidth}" />\n`;
                    svg += `    <ellipse cx="${cx}" cy="${topY}" rx="${rx}" ry="${ry}" fill="rgba(56,189,248,0.2)" stroke="${stroke}" stroke-width="${strokeWidth}" />\n`;
                    svg += `    <text x="${cx}" y="${topY + 28}" fill="#ffffff" font-size="13" font-weight="bold" text-anchor="middle">${shape.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>\n`;
                    if (shape.specs && shape.specs.length > 0) {
                        svg += `    <text x="${cx}" y="${topY + 48}" fill="rgba(224,231,255,0.85)" font-size="10" font-family="monospace" text-anchor="middle">${shape.specs[0]!.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>\n`;
                    }
                } else if (shape.nodeType === "security") {
                    svg += `    <path d="M ${shape.x + 14} ${shape.y} L ${shape.x + shape.width - 14} ${shape.y} Q ${shape.x + shape.width} ${shape.y} ${shape.x + shape.width} ${shape.y + 14} Q ${shape.x + shape.width} ${shape.y + shape.height * 0.68} ${cx} ${shape.y + shape.height} Q ${shape.x} ${shape.y + shape.height * 0.68} ${shape.x} ${shape.y + 14} Q ${shape.x} ${shape.y} ${shape.x + 14} ${shape.y} Z" fill="#1c140a" stroke="${stroke}" stroke-width="${strokeWidth}" />\n`;
                    svg += `    <text x="${cx}" y="${shape.y + 46}" fill="#ffffff" font-size="13" font-weight="bold" text-anchor="middle">${shape.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>\n`;
                    if (shape.specs && shape.specs.length > 0) {
                        svg += `    <text x="${cx}" y="${shape.y + 68}" fill="rgba(253,230,138,0.85)" font-size="10" font-family="monospace" text-anchor="middle">${shape.specs[0]!.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>\n`;
                    }
                } else {
                    svg += `    <rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="10" fill="#0f1117" stroke="${stroke}" stroke-width="${strokeWidth}" />\n`;
                    svg += `    <text x="${cx}" y="${shape.y + 44}" fill="#ffffff" font-size="13" font-weight="bold" text-anchor="middle">${shape.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>\n`;
                    if (shape.specs && shape.specs.length > 0) {
                        svg += `    <text x="${cx}" y="${shape.y + 66}" fill="rgba(224,231,255,0.85)" font-size="10" font-family="monospace" text-anchor="middle">${shape.specs[0]!.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>\n`;
                    }
                }
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
            } else if (shape && shape.type === "tech_node") {
                this.undoStack.push(JSON.parse(JSON.stringify(this.existingShapes)));
                this.redoStack = [];
                const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
                if (lines.length > 0) {
                    shape.title = lines[0]!;
                    shape.specs = lines.slice(1);
                }
                if (color) shape.strokeColor = color;

                // Auto-adjust width if edited text requires more room
                this.ctx.save();
                this.ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, sans-serif";
                let maxW = this.ctx.measureText(shape.title).width;
                this.ctx.font = "10px ui-monospace, SFMono-Regular, monospace";
                if (shape.specs) {
                    shape.specs.forEach((sp) => {
                        const w = this.ctx.measureText(sp).width;
                        if (w > maxW) maxW = w;
                    });
                }
                this.ctx.restore();
                shape.width = Math.max(140, Math.min(300, maxW + 44));

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

    startEditingSelectedShape() {
        if (!this.selectedShapeId) return;
        const shape = this.existingShapes.find((s) => s.id === this.selectedShapeId);
        if (!shape) return;
        if (shape.type === "text") {
            this.onStartTextEdit?.({
                id: shape.id,
                worldX: shape.x,
                worldY: shape.y,
                initialText: shape.text,
                fontSize: shape.fontSize || 20,
                color: shape.strokeColor || this.strokeColor,
            });
        } else if (shape.type === "tech_node") {
            const content = [shape.title, ...(shape.specs || [])].join("\n");
            this.onStartTextEdit?.({
                id: shape.id,
                worldX: shape.x + 8,
                worldY: shape.y + Math.max(10, shape.height / 2 - 24),
                initialText: content,
                fontSize: 13,
                color: shape.strokeColor || "#ffffff",
            });
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

    loadArchitectureTemplate(templateId: "hld_this_app" | "hld_uber" | "hld_tinyurl" | "lld_state_machine" | "lld_erd") {
        const id = (prefix: string) => `tpl-${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        let shapes: Shape[] = [];

        if (templateId === "hld_this_app") {
            // HLD: Production Architecture of VectorCraft / Excali (This Platform)
            shapes = [
                { id: id("title"), type: "text", x: 80, y: 70, text: "HLD: VectorCraft System Architecture (This Platform)", fontSize: 24, strokeColor: "#ffffff" },
                {
                    id: id("client"),
                    type: "tech_node",
                    nodeType: "client",
                    x: 60,
                    y: 190,
                    width: 210,
                    height: 125,
                    title: "Next.js 15 Client",
                    subtitle: "FRONTEND",
                    specs: ["HTML5 60 FPS Canvas", "React 19 + Turbopack", "LERP Cursor Smoothing"],
                    strokeColor: "#38bdf8",
                    strokeWidth: 2,
                },
                {
                    id: id("proxy"),
                    type: "tech_node",
                    nodeType: "load_balancer",
                    x: 340,
                    y: 190,
                    width: 210,
                    height: 125,
                    title: "Cloudflare & L7 Proxy",
                    subtitle: "GATEWAY",
                    specs: ["Wildcard SSL / TLS 1.3", "WSS & HTTP Routing", "DDoS Shield & Anycast"],
                    strokeColor: "#a855f7",
                    strokeWidth: 2,
                },
                {
                    id: id("http"),
                    type: "tech_node",
                    nodeType: "server",
                    x: 620,
                    y: 90,
                    width: 220,
                    height: 125,
                    title: "HTTP Backend (:3001)",
                    subtitle: "REST API",
                    specs: ["scrypt Password Hashing", "JWT Auth & Bearer Guard", "Room & Chat Endpoints"],
                    strokeColor: "#38bdf8",
                    strokeWidth: 2,
                },
                {
                    id: id("ws"),
                    type: "tech_node",
                    nodeType: "ec2",
                    x: 620,
                    y: 290,
                    width: 230,
                    height: 130,
                    title: "WebSocket Server (:8080)",
                    subtitle: "SYNC ENGINE",
                    specs: ["Multiplexed Room Hub", "512KB DoS Payload Guard", "30s Heartbeat Pruner"],
                    strokeColor: "#f97316",
                    strokeWidth: 2,
                },
                {
                    id: id("buffer"),
                    type: "tech_node",
                    nodeType: "queue",
                    x: 915,
                    y: 290,
                    width: 230,
                    height: 130,
                    title: "Write-Behind Queue",
                    subtitle: "BUFFER",
                    specs: ["In-Memory Spliced Queue", "Batch Drain: 30 shapes", "Interval: 1500ms Flush"],
                    strokeColor: "#34d399",
                    strokeWidth: 2,
                },
                {
                    id: id("db"),
                    type: "tech_node",
                    nodeType: "database",
                    x: 1210,
                    y: 180,
                    width: 230,
                    height: 140,
                    title: "PostgreSQL Database",
                    subtitle: "PRISMA ORM",
                    specs: ["User, Room & Chat Tables", "Foreign Key Constraints", "Indexes on [roomId]"],
                    strokeColor: "#fbbf24",
                    strokeWidth: 2,
                },
                // Pre-wired Vector Connectors
                { id: id("a1"), type: "arrow", startX: 270, startY: 252, endX: 340, endY: 252, strokeColor: "#38bdf8", strokeWidth: 2 },
                { id: id("a2"), type: "arrow", startX: 550, startY: 220, endX: 620, endY: 152, strokeColor: "#38bdf8", strokeWidth: 2 },
                { id: id("a3"), type: "arrow", startX: 550, startY: 275, endX: 620, endY: 355, strokeColor: "#f97316", strokeWidth: 2 },
                { id: id("a4"), type: "arrow", startX: 840, startY: 152, endX: 1210, endY: 220, strokeColor: "#38bdf8", strokeWidth: 2 },
                { id: id("a5"), type: "arrow", startX: 850, startY: 355, endX: 915, endY: 355, strokeColor: "#f97316", strokeWidth: 2 },
                { id: id("a6"), type: "arrow", startX: 1145, startY: 355, endX: 1210, endY: 270, strokeColor: "#34d399", strokeWidth: 2 },
            ];
        } else if (templateId === "hld_uber") {
            // HLD: Distributed Ride Matching & Real-Time Event Streaming
            shapes = [
                { id: id("title"), type: "text", x: 100, y: 80, text: "HLD: Real-Time Event Streaming & Matching Architecture", fontSize: 24, strokeColor: "#ffffff" },
                {
                    id: id("client"),
                    type: "tech_node",
                    nodeType: "client",
                    x: 100,
                    y: 220,
                    width: 220,
                    height: 120,
                    title: "Rider Mobile App",
                    subtitle: "CLIENT",
                    specs: ["POST /v1/request-ride", "WS /live/telemetry", "Payload: lat/lng, user_id"],
                    strokeColor: "#38bdf8",
                    strokeWidth: 2,
                },
                {
                    id: id("gateway"),
                    type: "tech_node",
                    nodeType: "service",
                    x: 400,
                    y: 220,
                    width: 230,
                    height: 130,
                    title: "Envoy API Gateway",
                    subtitle: "ROUTER",
                    specs: ["mTLS & JWT Validation", "Rate Limit: 10k req/s", "WS Session Terminate"],
                    strokeColor: "#c084fc",
                    strokeWidth: 2,
                },
                {
                    id: id("kafka"),
                    type: "tech_node",
                    nodeType: "queue",
                    x: 720,
                    y: 130,
                    width: 220,
                    height: 125,
                    title: "Kafka Event Bus",
                    subtitle: "STREAM",
                    specs: ["topic: ride.requests", "partitions: 16", "acks: all (-1)"],
                    strokeColor: "#34d399",
                    strokeWidth: 2,
                },
                {
                    id: id("redis"),
                    type: "tech_node",
                    nodeType: "redis",
                    x: 720,
                    y: 330,
                    width: 220,
                    height: 125,
                    title: "Redis GEO Cluster",
                    subtitle: "IN-MEMORY",
                    specs: ["GEOADD driver_positions", "GEORADIUS 5km filter", "TTL: 10s heartbeat"],
                    strokeColor: "#f87171",
                    strokeWidth: 2,
                },
                {
                    id: id("matcher"),
                    type: "tech_node",
                    nodeType: "cloud",
                    x: 1030,
                    y: 130,
                    width: 230,
                    height: 130,
                    title: "Match Engine Pod",
                    subtitle: "CONTAINER",
                    specs: ["Uber H3 Hexagons", "O(1) Spatial Partitioning", "gRPC Worker Pool"],
                    strokeColor: "#60a5fa",
                    strokeWidth: 2,
                },
                {
                    id: id("db"),
                    type: "tech_node",
                    nodeType: "database",
                    x: 1030,
                    y: 330,
                    width: 230,
                    height: 135,
                    title: "PostgreSQL (Sharded)",
                    subtitle: "DATABASE",
                    specs: ["rides (PK uuid)", "driver_id (FK)", "status: MATCHED"],
                    strokeColor: "#fbbf24",
                    strokeWidth: 2,
                },
                { id: id("a1"), type: "arrow", startX: 320, startY: 280, endX: 400, endY: 280, strokeColor: "#38bdf8", strokeWidth: 2 },
                { id: id("a2"), type: "arrow", startX: 630, startY: 250, endX: 720, endY: 190, strokeColor: "#c084fc", strokeWidth: 2 },
                { id: id("a3"), type: "arrow", startX: 630, startY: 310, endX: 720, endY: 380, strokeColor: "#c084fc", strokeWidth: 2 },
                { id: id("a4"), type: "arrow", startX: 940, startY: 190, endX: 1030, endY: 190, strokeColor: "#34d399", strokeWidth: 2 },
                { id: id("a5"), type: "arrow", startX: 1145, startY: 260, endX: 1145, endY: 330, strokeColor: "#60a5fa", strokeWidth: 2 },
                { id: id("a6"), type: "arrow", startX: 1030, startY: 390, endX: 940, endY: 390, strokeColor: "#f87171", strokeWidth: 2 },
            ];
        } else if (templateId === "hld_tinyurl") {
            // HLD: High-Throughput URL Shortener (TinyURL)
            shapes = [
                { id: id("title"), type: "text", x: 100, y: 80, text: "HLD: High-Throughput Distributed URL Shortener (TinyURL)", fontSize: 24, strokeColor: "#ffffff" },
                {
                    id: id("client"),
                    type: "tech_node",
                    nodeType: "client",
                    x: 100,
                    y: 230,
                    width: 210,
                    height: 115,
                    title: "Web & API Consumers",
                    subtitle: "CLIENT",
                    specs: ["GET /{hash} (301 Redirect)", "POST /v1/shorten", "100k QPS read peak"],
                    strokeColor: "#38bdf8",
                    strokeWidth: 2,
                },
                {
                    id: id("cdn"),
                    type: "tech_node",
                    nodeType: "cloud",
                    x: 390,
                    y: 230,
                    width: 220,
                    height: 125,
                    title: "Cloudflare Edge CDN",
                    subtitle: "CDN",
                    specs: ["Anycast Global Routing", "Edge Cache: Hot Hashes", "DDoS Perimeter"],
                    strokeColor: "#f59e0b",
                    strokeWidth: 2,
                },
                {
                    id: id("service"),
                    type: "tech_node",
                    nodeType: "service",
                    x: 690,
                    y: 230,
                    width: 230,
                    height: 130,
                    title: "URL Generator Core",
                    subtitle: "ROUTER",
                    specs: ["Base62 Hash Algorithm", "Snowflake 64-bit ID Gen", "p99 Latency: 8ms"],
                    strokeColor: "#c084fc",
                    strokeWidth: 2,
                },
                {
                    id: id("redis"),
                    type: "tech_node",
                    nodeType: "redis",
                    x: 1000,
                    y: 130,
                    width: 220,
                    height: 125,
                    title: "Redis Cluster (L1)",
                    subtitle: "IN-MEMORY",
                    specs: ["key: hash_val", "LRU eviction policy", "92% Cache Hit Ratio"],
                    strokeColor: "#f87171",
                    strokeWidth: 2,
                },
                {
                    id: id("db"),
                    type: "tech_node",
                    nodeType: "database",
                    x: 1000,
                    y: 340,
                    width: 220,
                    height: 135,
                    title: "PostgreSQL Master/Repl",
                    subtitle: "DATABASE",
                    specs: ["id: bigint (PK)", "hash: char(7) (INDEX)", "long_url: text (NOT NULL)"],
                    strokeColor: "#38bdf8",
                    strokeWidth: 2,
                },
                {
                    id: id("queue"),
                    type: "tech_node",
                    nodeType: "queue",
                    x: 690,
                    y: 440,
                    width: 230,
                    height: 125,
                    title: "Analytics Clickstream",
                    subtitle: "QUEUE",
                    specs: ["topic: url.analytics", "Async Non-Blocking", "Geo & Referrer Log"],
                    strokeColor: "#34d399",
                    strokeWidth: 2,
                },
                { id: id("a1"), type: "arrow", startX: 310, startY: 290, endX: 390, endY: 290, strokeColor: "#38bdf8", strokeWidth: 2 },
                { id: id("a2"), type: "arrow", startX: 610, startY: 290, endX: 690, endY: 290, strokeColor: "#f59e0b", strokeWidth: 2 },
                { id: id("a3"), type: "arrow", startX: 920, startY: 260, endX: 1000, endY: 190, strokeColor: "#c084fc", strokeWidth: 2 },
                { id: id("a4"), type: "arrow", startX: 920, startY: 330, endX: 1000, endY: 400, strokeColor: "#c084fc", strokeWidth: 2 },
                { id: id("a5"), type: "arrow", startX: 805, startY: 360, endX: 805, endY: 440, strokeColor: "#34d399", strokeWidth: 2 },
            ];
        } else if (templateId === "lld_state_machine") {
            // LLD: Order Processing State Machine & Sagas
            shapes = [
                { id: id("title"), type: "text", x: 100, y: 80, text: "LLD: Order Processing State Machine & Sagas", fontSize: 24, strokeColor: "#ffffff" },
                {
                    id: id("s1"),
                    type: "tech_node",
                    nodeType: "client",
                    x: 100,
                    y: 230,
                    width: 210,
                    height: 115,
                    title: "State: PENDING",
                    subtitle: "ORDER CREATED",
                    specs: ["status = 'PENDING'", "event: SUBMIT_PAYMENT", "TTL: 900s expiration"],
                    strokeColor: "#38bdf8",
                    strokeWidth: 2,
                },
                {
                    id: id("guard"),
                    type: "tech_node",
                    nodeType: "security",
                    x: 400,
                    y: 120,
                    width: 220,
                    height: 120,
                    title: "Idempotency Guard",
                    subtitle: "SECURITY",
                    specs: ["header: X-Idempotency-Key", "Distributed Lock (Redlock)", "Prevent double debit"],
                    strokeColor: "#f59e0b",
                    strokeWidth: 2,
                },
                {
                    id: id("s2"),
                    type: "tech_node",
                    nodeType: "service",
                    x: 400,
                    y: 340,
                    width: 220,
                    height: 130,
                    title: "State: AUTHORIZING",
                    subtitle: "PAYMENT PROCESSING",
                    specs: ["gateway: Stripe / Razorpay", "webhook: payment.success", "exponential backoff retry"],
                    strokeColor: "#c084fc",
                    strokeWidth: 2,
                },
                {
                    id: id("s3"),
                    type: "tech_node",
                    nodeType: "cloud",
                    x: 720,
                    y: 230,
                    width: 230,
                    height: 125,
                    title: "State: COMPLETED",
                    subtitle: "ORDER FULFILLED",
                    specs: ["status = 'PAID'", "emit: order.fulfilled", "invoice_pdf: generated"],
                    strokeColor: "#34d399",
                    strokeWidth: 2,
                },
                {
                    id: id("s4"),
                    type: "tech_node",
                    nodeType: "redis",
                    x: 1030,
                    y: 230,
                    width: 220,
                    height: 125,
                    title: "State: FAILED",
                    subtitle: "ROLLBACK / REFUND",
                    specs: ["status = 'CANCELLED'", "saga: compensation_hook", "reason: INSUFFICIENT_FUNDS"],
                    strokeColor: "#f87171",
                    strokeWidth: 2,
                },
                { id: id("a1"), type: "arrow", startX: 310, startY: 260, endX: 400, endY: 180, strokeColor: "#38bdf8", strokeWidth: 2 },
                { id: id("a2"), type: "arrow", startX: 310, startY: 310, endX: 400, endY: 380, strokeColor: "#38bdf8", strokeWidth: 2 },
                { id: id("a3"), type: "arrow", startX: 620, startY: 380, endX: 720, endY: 310, strokeColor: "#c084fc", strokeWidth: 2 },
                { id: id("a4"), type: "arrow", startX: 950, startY: 290, endX: 1030, endY: 290, strokeColor: "#f87171", strokeWidth: 2 },
            ];
        } else {
            // LLD: Normalized Relational Schema (ERD)
            shapes = [
                { id: id("title"), type: "text", x: 100, y: 80, text: "LLD: Normalized Relational Database Schema (ERD)", fontSize: 24, strokeColor: "#ffffff" },
                {
                    id: id("u"),
                    type: "tech_node",
                    nodeType: "database",
                    x: 100,
                    y: 180,
                    width: 230,
                    height: 140,
                    title: "users",
                    subtitle: "DATABASE",
                    specs: ["id: uuid (PK)", "email: varchar(255) (UNIQUE)", "password_hash: text", "created_at: timestamp"],
                    strokeColor: "#38bdf8",
                    strokeWidth: 2,
                },
                {
                    id: id("o"),
                    type: "tech_node",
                    nodeType: "database",
                    x: 420,
                    y: 180,
                    width: 240,
                    height: 140,
                    title: "orders",
                    subtitle: "DATABASE",
                    specs: ["id: uuid (PK)", "user_id: uuid (FK -> users.id)", "total_amount: numeric(10,2)", "status: order_status_enum"],
                    strokeColor: "#c084fc",
                    strokeWidth: 2,
                },
                {
                    id: id("oi"),
                    type: "tech_node",
                    nodeType: "database",
                    x: 750,
                    y: 180,
                    width: 250,
                    height: 140,
                    title: "order_items",
                    subtitle: "DATABASE",
                    specs: ["id: uuid (PK)", "order_id: uuid (FK -> orders.id)", "product_id: uuid (FK -> products.id)", "quantity: int (CHECK > 0)"],
                    strokeColor: "#34d399",
                    strokeWidth: 2,
                },
                {
                    id: id("p"),
                    type: "tech_node",
                    nodeType: "database",
                    x: 750,
                    y: 390,
                    width: 250,
                    height: 140,
                    title: "products",
                    subtitle: "DATABASE",
                    specs: ["id: uuid (PK)", "sku: varchar(64) (INDEX)", "title: varchar(255)", "stock_count: int (CHECK >= 0)"],
                    strokeColor: "#f59e0b",
                    strokeWidth: 2,
                },
                { id: id("a1"), type: "arrow", startX: 330, startY: 250, endX: 420, endY: 250, strokeColor: "#38bdf8", strokeWidth: 2 },
                { id: id("a2"), type: "arrow", startX: 660, startY: 250, endX: 750, endY: 250, strokeColor: "#c084fc", strokeWidth: 2 },
                { id: id("a3"), type: "arrow", startX: 875, startY: 390, endX: 875, endY: 320, strokeColor: "#f59e0b", strokeWidth: 2 },
            ];
        }

        if (this.existingShapes.length > 0) {
            // Find current bounds of existing diagram
            let maxX = -Infinity;
            let minY = Infinity;
            this.existingShapes.forEach((s) => {
                const b = this.getShapeBounds(s);
                if (b.maxX > maxX) maxX = b.maxX;
                if (b.minY < minY) minY = b.minY;
            });
            if (maxX === -Infinity) maxX = 0;
            if (minY === Infinity) minY = 0;

            // Find template min bounds
            let tplMinX = Infinity;
            let tplMinY = Infinity;
            shapes.forEach((s) => {
                const b = this.getShapeBounds(s);
                if (b.minX < tplMinX) tplMinX = b.minX;
                if (b.minY < tplMinY) tplMinY = b.minY;
            });
            if (tplMinX === Infinity) tplMinX = 0;
            if (tplMinY === Infinity) tplMinY = 0;

            // Offset template shapes so they appear neatly to the right of existing diagram
            const dx = maxX + 80 - tplMinX;
            const dy = minY - tplMinY;

            shapes.forEach((s) => {
                if (s.type === "rect" || s.type === "text" || s.type === "tech_node") {
                    s.x += dx;
                    s.y += dy;
                } else if (s.type === "circle") {
                    s.centerX += dx;
                    s.centerY += dy;
                } else if (s.type === "line" || s.type === "arrow") {
                    s.startX += dx;
                    s.startY += dy;
                    s.endX += dx;
                    s.endY += dy;
                } else if (s.type === "pencil" && s.points) {
                    s.points.forEach((p) => {
                        p.x += dx;
                        p.y += dy;
                    });
                }
            });

            this.undoStack.push(JSON.parse(JSON.stringify(this.existingShapes)));
            this.redoStack = [];
            shapes.forEach((s) => this.existingShapes.push(s));
        } else {
            this.undoStack.push([]);
            this.redoStack = [];
            this.existingShapes = shapes;
            this.zoom = 0.95;
            this.panOffset = { x: 40, y: 20 };
            this.onZoomChange?.(this.zoom);
        }

        this.selectedShapeId = null;
        this.initialShapeState = null;
        this.onSelectionChange?.(null);
        this.clearCanvas();
        this.onShapesChange?.(this.existingShapes.length);

        // Broadcast each template shape to peers and server persistence
        shapes.forEach((s) => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(
                    JSON.stringify({
                        type: "chat",
                        message: JSON.stringify({ shape: s }),
                        roomId: this.roomId,
                    })
                );
            }
        });
    }

    private getStarterTemplateShapes(): Shape[] {
        const r = this.roomId.toLowerCase();
        if (r.includes("tinyurl") || r.includes("url")) {
            this.loadArchitectureTemplate("hld_tinyurl");
        } else if (r.includes("state") || r.includes("saga")) {
            this.loadArchitectureTemplate("lld_state_machine");
        } else if (r.includes("database") || r.includes("erd") || r.includes("schema")) {
            this.loadArchitectureTemplate("lld_erd");
        } else if (r.includes("uber") || r.includes("stream") || r.includes("kafka")) {
            this.loadArchitectureTemplate("hld_uber");
        } else {
            // Default to VectorCraft's own live system architecture
            this.loadArchitectureTemplate("hld_this_app");
        }
        return this.existingShapes;
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
                } else if (message.type === "flow_simulation_toggle") {
                    this.setFlowSimulation(!!message.active);
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

        // Live Request Flow Simulation
        if (this.isSimulatingFlow) {
            this.renderFlowSimulation();
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
        } else if (shape.type === "tech_node") {
            return {
                minX: shape.x,
                minY: shape.y,
                maxX: shape.x + shape.width,
                maxY: shape.y + shape.height,
            };
        }
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    findResizeHandleAt(point: Point, shape: Shape): ResizeHandle | null {
        const threshold = 12 / this.zoom;

        if (shape.type === "tech_node" || shape.type === "rect") {
            const minX = shape.x;
            const minY = shape.y;
            const maxX = shape.x + shape.width;
            const maxY = shape.y + shape.height;
            const midX = (minX + maxX) / 2;
            const midY = (minY + maxY) / 2;

            const handles: { handle: ResizeHandle; x: number; y: number }[] = [
                { handle: "nw", x: minX, y: minY },
                { handle: "ne", x: maxX, y: minY },
                { handle: "se", x: maxX, y: maxY },
                { handle: "sw", x: minX, y: maxY },
                { handle: "n", x: midX, y: minY },
                { handle: "s", x: midX, y: maxY },
                { handle: "w", x: minX, y: midY },
                { handle: "e", x: maxX, y: midY },
            ];

            for (const h of handles) {
                if (Math.hypot(point.x - h.x, point.y - h.y) <= threshold) {
                    return h.handle;
                }
            }
        } else if (shape.type === "circle") {
            const r = Math.abs(shape.radius);
            const handles: { handle: ResizeHandle; x: number; y: number }[] = [
                { handle: "e", x: shape.centerX + r, y: shape.centerY },
                { handle: "w", x: shape.centerX - r, y: shape.centerY },
                { handle: "s", x: shape.centerX, y: shape.centerY + r },
                { handle: "n", x: shape.centerX, y: shape.centerY - r },
                { handle: "se", x: shape.centerX + r * 0.707, y: shape.centerY + r * 0.707 },
            ];
            for (const h of handles) {
                if (Math.hypot(point.x - h.x, point.y - h.y) <= threshold) {
                    return h.handle;
                }
            }
        } else if (shape.type === "line" || shape.type === "arrow") {
            if (Math.hypot(point.x - shape.startX, point.y - shape.startY) <= threshold) {
                return "start";
            }
            if (Math.hypot(point.x - shape.endX, point.y - shape.endY) <= threshold) {
                return "end";
            }
        }
        return null;
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

        // Selection handles
        this.ctx.setLineDash([]);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.strokeStyle = "#2563eb";
        this.ctx.lineWidth = 1.5 / this.zoom;
        const handleRadius = 4.5 / this.zoom;

        const handles: { x: number; y: number }[] = [
            // 4 Corners
            { x: x, y: y },
            { x: x + width, y: y },
            { x: x + width, y: y + height },
            { x: x, y: y + height },
            // 4 Edge Midpoints
            { x: x + width / 2, y: y },
            { x: x + width / 2, y: y + height },
            { x: x, y: y + height / 2 },
            { x: x + width, y: y + height / 2 },
        ];

        handles.forEach((h) => {
            this.ctx.beginPath();
            this.ctx.arc(h.x, h.y, handleRadius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        });

        // Dimensions badge tooltip during selection / resize
        if (shape.type === "tech_node" || shape.type === "rect") {
            const dimText = `${Math.round(shape.width)} × ${Math.round(shape.height)}`;
            this.ctx.font = `bold ${Math.max(9, 10 / this.zoom)}px ui-monospace, SFMono-Regular, monospace`;
            const textMetrics = this.ctx.measureText(dimText);
            const badgeW = textMetrics.width + 10 / this.zoom;
            const badgeH = 16 / this.zoom;
            const badgeX = x + width / 2 - badgeW / 2;
            const badgeY = y + height + 6 / this.zoom;

            this.ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
            this.ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
            this.ctx.lineWidth = 1 / this.zoom;

            this.ctx.beginPath();
            if (typeof this.ctx.roundRect === "function") {
                this.ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4 / this.zoom);
            } else {
                this.ctx.rect(badgeX, badgeY, badgeW, badgeH);
            }
            this.ctx.fill();
            this.ctx.stroke();

            this.ctx.fillStyle = "#93c5fd";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(dimText, x + width / 2, badgeY + badgeH / 2);
        }

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
            } else if (shape.type === "tech_node") {
                if (
                    point.x >= shape.x - tolerance &&
                    point.x <= shape.x + shape.width + tolerance &&
                    point.y >= shape.y - tolerance &&
                    point.y <= shape.y + shape.height + tolerance
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

    private renderFlowSimulation() {
        const arrows = this.existingShapes.filter(
            (s): s is Shape & { type: "arrow"; startX: number; startY: number; endX: number; endY: number } =>
                s.type === "arrow"
        );
        if (arrows.length === 0) return;

        this.ctx.save();

        arrows.forEach((arrow, idx) => {
            const dx = arrow.endX - arrow.startX;
            const dy = arrow.endY - arrow.startY;
            const dist = Math.hypot(dx, dy);
            if (dist < 15) return;

            // Compute packet progress with slight phase stagger per arrow
            const phase = (this.simulationProgress + idx * 0.28) % 1;
            const px = arrow.startX + dx * phase;
            const py = arrow.startY + dy * phase;

            const packetColor = arrow.strokeColor || "#38bdf8";

            // 1. Draw glowing radiant tail
            const tailLen = Math.min(32 / this.zoom, dist * 0.35);
            const tailProgress = Math.max(0, phase - tailLen / dist);
            const tx = arrow.startX + dx * tailProgress;
            const ty = arrow.startY + dy * tailProgress;

            const gradient = this.ctx.createLinearGradient(tx, ty, px, py);
            gradient.addColorStop(0, "rgba(56, 189, 248, 0)");
            gradient.addColorStop(1, packetColor);

            this.ctx.beginPath();
            this.ctx.moveTo(tx, ty);
            this.ctx.lineTo(px, py);
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 3.5 / this.zoom;
            this.ctx.lineCap = "round";
            this.ctx.stroke();

            // 2. Glowing Halo Particle
            const haloRadius = 7 / this.zoom;
            const halo = this.ctx.createRadialGradient(px, py, 1 / this.zoom, px, py, haloRadius);
            halo.addColorStop(0, "#ffffff");
            halo.addColorStop(0.4, packetColor);
            halo.addColorStop(1, "rgba(0, 0, 0, 0)");

            this.ctx.fillStyle = halo;
            this.ctx.beginPath();
            this.ctx.arc(px, py, haloRadius, 0, Math.PI * 2);
            this.ctx.fill();

            // 3. Crisp Central Core Dot
            this.ctx.fillStyle = "#ffffff";
            this.ctx.beginPath();
            this.ctx.arc(px, py, 2.5 / this.zoom, 0, Math.PI * 2);
            this.ctx.fill();

            // 4. Midpoint Telemetry Badge
            const midX = (arrow.startX + arrow.endX) / 2;
            const midY = (arrow.startY + arrow.endY) / 2;

            const telemetryLabels = [
                "POST /v1 (24ms)",
                "Kafka Pub/Sub (3ms)",
                "SQL Query (12ms)",
                "Redis Hit (1ms)",
                "gRPC Stream (6ms)",
                "JWT Verify (2ms)"
            ];
            const label = telemetryLabels[idx % telemetryLabels.length]!;

            this.ctx.font = `bold ${Math.max(9, 10 / this.zoom)}px ui-monospace, SFMono-Regular, monospace`;
            const textMetrics = this.ctx.measureText(label);
            const badgeW = textMetrics.width + 10 / this.zoom;
            const badgeH = 16 / this.zoom;
            const badgeX = midX - badgeW / 2;
            const badgeY = midY - badgeH / 2 - 12 / this.zoom;

            // Badge Background pill
            this.ctx.fillStyle = "rgba(10, 12, 18, 0.92)";
            this.ctx.strokeStyle = packetColor;
            this.ctx.lineWidth = 1 / this.zoom;

            this.ctx.beginPath();
            if (typeof this.ctx.roundRect === "function") {
                this.ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4 / this.zoom);
            } else {
                this.ctx.rect(badgeX, badgeY, badgeW, badgeH);
            }
            this.ctx.fill();
            this.ctx.stroke();

            // Badge Text
            this.ctx.fillStyle = "#e2e8f0";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(label, midX, badgeY + badgeH / 2);
        });

        this.ctx.restore();
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
        } else if (shape.type === "tech_node") {
            this.renderTechNode(shape);
        }
    }

    private drawTechIcon(type: TechNodeType, cx: number, cy: number, color: string) {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineWidth = 1.6;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";

        if (type === "database") {
            // Draw authentic 3D Database Cylinder icon
            this.ctx.beginPath();
            this.ctx.ellipse(cx, cy - 6, 7, 3, 0, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(cx - 7, cy - 6);
            this.ctx.lineTo(cx - 7, cy + 6);
            this.ctx.ellipse(cx, cy + 6, 7, 3, 0, Math.PI, 0, true);
            this.ctx.lineTo(cx + 7, cy - 6);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.ellipse(cx, cy, 7, 3, 0, Math.PI, 0, true);
            this.ctx.stroke();
        } else if (type === "redis") {
            // Draw Flash / Lightning Bolt icon
            this.ctx.beginPath();
            this.ctx.moveTo(cx + 1, cy - 8);
            this.ctx.lineTo(cx - 5, cy);
            this.ctx.lineTo(cx - 1, cy);
            this.ctx.lineTo(cx - 3, cy + 8);
            this.ctx.lineTo(cx + 5, cy - 1);
            this.ctx.lineTo(cx + 1, cy - 1);
            this.ctx.closePath();
            this.ctx.fill();
        } else if (type === "service") {
            // Draw API Gateway / Microservice Router icon
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(cx - 7, cy - 6);
            this.ctx.lineTo(cx - 3, cy - 2);
            this.ctx.moveTo(cx + 7, cy - 6);
            this.ctx.lineTo(cx + 3, cy - 2);
            this.ctx.moveTo(cx, cy + 3.5);
            this.ctx.lineTo(cx, cy + 8);
            this.ctx.stroke();
        } else if (type === "queue") {
            // Draw Message Queue Stack icon
            this.ctx.strokeRect(cx - 7, cy - 6, 14, 3.5);
            this.ctx.strokeRect(cx - 7, cy - 1.5, 14, 3.5);
            this.ctx.strokeRect(cx - 7, cy + 3, 14, 3.5);
        } else if (type === "cloud") {
            // Draw Cloud Container icon
            this.ctx.beginPath();
            this.ctx.arc(cx - 3, cy - 2, 4, Math.PI * 0.8, Math.PI * 1.8);
            this.ctx.arc(cx + 3, cy - 3, 5, Math.PI * 1.2, Math.PI * 0.1);
            this.ctx.arc(cx + 6, cy + 3, 3, Math.PI * 1.6, Math.PI * 0.6);
            this.ctx.lineTo(cx - 6, cy + 6);
            this.ctx.arc(cx - 6, cy + 3, 3, Math.PI * 0.5, Math.PI * 1.5);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (type === "security") {
            // Draw Security Shield icon
            this.ctx.beginPath();
            this.ctx.moveTo(cx - 6, cy - 6);
            this.ctx.lineTo(cx + 6, cy - 6);
            this.ctx.lineTo(cx + 6, cy);
            this.ctx.quadraticCurveTo(cx + 6, cy + 6, cx, cy + 8);
            this.ctx.quadraticCurveTo(cx - 6, cy + 6, cx - 6, cy);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (type === "terminal") {
            // Draw Terminal Window icon
            this.ctx.strokeRect(cx - 7, cy - 6, 14, 12);
            this.ctx.beginPath();
            this.ctx.moveTo(cx - 4, cy - 1);
            this.ctx.lineTo(cx - 2, cy + 1);
            this.ctx.lineTo(cx - 4, cy + 3);
            this.ctx.moveTo(cx, cy + 3);
            this.ctx.lineTo(cx + 4, cy + 3);
            this.ctx.stroke();
        } else if (type === "ec2") {
            // Draw AWS EC2 Compute Node / Chip
            this.ctx.strokeRect(cx - 6, cy - 6, 12, 12);
            this.ctx.fillRect(cx - 3, cy - 3, 6, 6);
            this.ctx.beginPath();
            this.ctx.moveTo(cx - 3, cy - 8); this.ctx.lineTo(cx - 3, cy - 6);
            this.ctx.moveTo(cx + 3, cy - 8); this.ctx.lineTo(cx + 3, cy - 6);
            this.ctx.moveTo(cx - 3, cy + 6); this.ctx.lineTo(cx - 3, cy + 8);
            this.ctx.moveTo(cx + 3, cy + 6); this.ctx.lineTo(cx + 3, cy + 8);
            this.ctx.moveTo(cx - 8, cy - 3); this.ctx.lineTo(cx - 6, cy - 3);
            this.ctx.moveTo(cx - 8, cy + 3); this.ctx.lineTo(cx - 6, cy + 3);
            this.ctx.moveTo(cx + 6, cy - 3); this.ctx.lineTo(cx + 8, cy - 3);
            this.ctx.moveTo(cx + 6, cy + 3); this.ctx.lineTo(cx + 8, cy + 3);
            this.ctx.stroke();
        } else if (type === "server") {
            // Draw Dual Rack Server Chassis
            this.ctx.strokeRect(cx - 8, cy - 6, 16, 5);
            this.ctx.strokeRect(cx - 8, cy + 1, 16, 5);
            this.ctx.beginPath();
            this.ctx.arc(cx - 4, cy - 3.5, 1, 0, Math.PI * 2);
            this.ctx.arc(cx - 1, cy - 3.5, 1, 0, Math.PI * 2);
            this.ctx.arc(cx - 4, cy + 3.5, 1, 0, Math.PI * 2);
            this.ctx.arc(cx - 1, cy + 3.5, 1, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.moveTo(cx + 2, cy - 3.5); this.ctx.lineTo(cx + 6, cy - 3.5);
            this.ctx.moveTo(cx + 2, cy + 3.5); this.ctx.lineTo(cx + 6, cy + 3.5);
            this.ctx.stroke();
        } else if (type === "load_balancer") {
            // Draw Load Balancer / Proxy Router
            this.ctx.strokeRect(cx - 7, cy - 7, 14, 14);
            this.ctx.beginPath();
            this.ctx.moveTo(cx - 4, cy); this.ctx.lineTo(cx + 4, cy);
            this.ctx.moveTo(cx + 1, cy - 3); this.ctx.lineTo(cx + 4, cy); this.ctx.lineTo(cx + 1, cy + 3);
            this.ctx.moveTo(cx, cy - 4); this.ctx.lineTo(cx, cy + 4);
            this.ctx.stroke();
        } else {
            // Web Client Monitor icon
            this.ctx.strokeRect(cx - 7, cy - 5, 14, 10);
            this.ctx.beginPath();
            this.ctx.moveTo(cx - 3, cy + 5);
            this.ctx.lineTo(cx - 5, cy + 8);
            this.ctx.lineTo(cx + 5, cy + 8);
            this.ctx.lineTo(cx + 3, cy + 5);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    private fitTextToWidth(text: string, maxWidth: number): string {
        if (!text) return "";
        if (maxWidth <= 8) return "";
        if (this.ctx.measureText(text).width <= maxWidth) {
            return text;
        }
        const ellipsis = "…";
        let low = 0;
        let high = text.length;
        let best = "";
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const sub = text.substring(0, mid) + ellipsis;
            if (this.ctx.measureText(sub).width <= maxWidth) {
                best = sub;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return best || ellipsis;
    }

    private renderTechNodeLabels(
        title: string,
        specs: string[] | undefined,
        cx: number,
        y: number,
        width: number,
        height: number,
        specsColor: string = "rgba(224, 231, 255, 0.85)",
        topOffsetPercent: number = 0.44
    ) {
        const scaleW = width / 140;
        const scaleH = height / 105;
        const scale = Math.min(scaleW, scaleH);

        const titleSize = Math.max(9, Math.min(18, Math.round(12.5 * scale)));
        const specsSize = Math.max(8, Math.min(14, Math.round(9.5 * scale)));
        const maxTextWidth = Math.max(16, width - 16);

        this.ctx.save();
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        const titleY = y + height * topOffsetPercent;

        this.ctx.font = `bold ${titleSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        this.ctx.fillStyle = "#ffffff";
        const fittedTitle = this.fitTextToWidth(title, maxTextWidth);
        this.ctx.fillText(fittedTitle, cx, titleY);

        if (specs && specs.length > 0 && height >= 52) {
            this.ctx.font = `${specsSize}px ui-monospace, SFMono-Regular, monospace`;
            this.ctx.fillStyle = specsColor;

            const line1Y = titleY + Math.max(12, specsSize * 1.35);
            if (line1Y < y + height - 3) {
                const fittedSpec1 = this.fitTextToWidth(specs[0] || "", maxTextWidth);
                this.ctx.fillText(fittedSpec1, cx, line1Y);
            }

            if (specs.length > 1 && height >= 80) {
                const line2Y = line1Y + Math.max(12, specsSize * 1.35);
                if (line2Y < y + height - 3) {
                    this.ctx.fillStyle = specsColor.replace(/0\.[0-9]+/, "0.65");
                    const fittedSpec2 = this.fitTextToWidth(specs[1] || "", maxTextWidth);
                    this.ctx.fillText(fittedSpec2, cx, line2Y);
                }
            }
        }

        this.ctx.restore();
    }

    private renderTechNode(shape: {
        x: number;
        y: number;
        width: number;
        height: number;
        nodeType: TechNodeType;
        title: string;
        subtitle?: string;
        specs?: string[];
        strokeColor?: string;
        strokeWidth?: number;
    }) {
        const { x, y, width, height, nodeType, title, specs, strokeColor = "#38bdf8", strokeWidth = 2 } = shape;
        const cx = x + width / 2;
        const cy = y + height / 2;

        this.ctx.save();
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = strokeWidth;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";

        if (nodeType === "database") {
            // Authentic 3D Database Cylinder Icon
            const rx = width / 2;
            const ry = Math.min(16, height * 0.16);
            const topY = y + ry;
            const botY = y + height - ry;

            // Cylinder body gradient
            const grad = this.ctx.createLinearGradient(x, y, x + width, y + height);
            grad.addColorStop(0, "rgba(15, 23, 42, 0.96)");
            grad.addColorStop(1, "rgba(8, 14, 28, 0.98)");

            // Main cylinder contour
            this.ctx.beginPath();
            this.ctx.moveTo(x, topY);
            this.ctx.lineTo(x, botY);
            this.ctx.ellipse(cx, botY, rx, ry, 0, 0, Math.PI, false);
            this.ctx.lineTo(x + width, topY);
            this.ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI, true);
            this.ctx.closePath();
            this.ctx.fillStyle = grad;
            this.ctx.fill();
            this.ctx.stroke();

            // Top Cap Ellipse
            this.ctx.beginPath();
            this.ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI * 2);
            this.ctx.fillStyle = "rgba(56, 189, 248, 0.18)";
            this.ctx.fill();
            this.ctx.stroke();

            // Internal horizontal disk tier grooves
            const midY = topY + (botY - topY) * 0.44;
            this.ctx.beginPath();
            this.ctx.ellipse(cx, midY, rx, ry, 0, 0, Math.PI, false);
            this.ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
            this.ctx.stroke();
            this.ctx.strokeStyle = strokeColor;

            // Database Vector Glyph on top cap
            this.ctx.beginPath();
            this.ctx.ellipse(cx, topY, 7, 3, 0, 0, Math.PI * 2);
            this.ctx.fillStyle = strokeColor;
            this.ctx.fill();

            // Editable Title across upper tier
            const maxTextWidth = Math.max(16, width - 18);
            const scaleW = width / 140;
            const scaleH = height / 105;
            const scale = Math.min(scaleW, scaleH);
            const titleSize = Math.max(9, Math.min(18, Math.round(12.5 * scale)));
            const specsSize = Math.max(8, Math.min(14, Math.round(9.5 * scale)));

            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillStyle = "#ffffff";
            this.ctx.font = `bold ${titleSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            const fittedTitle = this.fitTextToWidth(title, maxTextWidth);
            this.ctx.fillText(fittedTitle, cx, topY + (midY - topY) * 0.52);

            // Editable Specs across lower tier
            if (specs && specs.length > 0 && height >= 55) {
                this.ctx.font = `${specsSize}px ui-monospace, SFMono-Regular, monospace`;
                this.ctx.fillStyle = "rgba(224, 231, 255, 0.85)";
                const fittedSpec1 = this.fitTextToWidth(specs[0]!, maxTextWidth);
                this.ctx.fillText(fittedSpec1, cx, midY + (botY - midY) * 0.46);
                if (specs.length > 1 && height >= 85) {
                    this.ctx.fillStyle = "rgba(224, 231, 255, 0.65)";
                    const fittedSpec2 = this.fitTextToWidth(specs[1]!, maxTextWidth);
                    this.ctx.fillText(fittedSpec2, cx, midY + (botY - midY) * 0.78);
                }
            }
        } else if (nodeType === "ec2") {
            // Authentic AWS EC2 Compute Processor Chip Icon
            // 1. Protruding Metallic Circuit Pin Leads
            this.ctx.strokeStyle = "#fbbf24";
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            // Top pins
            for (let i = 1; i <= 4; i++) {
                const px = x + (width * i) / 5;
                this.ctx.moveTo(px, y - 6);
                this.ctx.lineTo(px, y);
            }
            // Bottom pins
            for (let i = 1; i <= 4; i++) {
                const px = x + (width * i) / 5;
                this.ctx.moveTo(px, y + height);
                this.ctx.lineTo(px, y + height + 6);
            }
            // Left pins
            for (let i = 1; i <= 3; i++) {
                const py = y + (height * i) / 4;
                this.ctx.moveTo(x - 6, py);
                this.ctx.lineTo(x, py);
            }
            // Right pins
            for (let i = 1; i <= 3; i++) {
                const py = y + (height * i) / 4;
                this.ctx.moveTo(x + width, py);
                this.ctx.lineTo(x + width + 6, py);
            }
            this.ctx.stroke();

            // 2. Main Silicon Die Body
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = strokeWidth;
            const grad = this.ctx.createLinearGradient(x, y, x + width, y + height);
            grad.addColorStop(0, "rgba(28, 20, 14, 0.96)");
            grad.addColorStop(1, "rgba(14, 10, 6, 0.98)");
            this.ctx.fillStyle = grad;

            this.ctx.beginPath();
            if (typeof this.ctx.roundRect === "function") {
                this.ctx.roundRect(x, y, width, height, 10);
            } else {
                this.ctx.rect(x, y, width, height);
            }
            this.ctx.fill();
            this.ctx.stroke();

            // Pin 1 Index Notch in upper-left
            this.ctx.beginPath();
            this.ctx.arc(x + 10, y + 10, 2.5, 0, Math.PI * 2);
            this.ctx.fillStyle = strokeColor;
            this.ctx.fill();

            // CPU Silicon Emblem
            this.drawTechIcon("ec2", cx, y + Math.min(22, height * 0.2), strokeColor);

            // Editable Title & Specs
            this.renderTechNodeLabels(title, specs, cx, y, width, height, "rgba(254, 215, 170, 0.88)", 0.46);
        } else if (nodeType === "server") {
            // Authentic 19" Dual Server Rack Chassis Icon
            // 1. Left and Right Rack Ear Mounting Brackets
            this.ctx.fillStyle = "rgba(30, 41, 59, 0.95)";
            this.ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
            this.ctx.lineWidth = 1;

            // Left flange
            this.ctx.fillRect(x, y + 4, 10, height - 8);
            this.ctx.strokeRect(x, y + 4, 10, height - 8);
            // Right flange
            this.ctx.fillRect(x + width - 10, y + 4, 10, height - 8);
            this.ctx.strokeRect(x + width - 10, y + 4, 10, height - 8);

            // Screw holes
            this.ctx.fillStyle = "#94a3b8";
            this.ctx.beginPath();
            this.ctx.arc(x + 5, y + 14, 2, 0, Math.PI * 2);
            this.ctx.arc(x + 5, y + height - 14, 2, 0, Math.PI * 2);
            this.ctx.arc(x + width - 5, y + 14, 2, 0, Math.PI * 2);
            this.ctx.arc(x + width - 5, y + height - 14, 2, 0, Math.PI * 2);
            this.ctx.fill();

            // 2. Central Server Bay Enclosure
            const bx = x + 10;
            const bw = width - 20;
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = strokeWidth;
            const grad = this.ctx.createLinearGradient(bx, y, bx + bw, y + height);
            grad.addColorStop(0, "rgba(15, 23, 42, 0.96)");
            grad.addColorStop(1, "rgba(8, 14, 26, 0.98)");
            this.ctx.fillStyle = grad;

            this.ctx.beginPath();
            if (typeof this.ctx.roundRect === "function") {
                this.ctx.roundRect(bx, y, bw, height, 6);
            } else {
                this.ctx.rect(bx, y, bw, height);
            }
            this.ctx.fill();
            this.ctx.stroke();

            // Horizontal rack partition divider
            this.ctx.beginPath();
            this.ctx.moveTo(bx, cy);
            this.ctx.lineTo(bx + bw, cy);
            this.ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
            this.ctx.stroke();

            // Glowing Power & Status LEDs
            this.ctx.fillStyle = "#22c55e"; // Green Power
            this.ctx.beginPath();
            this.ctx.arc(bx + 10, y + 14, 2.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = "#38bdf8"; // Cyan Activity
            this.ctx.beginPath();
            this.ctx.arc(bx + 18, y + 14, 2.5, 0, Math.PI * 2);
            this.ctx.fill();

            // Lower bay LEDs
            this.ctx.fillStyle = "#22c55e";
            this.ctx.beginPath();
            this.ctx.arc(bx + 10, cy + 14, 2.5, 0, Math.PI * 2);
            this.ctx.fill();

            // Server icon glyph
            this.drawTechIcon("server", cx, y + Math.min(20, height * 0.18), strokeColor);

            // Editable Title & Specs
            this.renderTechNodeLabels(title, specs, cx, y, width, height, "rgba(186, 230, 253, 0.88)", 0.44);
        } else if (nodeType === "load_balancer") {
            // Authentic Hexagonal Gateway Router Icon
            const hx = width / 2;
            const grad = this.ctx.createLinearGradient(x, y, x + width, y + height);
            grad.addColorStop(0, "rgba(30, 16, 52, 0.96)");
            grad.addColorStop(1, "rgba(14, 8, 26, 0.98)");
            this.ctx.fillStyle = grad;

            this.ctx.beginPath();
            this.ctx.moveTo(x + hx * 0.35, y);
            this.ctx.lineTo(x + width - hx * 0.35, y);
            this.ctx.lineTo(x + width, cy);
            this.ctx.lineTo(x + width - hx * 0.35, y + height);
            this.ctx.lineTo(x + hx * 0.35, y + height);
            this.ctx.lineTo(x, cy);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            // Router Glyph
            this.drawTechIcon("load_balancer", cx, y + Math.min(22, height * 0.19), strokeColor);

            // Editable Title & Specs
            this.renderTechNodeLabels(title, specs, cx, y, width, height, "rgba(233, 213, 255, 0.88)", 0.45);
        } else if (nodeType === "redis") {
            // Authentic Memory Bank with 3D Lightning Bolt
            const grad = this.ctx.createLinearGradient(x, y, x + width, y + height);
            grad.addColorStop(0, "rgba(38, 12, 18, 0.96)");
            grad.addColorStop(1, "rgba(18, 6, 10, 0.98)");
            this.ctx.fillStyle = grad;

            this.ctx.beginPath();
            if (typeof this.ctx.roundRect === "function") {
                this.ctx.roundRect(x, y, width, height, 12);
            } else {
                this.ctx.rect(x, y, width, height);
            }
            this.ctx.fill();
            this.ctx.stroke();

            // RAM Bank Top Notch
            this.ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            this.ctx.beginPath();
            this.ctx.moveTo(x + 16, y);
            this.ctx.lineTo(x + 16, y + 8);
            this.ctx.moveTo(x + width - 16, y);
            this.ctx.lineTo(x + width - 16, y + 8);
            this.ctx.stroke();

            // 3D Lightning Bolt Icon
            this.drawTechIcon("redis", cx, y + Math.min(22, height * 0.19), strokeColor);

            // Editable Title & Specs
            this.renderTechNodeLabels(title, specs, cx, y, width, height, "rgba(254, 205, 211, 0.88)", 0.45);
        } else if (nodeType === "queue") {
            // Authentic Message Queue Pipeline Channel Icon
            const grad = this.ctx.createLinearGradient(x, y, x + width, y + height);
            grad.addColorStop(0, "rgba(10, 32, 22, 0.96)");
            grad.addColorStop(1, "rgba(6, 18, 12, 0.98)");
            this.ctx.fillStyle = grad;

            this.ctx.beginPath();
            if (typeof this.ctx.roundRect === "function") {
                this.ctx.roundRect(x, y, width, height, 12);
            } else {
                this.ctx.rect(x, y, width, height);
            }
            this.ctx.fill();
            this.ctx.stroke();

            // Message Partition Gate Lines
            this.ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
            this.ctx.beginPath();
            this.ctx.moveTo(x + 22, y + 6); this.ctx.lineTo(x + 22, y + height - 6);
            this.ctx.moveTo(x + width - 22, y + 6); this.ctx.lineTo(x + width - 22, y + height - 6);
            this.ctx.stroke();

            // Queue Icon
            this.drawTechIcon("queue", cx, y + Math.min(20, height * 0.18), strokeColor);

            // Editable Title & Specs
            this.renderTechNodeLabels(title, specs, cx, y, width, height, "rgba(167, 243, 208, 0.88)", 0.44);
        } else if (nodeType === "security") {
            // Authentic Security Shield Crest Icon
            const grad = this.ctx.createLinearGradient(x, y, x + width, y + height);
            grad.addColorStop(0, "rgba(34, 22, 10, 0.96)");
            grad.addColorStop(1, "rgba(18, 12, 6, 0.98)");
            this.ctx.fillStyle = grad;

            this.ctx.beginPath();
            this.ctx.moveTo(x + 14, y);
            this.ctx.lineTo(x + width - 14, y);
            this.ctx.quadraticCurveTo(x + width, y, x + width, y + 14);
            this.ctx.quadraticCurveTo(x + width, y + height * 0.68, cx, y + height);
            this.ctx.quadraticCurveTo(x, y + height * 0.68, x, y + 14);
            this.ctx.quadraticCurveTo(x, y, x + 14, y);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            // Shield Icon
            this.drawTechIcon("security", cx, y + Math.min(22, height * 0.19), strokeColor);

            // Editable Title & Specs
            this.renderTechNodeLabels(title, specs, cx, y, width, height, "rgba(253, 230, 138, 0.88)", 0.46);
        } else if (nodeType === "client") {
            // Authentic Client Display Monitor Icon
            const grad = this.ctx.createLinearGradient(x, y, x + width, y + height);
            grad.addColorStop(0, "rgba(15, 23, 42, 0.96)");
            grad.addColorStop(1, "rgba(8, 14, 28, 0.98)");
            this.ctx.fillStyle = grad;

            // Monitor Screen Frame
            this.ctx.beginPath();
            if (typeof this.ctx.roundRect === "function") {
                this.ctx.roundRect(x, y, width, height - 14, 8);
            } else {
                this.ctx.rect(x, y, width, height - 14);
            }
            this.ctx.fill();
            this.ctx.stroke();

            // Monitor Stand Neck & Foot
            this.ctx.beginPath();
            this.ctx.moveTo(cx - 5, y + height - 14);
            this.ctx.lineTo(cx - 5, y + height - 3);
            this.ctx.lineTo(cx - 20, y + height - 3);
            this.ctx.lineTo(cx + 20, y + height - 3);
            this.ctx.lineTo(cx + 5, y + height - 3);
            this.ctx.lineTo(cx + 5, y + height - 14);
            this.ctx.fillStyle = "rgba(56, 189, 248, 0.3)";
            this.ctx.fill();
            this.ctx.stroke();

            // Client Screen Glyph
            this.drawTechIcon("client", cx, y + Math.min(18, height * 0.16), strokeColor);

            // Editable Title & Specs
            this.renderTechNodeLabels(title, specs, cx, y, width, height, "rgba(224, 231, 255, 0.88)", 0.42);
        } else if (nodeType === "cloud") {
            // Authentic Multi-Lobe Cloud Container Icon
            const grad = this.ctx.createLinearGradient(x, y, x + width, y + height);
            grad.addColorStop(0, "rgba(15, 28, 48, 0.96)");
            grad.addColorStop(1, "rgba(8, 16, 32, 0.98)");
            this.ctx.fillStyle = grad;

            this.ctx.beginPath();
            if (typeof this.ctx.roundRect === "function") {
                this.ctx.roundRect(x, y, width, height, 16);
            } else {
                this.ctx.rect(x, y, width, height);
            }
            this.ctx.fill();
            this.ctx.stroke();

            this.drawTechIcon("cloud", cx, y + Math.min(20, height * 0.18), strokeColor);

            // Editable Title & Specs
            this.renderTechNodeLabels(title, specs, cx, y, width, height, "rgba(191, 219, 254, 0.88)", 0.44);
        } else if (nodeType === "terminal") {
            // Authentic Code Terminal Window
            const grad = this.ctx.createLinearGradient(x, y, x + width, y + height);
            grad.addColorStop(0, "rgba(18, 20, 26, 0.96)");
            grad.addColorStop(1, "rgba(10, 12, 16, 0.98)");
            this.ctx.fillStyle = grad;

            this.ctx.beginPath();
            if (typeof this.ctx.roundRect === "function") {
                this.ctx.roundRect(x, y, width, height, 8);
            } else {
                this.ctx.rect(x, y, width, height);
            }
            this.ctx.fill();
            this.ctx.stroke();

            // Terminal Traffic Lights
            this.ctx.fillStyle = "#ef4444";
            this.ctx.beginPath(); this.ctx.arc(x + 12, y + 12, 3, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.fillStyle = "#eab308";
            this.ctx.beginPath(); this.ctx.arc(x + 22, y + 12, 3, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.fillStyle = "#22c55e";
            this.ctx.beginPath(); this.ctx.arc(x + 32, y + 12, 3, 0, Math.PI * 2); this.ctx.fill();

            // Title & code lines
            this.renderTechNodeLabels(`> ${title}`, specs, cx, y, width, height, "rgba(254, 240, 138, 0.85)", 0.43);
        } else {
            // API Gateway / Microservice Router
            const grad = this.ctx.createLinearGradient(x, y, x + width, y + height);
            grad.addColorStop(0, "rgba(24, 16, 36, 0.96)");
            grad.addColorStop(1, "rgba(12, 8, 20, 0.98)");
            this.ctx.fillStyle = grad;

            this.ctx.beginPath();
            if (typeof this.ctx.roundRect === "function") {
                this.ctx.roundRect(x, y, width, height, 12);
            } else {
                this.ctx.rect(x, y, width, height);
            }
            this.ctx.fill();
            this.ctx.stroke();

            this.drawTechIcon("service", cx, y + Math.min(20, height * 0.18), strokeColor);

            // Editable Title & Specs
            this.renderTechNodeLabels(title, specs, cx, y, width, height, "rgba(233, 213, 255, 0.88)", 0.44);
        }

        this.ctx.restore();
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
            } else if (shape.type === "tech_node") {
                hit =
                    worldPoint.x >= shape.x - tolerance &&
                    worldPoint.x <= shape.x + shape.width + tolerance &&
                    worldPoint.y >= shape.y - tolerance &&
                    worldPoint.y <= shape.y + shape.height + tolerance;
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
            // 1. Check if user clicked on a resize handle of the currently selected shape
            if (this.selectedShapeId) {
                const selectedShape = this.existingShapes.find((s) => s.id === this.selectedShapeId);
                if (selectedShape) {
                    const handle = this.findResizeHandleAt(worldPos, selectedShape);
                    if (handle) {
                        this.isResizingShape = true;
                        this.activeResizeHandle = handle;
                        this.dragStartWorld = worldPos;
                        this.initialShapeState = JSON.parse(JSON.stringify(selectedShape));
                        this.updateResizeCursor(handle);
                        return;
                    }
                }
            }

            const hit = this.findShapeAt(worldPos);
            if (hit) {
                if (!hit.id) {
                    hit.id = `shape-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                }
                this.selectedShapeId = hit.id;
                this.initialShapeState = JSON.parse(JSON.stringify(hit));
                this.dragInitialShapes.clear();
                this.existingShapes.forEach((s) => {
                    if (s.id) {
                        this.dragInitialShapes.set(s.id, JSON.parse(JSON.stringify(s)));
                    }
                });
                this.isDraggingShape = true;
                this.dragStartWorld = worldPos;
                this.onSelectionChange?.(hit);
            } else {
                this.selectedShapeId = null;
                this.initialShapeState = null;
                this.dragInitialShapes.clear();
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
                return;
            } else if (hit && hit.type === "tech_node") {
                const content = [hit.title, ...(hit.specs || [])].join("\n");
                this.onStartTextEdit?.({
                    id: hit.id,
                    worldX: hit.x + 8,
                    worldY: hit.y + Math.max(10, hit.height / 2 - 24),
                    initialText: content,
                    fontSize: 13,
                    color: hit.strokeColor || "#ffffff",
                });
                return;
            } else {
                this.onStartTextEdit?.({
                    worldX: worldPos.x,
                    worldY: worldPos.y,
                    initialText: "",
                    fontSize: 20,
                    color: this.strokeColor,
                });
                return;
            }
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
        if (hit) {
            if (hit.type === "text") {
                this.onStartTextEdit?.({
                    id: hit.id,
                    worldX: hit.x,
                    worldY: hit.y,
                    initialText: hit.text,
                    fontSize: hit.fontSize || 20,
                    color: hit.strokeColor || this.strokeColor,
                });
            } else if (hit.type === "tech_node") {
                const content = [hit.title, ...(hit.specs || [])].join("\n");
                this.onStartTextEdit?.({
                    id: hit.id,
                    worldX: hit.x + 8,
                    worldY: hit.y + Math.max(10, hit.height / 2 - 24),
                    initialText: content,
                    fontSize: 13,
                    color: hit.strokeColor || "#ffffff",
                });
            }
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
            // A. Active handle resize
            if (this.isResizingShape && this.selectedShapeId && this.initialShapeState && this.activeResizeHandle) {
                const dx = worldPos.x - this.dragStartWorld.x;
                const dy = worldPos.y - this.dragStartWorld.y;
                const shape = this.existingShapes.find((s) => s.id === this.selectedShapeId);
                const init = this.initialShapeState;

                if (shape && init) {
                    const handle = this.activeResizeHandle;
                    this.updateResizeCursor(handle);

                    if (shape.type === "tech_node" && init.type === "tech_node") {
                        const minW = 70;
                        const minH = 50;
                        if (handle === "se") {
                            shape.width = Math.max(minW, init.width + dx);
                            shape.height = Math.max(minH, init.height + dy);
                        } else if (handle === "e") {
                            shape.width = Math.max(minW, init.width + dx);
                        } else if (handle === "s") {
                            shape.height = Math.max(minH, init.height + dy);
                        } else if (handle === "sw") {
                            const newW = Math.max(minW, init.width - dx);
                            shape.x = init.x + (init.width - newW);
                            shape.width = newW;
                            shape.height = Math.max(minH, init.height + dy);
                        } else if (handle === "w") {
                            const newW = Math.max(minW, init.width - dx);
                            shape.x = init.x + (init.width - newW);
                            shape.width = newW;
                        } else if (handle === "ne") {
                            shape.width = Math.max(minW, init.width + dx);
                            const newH = Math.max(minH, init.height - dy);
                            shape.y = init.y + (init.height - newH);
                            shape.height = newH;
                        } else if (handle === "n") {
                            const newH = Math.max(minH, init.height - dy);
                            shape.y = init.y + (init.height - newH);
                            shape.height = newH;
                        } else if (handle === "nw") {
                            const newW = Math.max(minW, init.width - dx);
                            const newH = Math.max(minH, init.height - dy);
                            shape.x = init.x + (init.width - newW);
                            shape.y = init.y + (init.height - newH);
                            shape.width = newW;
                            shape.height = newH;
                        }
                    } else if (shape.type === "rect" && init.type === "rect") {
                        const minW = 10;
                        const minH = 10;
                        if (handle === "se") {
                            shape.width = Math.max(minW, init.width + dx);
                            shape.height = Math.max(minH, init.height + dy);
                        } else if (handle === "e") {
                            shape.width = Math.max(minW, init.width + dx);
                        } else if (handle === "s") {
                            shape.height = Math.max(minH, init.height + dy);
                        } else if (handle === "sw") {
                            const newW = Math.max(minW, init.width - dx);
                            shape.x = init.x + (init.width - newW);
                            shape.width = newW;
                            shape.height = Math.max(minH, init.height + dy);
                        } else if (handle === "w") {
                            const newW = Math.max(minW, init.width - dx);
                            shape.x = init.x + (init.width - newW);
                            shape.width = newW;
                        } else if (handle === "ne") {
                            shape.width = Math.max(minW, init.width + dx);
                            const newH = Math.max(minH, init.height - dy);
                            shape.y = init.y + (init.height - newH);
                            shape.height = newH;
                        } else if (handle === "n") {
                            const newH = Math.max(minH, init.height - dy);
                            shape.y = init.y + (init.height - newH);
                            shape.height = newH;
                        } else if (handle === "nw") {
                            const newW = Math.max(minW, init.width - dx);
                            const newH = Math.max(minH, init.height - dy);
                            shape.x = init.x + (init.width - newW);
                            shape.y = init.y + (init.height - newH);
                            shape.width = newW;
                            shape.height = newH;
                        }
                    } else if (shape.type === "circle" && init.type === "circle") {
                        const dist = Math.hypot(worldPos.x - init.centerX, worldPos.y - init.centerY);
                        shape.radius = Math.max(10, Math.round(dist));
                    } else if (
                        (shape.type === "line" || shape.type === "arrow") &&
                        (init.type === "line" || init.type === "arrow")
                    ) {
                        if (handle === "start") {
                            shape.startX = init.startX + dx;
                            shape.startY = init.startY + dy;
                        } else if (handle === "end") {
                            shape.endX = init.endX + dx;
                            shape.endY = init.endY + dy;
                        }
                    }

                    this.clearCanvas();
                }
                return;
            }

            // B. Active shape dragging
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
                    } else if (shape.type === "tech_node" && init.type === "tech_node") {
                        shape.x = init.x + dx;
                        shape.y = init.y + dy;

                        // Also translate any arrows whose endpoints connect to this node
                        const initBounds = {
                            minX: init.x - 14,
                            maxX: init.x + init.width + 14,
                            minY: init.y - 14,
                            maxY: init.y + init.height + 14,
                        };

                        this.existingShapes.forEach((other) => {
                            if (other.id && (other.type === "arrow" || other.type === "line")) {
                                const origArrow = this.dragInitialShapes.get(other.id);
                                if (origArrow && (origArrow.type === "arrow" || origArrow.type === "line")) {
                                    if (
                                        origArrow.startX >= initBounds.minX &&
                                        origArrow.startX <= initBounds.maxX &&
                                        origArrow.startY >= initBounds.minY &&
                                        origArrow.startY <= initBounds.maxY
                                    ) {
                                        other.startX = origArrow.startX + dx;
                                        other.startY = origArrow.startY + dy;
                                    }
                                    if (
                                        origArrow.endX >= initBounds.minX &&
                                        origArrow.endX <= initBounds.maxX &&
                                        origArrow.endY >= initBounds.minY &&
                                        origArrow.endY <= initBounds.maxY
                                    ) {
                                        other.endX = origArrow.endX + dx;
                                        other.endY = origArrow.endY + dy;
                                    }
                                }
                            }
                        });
                    }
                    this.clearCanvas();
                }
            } else {
                // C. Hover state: check if hovering over a resize handle of selected shape
                if (this.selectedShapeId) {
                    const selectedShape = this.existingShapes.find((s) => s.id === this.selectedShapeId);
                    if (selectedShape) {
                        const handle = this.findResizeHandleAt(worldPos, selectedShape);
                        if (handle) {
                            this.updateResizeCursor(handle);
                            return;
                        }
                    }
                }

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
            // A. Finish interactive resizing
            if (this.isResizingShape && this.selectedShapeId) {
                const shape = this.existingShapes.find((s) => s.id === this.selectedShapeId);
                if (shape && this.initialShapeState) {
                    const init = this.initialShapeState;
                    const hasChanged = JSON.stringify(shape) !== JSON.stringify(init);
                    if (hasChanged) {
                        this.undoStack.push(
                            this.existingShapes.map((s) => (s.id === shape.id ? JSON.parse(JSON.stringify(init)) : { ...s }))
                        );
                        this.redoStack = [];
                        this.initialShapeState = JSON.parse(JSON.stringify(shape));
                        this.syncShapeUpdate(shape);
                        this.onSelectionChange?.(shape);
                    }
                }
                this.isResizingShape = false;
                this.activeResizeHandle = null;
                this.updateCursor();
                this.clearCanvas();
                return;
            }
            if (this.isDraggingShape && this.selectedShapeId && this.initialShapeState) {
                const worldPos = this.toWorld(e.clientX, e.clientY);
                const dx = worldPos.x - this.dragStartWorld.x;
                const dy = worldPos.y - this.dragStartWorld.y;

                if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                    const previousShapes = this.existingShapes.map((s) => {
                        const orig = this.dragInitialShapes.get(s.id || "");
                        return orig ? { ...orig } : { ...s };
                    });
                    this.undoStack.push(previousShapes);
                    this.redoStack = [];

                    const updatedShape = this.existingShapes.find((s) => s.id === this.selectedShapeId);
                    if (updatedShape) {
                        this.initialShapeState = JSON.parse(JSON.stringify(updatedShape));
                        this.syncShapeUpdate(updatedShape);
                    }

                    // Also sync any arrows whose endpoints moved with this node
                    this.existingShapes.forEach((s) => {
                        if (s.id && (s.type === "arrow" || s.type === "line")) {
                            const orig = this.dragInitialShapes.get(s.id);
                            if (orig && (orig.type === "arrow" || orig.type === "line")) {
                                if (
                                    s.startX !== orig.startX ||
                                    s.startY !== orig.startY ||
                                    s.endX !== orig.endX ||
                                    s.endY !== orig.endY
                                ) {
                                    this.syncShapeUpdate(s);
                                }
                            }
                        }
                    });
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

        // Delete selected shape (Delete or Backspace on Mac, Windows, Linux)
        if (
            (e.key === "Delete" || e.key === "Backspace" || e.code === "Delete" || e.code === "Backspace") &&
            (this.selectedShapeId || (this.initialShapeState && this.initialShapeState.id))
        ) {
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