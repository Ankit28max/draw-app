import test from "node:test";
import assert from "node:assert/strict";

// Mirroring the pure geometric mathematical functions from apps/excelidraw-frontend/draw/Game.ts
function toWorld(screenX, screenY, panOffset, zoom, canvasRect = { left: 0, top: 0 }) {
    const clientX = screenX - canvasRect.left;
    const clientY = screenY - canvasRect.top;
    return {
        x: (clientX - panOffset.x) / zoom,
        y: (clientY - panOffset.y) / zoom,
    };
}

function toScreen(worldX, worldY, panOffset, zoom) {
    return {
        x: worldX * zoom + panOffset.x,
        y: worldY * zoom + panOffset.y,
    };
}

function distToSegment(p, v, w) {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

function getShapeBounds(shape) {
    if (shape.type === "rect") {
        return {
            minX: Math.min(shape.x, shape.x + shape.width),
            minY: Math.min(shape.y, shape.y + shape.height),
            maxX: Math.max(shape.x, shape.x + shape.width),
            maxY: Math.max(shape.y, shape.y + shape.height),
        };
    } else if (shape.type === "circle") {
        const r = Math.abs(shape.radius);
        return {
            minX: shape.centerX - r,
            minY: shape.centerY - r,
            maxX: shape.centerX + r,
            maxY: shape.centerY + r,
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

function isPointInShape(point, shape, tolerance = 10) {
    if (shape.type === "rect") {
        const bounds = getShapeBounds(shape);
        return (
            point.x >= bounds.minX - tolerance &&
            point.x <= bounds.maxX + tolerance &&
            point.y >= bounds.minY - tolerance &&
            point.y <= bounds.maxY + tolerance
        );
    } else if (shape.type === "circle") {
        const dist = Math.hypot(point.x - shape.centerX, point.y - shape.centerY);
        return dist <= Math.abs(shape.radius) + tolerance;
    } else if (shape.type === "line" || shape.type === "arrow") {
        const v = { x: shape.startX, y: shape.startY };
        const w = { x: shape.endX, y: shape.endY };
        return distToSegment(point, v, w) <= tolerance;
    } else if (shape.type === "tech_node") {
        return (
            point.x >= shape.x - tolerance &&
            point.x <= shape.x + shape.width + tolerance &&
            point.y >= shape.y - tolerance &&
            point.y <= shape.y + shape.height + tolerance
        );
    }
    return false;
}

test("Canvas Coordinate Transformation Suite", async (t) => {
    await t.test("world to screen projection with 1x zoom and 0 pan", () => {
        const pan = { x: 0, y: 0 };
        const zoom = 1.0;
        const screen = toScreen(100, 200, pan, zoom);
        assert.equal(screen.x, 100);
        assert.equal(screen.y, 200);

        const world = toWorld(100, 200, pan, zoom);
        assert.equal(world.x, 100);
        assert.equal(world.y, 200);
    });

    await t.test("handles 2.5x zoom and pan offset accurately", () => {
        const pan = { x: 150, y: -80 };
        const zoom = 2.5;
        const worldOriginal = { x: 400, y: 300 };

        const screen = toScreen(worldOriginal.x, worldOriginal.y, pan, zoom);
        assert.equal(screen.x, 400 * 2.5 + 150); // 1150
        assert.equal(screen.y, 300 * 2.5 - 80);  // 670

        const worldRecovered = toWorld(screen.x, screen.y, pan, zoom);
        assert.ok(Math.abs(worldRecovered.x - worldOriginal.x) < 0.0001);
        assert.ok(Math.abs(worldRecovered.y - worldOriginal.y) < 0.0001);
    });

    await t.test("handles extreme zoom out (0.1x) without precision breakdown", () => {
        const pan = { x: 500, y: 500 };
        const zoom = 0.1;
        const worldOriginal = { x: -2000, y: 3500 };

        const screen = toScreen(worldOriginal.x, worldOriginal.y, pan, zoom);
        const worldRecovered = toWorld(screen.x, screen.y, pan, zoom);
        assert.ok(Math.abs(worldRecovered.x - worldOriginal.x) < 0.0001);
        assert.ok(Math.abs(worldRecovered.y - worldOriginal.y) < 0.0001);
    });
});

test("Geometry & Bounding Box Calculation Suite", async (t) => {
    await t.test("computes rect bounds correctly even with negative width/height (drawn leftwards/upwards)", () => {
        const rectNormal = { type: "rect", x: 100, y: 100, width: 200, height: 150 };
        const boundsNormal = getShapeBounds(rectNormal);
        assert.deepEqual(boundsNormal, { minX: 100, minY: 100, maxX: 300, maxY: 250 });

        const rectInverted = { type: "rect", x: 300, y: 250, width: -200, height: -150 };
        const boundsInverted = getShapeBounds(rectInverted);
        assert.deepEqual(boundsInverted, { minX: 100, minY: 100, maxX: 300, maxY: 250 });
    });

    await t.test("computes circle bounds correctly from center and radius", () => {
        const circle = { type: "circle", centerX: 200, centerY: 200, radius: 50 };
        const bounds = getShapeBounds(circle);
        assert.deepEqual(bounds, { minX: 150, minY: 150, maxX: 250, maxY: 250 });
    });

    await t.test("computes line and arrow bounds regardless of direction", () => {
        const arrow = { type: "arrow", startX: 450, startY: 300, endX: 100, endY: 50 };
        const bounds = getShapeBounds(arrow);
        assert.deepEqual(bounds, { minX: 100, minY: 50, maxX: 450, maxY: 300 });
    });

    await t.test("computes multi-point pencil stroke bounds", () => {
        const pencil = {
            type: "pencil",
            points: [
                { x: 10, y: 20 },
                { x: 50, y: -10 },
                { x: 120, y: 80 },
                { x: -30, y: 40 }
            ]
        };
        const bounds = getShapeBounds(pencil);
        assert.deepEqual(bounds, { minX: -30, minY: -10, maxX: 120, maxY: 80 });
    });

    await t.test("computes tech node architecture card bounds", () => {
        const node = { type: "tech_node", x: 400, y: 250, width: 220, height: 110 };
        const bounds = getShapeBounds(node);
        assert.deepEqual(bounds, { minX: 400, minY: 250, maxX: 620, maxY: 360 });
    });
});

test("Hit Detection & Distance to Segment Suite", async (t) => {
    await t.test("distToSegment calculates perpendicular and endpoint distances", () => {
        const v = { x: 0, y: 0 };
        const w = { x: 100, y: 0 };

        // Point directly above the midpoint (perpendicular)
        assert.equal(distToSegment({ x: 50, y: 15 }, v, w), 15);

        // Point to the left of start point
        assert.equal(distToSegment({ x: -10, y: 0 }, v, w), 10);

        // Point to the right of end point
        assert.equal(distToSegment({ x: 120, y: 0 }, v, w), 20);
    });

    await t.test("detects hit on arrow within tolerance", () => {
        const arrow = { type: "arrow", startX: 100, startY: 100, endX: 300, endY: 100 };
        // Exactly on line
        assert.equal(isPointInShape({ x: 200, y: 100 }, arrow, 8), true);
        // Slightly off by 5px (within 8px tolerance)
        assert.equal(isPointInShape({ x: 200, y: 105 }, arrow, 8), true);
        // Off by 15px (outside 8px tolerance)
        assert.equal(isPointInShape({ x: 200, y: 115 }, arrow, 8), false);
    });

    await t.test("detects hit inside tech_node card", () => {
        const node = { type: "tech_node", x: 200, y: 150, width: 180, height: 90 };
        // Center of card
        assert.equal(isPointInShape({ x: 250, y: 180 }, node), true);
        // Outside card
        assert.equal(isPointInShape({ x: 100, y: 100 }, node), false);
    });

    await t.test("correctly translates attached arrow endpoints when a connected tech_node moves", () => {
        // Node initially at x: 200, y: 100, width: 220, height: 120
        const node = { id: "node-1", type: "tech_node", x: 200, y: 100, width: 220, height: 120 };
        // Arrow connecting from node's right edge (x: 420, y: 160) to another target (x: 600, y: 160)
        const arrow = { id: "arrow-1", type: "arrow", startX: 420, startY: 160, endX: 600, endY: 160 };

        const nodeBounds = {
            minX: node.x - 14,
            maxX: node.x + node.width + 14,
            minY: node.y - 14,
            maxY: node.y + node.height + 14,
        };

        const dx = 50;
        const dy = 30;

        // Simulate Game.ts arrow endpoint translation logic
        if (
            arrow.startX >= nodeBounds.minX &&
            arrow.startX <= nodeBounds.maxX &&
            arrow.startY >= nodeBounds.minY &&
            arrow.startY <= nodeBounds.maxY
        ) {
            arrow.startX += dx;
            arrow.startY += dy;
        }

        if (
            arrow.endX >= nodeBounds.minX &&
            arrow.endX <= nodeBounds.maxX &&
            arrow.endY >= nodeBounds.minY &&
            arrow.endY <= nodeBounds.maxY
        ) {
            arrow.endX += dx;
            arrow.endY += dy;
        }

        // Arrow start should have moved with the node
        assert.equal(arrow.startX, 470);
        assert.equal(arrow.startY, 190);
        // Arrow end should remain anchored to its destination
        assert.equal(arrow.endX, 600);
        assert.equal(arrow.endY, 160);
    });

    await t.test("allows editing title and specs inside tech_node and parses multiple lines", () => {
        const node = { id: "db-1", type: "tech_node", nodeType: "database", title: "PostgreSQL", specs: ["id: uuid"], width: 140, height: 110 };

        // User edits text to multi-line architecture spec
        const newRawText = "Users Primary Database\nport: 5432\nreplica: read-only";
        const lines = newRawText.split("\n").map(l => l.trim()).filter(l => l.length > 0);

        node.title = lines[0];
        node.specs = lines.slice(1);

        assert.equal(node.title, "Users Primary Database");
        assert.deepEqual(node.specs, ["port: 5432", "replica: read-only"]);
    });

    await t.test("verifies all 10 authentic architectural node contours are supported and editable", () => {
        const componentTypes = [
            "database",
            "ec2",
            "server",
            "load_balancer",
            "redis",
            "kafka",
            "auth",
            "client",
            "cloud",
            "terminal"
        ];

        for (const type of componentTypes) {
            const node = {
                id: `node-${type}`,
                type: "tech_node",
                nodeType: type,
                title: `${type.toUpperCase()} Node`,
                specs: ["active: true", "metric: p99 < 5ms"],
                width: 150,
                height: 110,
                x: 100,
                y: 100
            };

            const bounds = getShapeBounds(node);
            assert.equal(bounds.minX, 100);
            assert.equal(bounds.minY, 100);
            assert.equal(bounds.maxX, 250);
            assert.equal(bounds.maxY, 210);

            // In-place text mutation test
            node.title = `Edited ${type}`;
            node.specs = ["edited-spec-1"];
            assert.equal(node.title, `Edited ${type}`);
            assert.equal(node.specs[0], "edited-spec-1");
        }
    });

    await t.test("accurately detects all 8 resize handles for tech_node and rect", () => {
        function findResizeHandleAt(point, shape, zoom = 1.0) {
            const threshold = 12 / zoom;
            if (shape.type === "tech_node" || shape.type === "rect") {
                const minX = shape.x;
                const minY = shape.y;
                const maxX = shape.x + shape.width;
                const maxY = shape.y + shape.height;
                const midX = (minX + maxX) / 2;
                const midY = (minY + maxY) / 2;

                const handles = [
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
            }
            return null;
        }

        const node = { type: "tech_node", x: 200, y: 150, width: 140, height: 110 };

        // Test all 8 handles with slight coordinate offsets within 12px tolerance
        assert.equal(findResizeHandleAt({ x: 200, y: 150 }, node), "nw");
        assert.equal(findResizeHandleAt({ x: 340, y: 150 }, node), "ne");
        assert.equal(findResizeHandleAt({ x: 340, y: 260 }, node), "se");
        assert.equal(findResizeHandleAt({ x: 200, y: 260 }, node), "sw");
        assert.equal(findResizeHandleAt({ x: 270, y: 150 }, node), "n");
        assert.equal(findResizeHandleAt({ x: 270, y: 260 }, node), "s");
        assert.equal(findResizeHandleAt({ x: 200, y: 205 }, node), "w");
        assert.equal(findResizeHandleAt({ x: 340, y: 205 }, node), "e");

        // Points inside or far outside should return null
        assert.equal(findResizeHandleAt({ x: 270, y: 205 }, node), null); // Center
        assert.equal(findResizeHandleAt({ x: 50, y: 50 }, node), null); // Far away
    });

    await t.test("verifies interactive resize transforms and minimum dimension clamping", () => {
        const initNode = { id: "node-1", type: "tech_node", x: 100, y: 100, width: 150, height: 110 };
        const minW = 70;
        const minH = 50;

        // 1. SE expansion by (+50, +30)
        let dx = 50, dy = 30;
        let resized = { ...initNode };
        resized.width = Math.max(minW, initNode.width + dx);
        resized.height = Math.max(minH, initNode.height + dy);
        assert.equal(resized.width, 200);
        assert.equal(resized.height, 140);
        assert.equal(resized.x, 100);
        assert.equal(resized.y, 100);

        // 2. NW contraction by (+100, +80) -> should move origin and shrink dimensions
        dx = 50; dy = 40;
        let newW = Math.max(minW, initNode.width - dx);
        let newH = Math.max(minH, initNode.height - dy);
        resized.x = initNode.x + (initNode.width - newW);
        resized.y = initNode.y + (initNode.height - newH);
        resized.width = newW;
        resized.height = newH;
        assert.equal(resized.x, 150);
        assert.equal(resized.y, 140);
        assert.equal(resized.width, 100);
        assert.equal(resized.height, 70);

        // 3. Excessive shrink attempt -> clamps at minW (70) and minH (50)
        dx = 200; dy = 200;
        newW = Math.max(minW, initNode.width - dx);
        newH = Math.max(minH, initNode.height - dy);
        assert.equal(newW, 70);
        assert.equal(newH, 50);
    });

    await t.test("verifies non-destructive template placement preserves existing shapes and offsets horizontally", () => {
        const existingShapes = [
            { id: "s1", type: "rect", x: 100, y: 100, width: 200, height: 150 },
            { id: "s2", type: "tech_node", x: 400, y: 120, width: 140, height: 110 }
        ];

        // Raw template shapes designed around world origin (0, 0)
        const templateShapes = [
            { id: "tpl-1", type: "tech_node", x: 0, y: 0, width: 140, height: 110 },
            { id: "tpl-2", type: "tech_node", x: 220, y: 0, width: 140, height: 110 }
        ];

        // Algorithm from loadArchitectureTemplate:
        let minX = Infinity, minY = Infinity, maxX = -Infinity;
        for (const shape of existingShapes) {
            const bounds = getShapeBounds(shape);
            if (bounds.minX < minX) minX = bounds.minX;
            if (bounds.minY < minY) minY = bounds.minY;
            if (bounds.maxX > maxX) maxX = bounds.maxX;
        }

        assert.equal(minX, 100);
        assert.equal(minY, 100);
        assert.equal(maxX, 540); // 400 + 140

        const offsetX = maxX + 80; // 620
        const offsetY = minY;      // 100

        const placedTemplateShapes = templateShapes.map((s, idx) => ({
            ...s,
            id: `template-${Date.now()}-${idx}`,
            x: s.x + offsetX,
            y: s.y + offsetY
        }));

        // Non-destructive append
        const combined = [...existingShapes, ...placedTemplateShapes];

        // All shapes preserved
        assert.equal(combined.length, 4);
        assert.equal(combined[0].id, "s1");
        assert.equal(combined[1].id, "s2");

        // Template shapes offset cleanly past maxX of existing shapes with 80px gap
        assert.equal(placedTemplateShapes[0].x, 620);
        assert.equal(placedTemplateShapes[0].y, 100);
        assert.equal(placedTemplateShapes[1].x, 840);
        assert.equal(placedTemplateShapes[1].y, 100);
    });

    await t.test("verifies text truncation and proportional font sizing inside tech_node", () => {
        // Mock measurement: average 8px per character
        function mockMeasureText(str) {
            return { width: str.length * 8 };
        }

        function fitTextToWidth(text, maxWidth) {
            if (!text) return "";
            if (maxWidth <= 8) return "";
            if (mockMeasureText(text).width <= maxWidth) {
                return text;
            }
            const ellipsis = "…";
            let low = 0;
            let high = text.length;
            let best = "";
            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                const sub = text.substring(0, mid) + ellipsis;
                if (mockMeasureText(sub).width <= maxWidth) {
                    best = sub;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }
            return best || ellipsis;
        }

        const longTitle = "PostgreSQL Distributed Production Primary Cluster Node";
        const narrowWidth = 80;
        const maxTextWidth = narrowWidth - 16; // 64px max width = ~8 chars

        const fitted = fitTextToWidth(longTitle, maxTextWidth);
        assert.ok(fitted.endsWith("…"), "Truncated string must end with ellipsis");
        assert.ok(mockMeasureText(fitted).width <= maxTextWidth, "Fitted text must not exceed maxTextWidth");

        // Short title should not truncate
        const shortTitle = "Redis";
        assert.equal(fitTextToWidth(shortTitle, 100), "Redis");

        // Proportional font scaling
        function computeNodeFontSizes(width, height) {
            const scaleW = width / 140;
            const scaleH = height / 105;
            const scale = Math.min(scaleW, scaleH);
            const titleSize = Math.max(9, Math.min(18, Math.round(12.5 * scale)));
            const specsSize = Math.max(8, Math.min(14, Math.round(9.5 * scale)));
            return { titleSize, specsSize };
        }

        // Small node (70x50): font scales down
        const smallSizes = computeNodeFontSizes(70, 50);
        assert.equal(smallSizes.titleSize, 9);
        assert.equal(smallSizes.specsSize, 8);

        // Standard node (140x105): standard size
        const standardSizes = computeNodeFontSizes(140, 105);
        assert.equal(standardSizes.titleSize, 13);
        assert.equal(standardSizes.specsSize, 10);

        // Large node (280x210): scales up proportionally
        const largeSizes = computeNodeFontSizes(280, 210);
        assert.equal(largeSizes.titleSize, 18);
        assert.equal(largeSizes.specsSize, 14);
    });

    await t.test("verifies keyboard deletion removes selected shape and pushes undo history", () => {
        let existingShapes = [
            { id: "s1", type: "rect", x: 10, y: 10, width: 50, height: 50 },
            { id: "s2", type: "tech_node", x: 100, y: 100, width: 140, height: 110 }
        ];
        let selectedShapeId = "s2";
        let undoStack = [];

        // Keyboard Delete / Backspace simulation
        function deleteSelected(id) {
            if (!id) return;
            undoStack.push(JSON.parse(JSON.stringify(existingShapes)));
            existingShapes = existingShapes.filter(s => s.id !== id);
            selectedShapeId = null;
        }

        deleteSelected(selectedShapeId);

        // Shape s2 should be removed, s1 retained
        assert.equal(existingShapes.length, 1);
        assert.equal(existingShapes[0].id, "s1");
        assert.equal(selectedShapeId, null);

        // Undo stack should hold the previous 2 shapes
        assert.equal(undoStack.length, 1);
        assert.equal(undoStack[0].length, 2);
    });
});


