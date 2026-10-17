import test from "node:test";
import assert from "node:assert/strict";

function computePacketPosition(arrow, simulationProgress, arrowIndex) {
    const dx = arrow.endX - arrow.startX;
    const dy = arrow.endY - arrow.startY;
    const dist = Math.hypot(dx, dy);

    // Compute packet progress with slight phase stagger per arrow
    const phase = (simulationProgress + arrowIndex * 0.28) % 1;
    const px = arrow.startX + dx * phase;
    const py = arrow.startY + dy * phase;

    const tailLen = Math.min(32, dist * 0.35);
    const tailProgress = Math.max(0, phase - tailLen / dist);
    const tx = arrow.startX + dx * tailProgress;
    const ty = arrow.startY + dy * tailProgress;

    return {
        phase,
        head: { x: px, y: py },
        tail: { x: tx, y: ty },
        dist
    };
}

function getBezierPoint(p0, p1, p2, p3, t) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
    const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
    return { x, y };
}

function selectTelemetryLabel(arrowIndex) {
    const telemetryLabels = [
        "POST /v1 (24ms)",
        "Kafka Pub/Sub (3ms)",
        "SQL Query (12ms)",
        "Redis Hit (1ms)",
        "gRPC Stream (6ms)",
        "JWT Verify (2ms)",
    ];
    return telemetryLabels[arrowIndex % telemetryLabels.length];
}

test("Linear Vector Flow Simulation Mathematics Suite", async (t) => {
    const arrow = {
        type: "arrow",
        startX: 100,
        startY: 200,
        endX: 500,
        endY: 200 // length = 400px
    };

    await t.test("at progress t = 0 (arrow 0), packet starts at startX, startY", () => {
        const { head, phase } = computePacketPosition(arrow, 0.0, 0);
        assert.equal(phase, 0);
        assert.equal(head.x, 100);
        assert.equal(head.y, 200);
    });

    await t.test("at progress t = 0.5 (arrow 0), packet is at exact midpoint", () => {
        const { head, phase } = computePacketPosition(arrow, 0.5, 0);
        assert.equal(phase, 0.5);
        assert.equal(head.x, 300);
        assert.equal(head.y, 200);
    });

    await t.test("tail lag correctly trails behind packet head", () => {
        const { head, tail } = computePacketPosition(arrow, 0.5, 0);
        assert.ok(tail.x < head.x, "Tail x should lag behind head x");
        assert.equal(tail.y, head.y);
        assert.ok(head.x - tail.x <= 32.01, "Tail length should be bounded");
    });

    await t.test("phase staggering creates distinct packet offsets across multiple arrows", () => {
        const packet0 = computePacketPosition(arrow, 0.1, 0);
        const packet1 = computePacketPosition(arrow, 0.1, 1);
        const packet2 = computePacketPosition(arrow, 0.1, 2);

        assert.notEqual(packet0.phase, packet1.phase);
        assert.notEqual(packet1.phase, packet2.phase);
        assert.ok(Math.abs(packet1.phase - ((0.1 + 0.28) % 1)) < 0.0001);
    });
});

test("Cubic Bezier Hero Flow Curve Interpolation Suite", async (t) => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 100, y: 0 };
    const p2 = { x: 100, y: 200 };
    const p3 = { x: 200, y: 200 };

    await t.test("at t = 0, Bezier evaluates to p0", () => {
        const pt = getBezierPoint(p0, p1, p2, p3, 0);
        assert.equal(pt.x, 0);
        assert.equal(pt.y, 0);
    });

    await t.test("at t = 1, Bezier evaluates to p3", () => {
        const pt = getBezierPoint(p0, p1, p2, p3, 1);
        assert.equal(pt.x, 200);
        assert.equal(pt.y, 200);
    });

    await t.test("at t = 0.5, Bezier yields smooth midpoint", () => {
        const pt = getBezierPoint(p0, p1, p2, p3, 0.5);
        assert.equal(pt.x, 100);
        assert.equal(pt.y, 100);
    });
});

test("Telemetry Label Assignment & Format Suite", async (t) => {
    await t.test("cycles telemetry labels cyclically", () => {
        const l0 = selectTelemetryLabel(0);
        const l1 = selectTelemetryLabel(1);
        const l6 = selectTelemetryLabel(6);

        assert.equal(l0, "POST /v1 (24ms)");
        assert.equal(l1, "Kafka Pub/Sub (3ms)");
        assert.equal(l6, l0, "Index 6 should loop back to index 0");
    });
});
