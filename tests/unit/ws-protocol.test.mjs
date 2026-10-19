import test from "node:test";
import assert from "node:assert/strict";

const CURSOR_COLORS = [
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#a855f7", // Purple
  "#ec4899", // Pink
];

function assignColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index];
}

function processIncomingMessage(rawBufferOrString, maxSizeBytes = 524288) {
  const rawLen = Buffer.isBuffer(rawBufferOrString)
    ? rawBufferOrString.length
    : typeof rawBufferOrString === "string"
    ? rawBufferOrString.length
    : 0;

  if (rawLen > maxSizeBytes) {
    return { dropped: true, reason: "OVERSIZED_PAYLOAD" };
  }

  let parsedData;
  try {
    if (typeof rawBufferOrString !== "string") {
      parsedData = JSON.parse(rawBufferOrString.toString());
    } else {
      parsedData = JSON.parse(rawBufferOrString);
    }
  } catch (e) {
    return { dropped: true, reason: "MALFORMED_JSON" };
  }

  return { dropped: false, data: parsedData };
}

test("WebSocket Protocol Security & Resilience Suite", async (t) => {
    await t.test("drops oversized payloads (>512KB) to prevent DoS attacks", () => {
        const largeString = "x".repeat(524289);
        const result = processIncomingMessage(largeString);
        assert.equal(result.dropped, true);
        assert.equal(result.reason, "OVERSIZED_PAYLOAD");
    });

    await t.test("accepts payloads under 512KB", () => {
        const validJson = JSON.stringify({ type: "ping" });
        const result = processIncomingMessage(validJson);
        assert.equal(result.dropped, false);
        assert.equal(result.data.type, "ping");
    });

    await t.test("safely handles Buffer data format", () => {
        const buf = Buffer.from(JSON.stringify({ type: "join_room", roomId: "hld-uber" }));
        const result = processIncomingMessage(buf);
        assert.equal(result.dropped, false);
        assert.equal(result.data.roomId, "hld-uber");
    });

    await t.test("gracefully drops malformed JSON without throwing exceptions", () => {
        const corruptJson = "{\type: 'unclosed, corrupted json...";
        const result = processIncomingMessage(corruptJson);
        assert.equal(result.dropped, true);
        assert.equal(result.reason, "MALFORMED_JSON");
    });
});

test("Cursor Color Assignment Determinism Suite", async (t) => {
    await t.test("produces deterministic color for identical connection IDs", () => {
        const id1 = "conn-usr-789";
        const c1 = assignColor(id1);
        const c2 = assignColor(id1);
        assert.equal(c1, c2);
        assert.ok(CURSOR_COLORS.includes(c1));
    });

    await t.test("distributes colors across different connection IDs", () => {
        const colorSet = new Set();
        for (let i = 0; i < 50; i++) {
            colorSet.add(assignColor(`conn-user-${i}`));
        }
        assert.ok(colorSet.size > 1, "Should distribute among palette colors");
    });
});

test("Write-Behind Persistence Batching Suite", async (t) => {
    await t.test("correctly slices batch size of 30 without mutation anomalies", () => {
        const queue = [];
        for (let i = 0; i < 75; i++) {
            queue.push({ id: i, msg: `shape-${i}` });
        }

        const batch1 = queue.splice(0, 30);
        assert.equal(batch1.length, 30);
        assert.equal(batch1[0].id, 0);
        assert.equal(batch1[29].id, 29);
        assert.equal(queue.length, 45);

        const batch2 = queue.splice(0, 30);
        assert.equal(batch2.length, 30);
        assert.equal(batch2[0].id, 30);
        assert.equal(queue.length, 15);

        const batch3 = queue.splice(0, 30);
        assert.equal(batch3.length, 15);
        assert.equal(queue.length, 0);
    });

    await t.test("purges pending strokes for specific room on clear_canvas", () => {
        let queue = [
            { roomIdStr: "room-1", shape: "s1" },
            { roomIdStr: "room-2", shape: "s2" },
            { roomIdStr: "room-1", shape: "s3" },
            { roomIdStr: "room-3", shape: "s4" },
        ];

        // Simulate clear_canvas for room-1
        const targetRoom = "room-1";
        for (let i = queue.length - 1; i >= 0; i--) {
            if (queue[i]?.roomIdStr === targetRoom) {
                queue.splice(i, 1);
            }
        }

        assert.equal(queue.length, 2);
        assert.ok(queue.every(item => item.roomIdStr !== "room-1"));
        assert.equal(queue[0].shape, "s2");
        assert.equal(queue[1].shape, "s4");
    });
});

test("Guest Session Resolution Suite", async (t) => {
    await t.test("generates unique guest session ID when no token is supplied", () => {
        function resolveUser(token) {
            if (token && token.trim()) {
                return "authenticated-user-id";
            }
            return `guest-${Math.random().toString(36).substring(2, 10)}`;
        }

        const guest1 = resolveUser("");
        const guest2 = resolveUser(null);
        const guest3 = resolveUser(undefined);

        assert.ok(guest1.startsWith("guest-"));
        assert.ok(guest2.startsWith("guest-"));
        assert.ok(guest3.startsWith("guest-"));
        assert.notEqual(guest1, guest2, "Each guest session must have a unique identifier");
    });
});
