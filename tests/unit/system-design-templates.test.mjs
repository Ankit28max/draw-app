import test from "node:test";
import assert from "node:assert/strict";

// We extract the pure shape generators from Game.ts to verify the architecture topology
function generateTemplateShapes(templateKey) {
    if (templateKey === "hld_this_app") {
        return [
            { id: "app-client", type: "tech_node", x: 60, y: 190, width: 210, height: 125, nodeType: "client", title: "Next.js 15 Client", subtitle: "FRONTEND", specs: ["HTML5 60 FPS Canvas", "React 19 + Turbopack", "LERP Cursor Smoothing"] },
            { id: "app-proxy", type: "tech_node", x: 340, y: 190, width: 210, height: 125, nodeType: "load_balancer", title: "Cloudflare & L7 Proxy", subtitle: "GATEWAY", specs: ["Wildcard SSL / TLS 1.3", "WSS & HTTP Routing", "DDoS Shield & Anycast"] },
            { id: "app-http", type: "tech_node", x: 620, y: 90, width: 220, height: 125, nodeType: "server", title: "HTTP Backend (:3001)", subtitle: "REST API", specs: ["scrypt Password Hashing", "JWT Auth & Bearer Guard", "Room & Chat Endpoints"] },
            { id: "app-ws", type: "tech_node", x: 620, y: 290, width: 230, height: 130, nodeType: "ec2", title: "WebSocket Server (:8080)", subtitle: "SYNC ENGINE", specs: ["Multiplexed Room Hub", "512KB DoS Payload Guard", "30s Heartbeat Pruner"] },
            { id: "app-buffer", type: "tech_node", x: 915, y: 290, width: 230, height: 130, nodeType: "queue", title: "Write-Behind Queue", subtitle: "BUFFER", specs: ["In-Memory Spliced Queue", "Batch Drain: 30 shapes", "Interval: 1500ms Flush"] },
            { id: "app-db", type: "tech_node", x: 1210, y: 180, width: 230, height: 140, nodeType: "database", title: "PostgreSQL Database", subtitle: "PRISMA ORM", specs: ["User, Room & Chat Tables", "Foreign Key Constraints", "Indexes on [roomId]"] },
            // Connectors
            { id: "app-conn-1", type: "arrow", startX: 270, startY: 252, endX: 340, endY: 252, strokeColor: "#38bdf8" },
            { id: "app-conn-2", type: "arrow", startX: 550, startY: 220, endX: 620, endY: 152, strokeColor: "#38bdf8" },
            { id: "app-conn-3", type: "arrow", startX: 550, startY: 275, endX: 620, endY: 355, strokeColor: "#f97316" },
            { id: "app-conn-4", type: "arrow", startX: 840, startY: 152, endX: 1210, endY: 220, strokeColor: "#38bdf8" },
            { id: "app-conn-5", type: "arrow", startX: 850, startY: 355, endX: 915, endY: 355, strokeColor: "#f97316" },
            { id: "app-conn-6", type: "arrow", startX: 1145, startY: 355, endX: 1210, endY: 270, strokeColor: "#34d399" },
        ];
    }

    if (templateKey === "hld_uber") {
        return [
            { id: "uber-client", type: "tech_node", x: 60, y: 160, width: 170, height: 95, nodeType: "client", title: "Rider & Driver App", subtitle: "React Native Client", specs: ["WebSocket Geo-Telemetry", "TLS 1.3 / HTTP/2", "P99 < 80ms"] },
            { id: "uber-gateway", type: "tech_node", x: 300, y: 160, width: 170, height: 95, nodeType: "gateway", title: "Envoy Edge Gateway", subtitle: "L7 Reverse Proxy", specs: ["Rate Limiting & Auth", "WSS Multiplexing", "SSL Termination"] },
            { id: "uber-kafka", type: "tech_node", x: 550, y: 80, width: 180, height: 95, nodeType: "queue", title: "Apache Kafka Bus", subtitle: "Location Event Stream", specs: ["100K msgs/sec throughput", "Partition by DriverId", "Zero-Data-Loss WAL"] },
            { id: "uber-redis", type: "tech_node", x: 550, y: 240, width: 180, height: 95, nodeType: "cache", title: "Redis Geo Cluster", subtitle: "H3 Spatial Indexes", specs: ["GEOADD / GEORADIUS", "Sub-millisecond reads", "In-Memory RAM"] },
            { id: "uber-match", type: "tech_node", x: 810, y: 80, width: 180, height: 95, nodeType: "service", title: "Match & Dispatch Engine", subtitle: "Go Microservice Pods", specs: ["Hungarian Algorithm", "Surge Pricing Worker", "Horizontal Autoscaling"] },
            { id: "uber-db", type: "tech_node", x: 810, y: 240, width: 180, height: 95, nodeType: "database", title: "PostgreSQL Master/Replica", subtitle: "Trips & Ledger DB", specs: ["ACID Financial Ledger", "Row-level sharding", "WAL Streaming"] },
            // Connectors
            { id: "conn-1", type: "arrow", startX: 230, startY: 207, endX: 300, endY: 207, strokeColor: "#38bdf8" },
            { id: "conn-2", type: "arrow", startX: 470, startY: 190, endX: 550, endY: 127, strokeColor: "#a855f7" },
            { id: "conn-3", type: "arrow", startX: 470, startY: 220, endX: 550, endY: 287, strokeColor: "#06b6d4" },
            { id: "conn-4", type: "arrow", startX: 730, startY: 127, endX: 810, endY: 127, strokeColor: "#10b981" },
            { id: "conn-5", type: "arrow", startX: 730, startY: 287, endX: 810, endY: 287, strokeColor: "#f59e0b" },
        ];
    }

    if (templateKey === "hld_tinyurl") {
        return [
            { id: "tu-client", type: "tech_node", x: 60, y: 160, width: 170, height: 95, nodeType: "client", title: "API Consumers", subtitle: "Web / Mobile Browsers", specs: ["GET /{shortCode}", "POST /v1/urls", "400M Daily Active Requests"] },
            { id: "tu-cdn", type: "tech_node", x: 300, y: 160, width: 170, height: 95, nodeType: "gateway", title: "Cloudflare Edge CDN", subtitle: "Edge Cache Layer", specs: ["Edge 301 Redirect Cache", "DDoS Mitigation", "Global Anycast DNS"] },
            { id: "tu-core", type: "tech_node", x: 550, y: 160, width: 180, height: 95, nodeType: "service", title: "URL Core Service", subtitle: "Base62 Hash Generator", specs: ["Snowflake ID Generation", "Base62 Encoding", "Stateless Node Pods"] },
            { id: "tu-cache", type: "tech_node", x: 800, y: 70, width: 180, height: 95, nodeType: "cache", title: "Redis Cache Cluster", subtitle: "Hot URL Memory Store", specs: ["LRU Eviction Policy", "90% Cache Hit Rate", "< 2ms Latency"] },
            { id: "tu-db", type: "tech_node", x: 800, y: 240, width: 180, height: 95, nodeType: "database", title: "PostgreSQL DB Cluster", subtitle: "Persistent Metadata", specs: ["B-Tree Index on shortCode", "Read Replicas Pool", "Multi-AZ High Availability"] },
            // Connectors
            { id: "tu-conn-1", type: "arrow", startX: 230, startY: 207, endX: 300, endY: 207, strokeColor: "#38bdf8" },
            { id: "tu-conn-2", type: "arrow", startX: 470, startY: 207, endX: 550, endY: 207, strokeColor: "#a855f7" },
            { id: "tu-conn-3", type: "arrow", startX: 730, startY: 190, endX: 800, endY: 117, strokeColor: "#06b6d4" },
            { id: "tu-conn-4", type: "arrow", startX: 730, startY: 220, endX: 800, endY: 287, strokeColor: "#f59e0b" },
        ];
    }

    if (templateKey === "lld_state_machine") {
        return [
            { id: "sm-pending", type: "tech_node", x: 60, y: 160, width: 170, height: 95, nodeType: "client", title: "STATE: PENDING", subtitle: "Initial Order Creation", specs: ["Cart Validation Pass", "Hold Inventory Lock", "Generate Idempotency Key"] },
            { id: "sm-auth", type: "tech_node", x: 310, y: 160, width: 180, height: 95, nodeType: "service", title: "STATE: AUTHORIZING", subtitle: "Payment Gateway Saga", specs: ["Stripe / PayPal Handshake", "Exponential Backoff", "Circuit Breaker Active"] },
            { id: "sm-completed", type: "tech_node", x: 570, y: 80, width: 180, height: 95, nodeType: "service", title: "STATE: COMPLETED", subtitle: "Order Success Finalized", specs: ["Debit Inventory", "Publish OrderCreated Event", "Send Receipt Email"] },
            { id: "sm-failed", type: "tech_node", x: 570, y: 250, width: 180, height: 95, nodeType: "database", title: "STATE: FAILED", subtitle: "Rollback Compensating Tx", specs: ["Release Inventory Lock", "Notify Customer", "Log Incident Metrics"] },
            // Connectors
            { id: "sm-conn-1", type: "arrow", startX: 230, startY: 207, endX: 310, endY: 207, strokeColor: "#38bdf8" },
            { id: "sm-conn-2", type: "arrow", startX: 490, startY: 190, endX: 570, endY: 127, strokeColor: "#10b981" },
            { id: "sm-conn-3", type: "arrow", startX: 490, startY: 220, endX: 570, endY: 297, strokeColor: "#ef4444" },
        ];
    }

    if (templateKey === "lld_erd") {
        return [
            { id: "erd-users", type: "tech_node", x: 60, y: 120, width: 190, height: 110, nodeType: "database", title: "Table: users", subtitle: "User Credentials & Profile", specs: ["id: UUID PRIMARY KEY", "email: VARCHAR(255) UNIQUE", "password_hash: VARCHAR", "created_at: TIMESTAMP"] },
            { id: "erd-orders", type: "tech_node", x: 340, y: 120, width: 200, height: 120, nodeType: "database", title: "Table: orders", subtitle: "Purchase Order Header", specs: ["id: SERIAL PRIMARY KEY", "user_id: UUID FK -> users.id", "status: order_status_enum", "total_amount: DECIMAL(12,2)"] },
            { id: "erd-items", type: "tech_node", x: 630, y: 120, width: 200, height: 120, nodeType: "database", title: "Table: order_items", subtitle: "Line Item Details", specs: ["id: SERIAL PRIMARY KEY", "order_id: INT FK -> orders.id", "product_id: INT FK -> products.id", "quantity: INT", "unit_price: DECIMAL(10,2)"] },
            { id: "erd-products", type: "tech_node", x: 630, y: 290, width: 200, height: 110, nodeType: "database", title: "Table: products", subtitle: "Catalog & Inventory", specs: ["id: SERIAL PRIMARY KEY", "sku: VARCHAR(64) UNIQUE", "title: VARCHAR(255)", "stock_count: INT"] },
            // Connectors
            { id: "erd-conn-1", type: "arrow", startX: 250, startY: 175, endX: 340, endY: 175, strokeColor: "#38bdf8" },
            { id: "erd-conn-2", type: "arrow", startX: 540, startY: 175, endX: 630, endY: 175, strokeColor: "#a855f7" },
            { id: "erd-conn-3", type: "arrow", startX: 730, startY: 240, endX: 730, endY: 290, strokeColor: "#10b981" },
        ];
    }

    return [];
}

test("System Design Templates Structural Suite", async (t) => {
    const templates = ["hld_this_app", "hld_uber", "hld_tinyurl", "lld_state_machine", "lld_erd"];

    for (const key of templates) {
        await t.test(`template '${key}' conforms to valid architecture topology`, () => {
            const shapes = generateTemplateShapes(key);
            assert.ok(shapes.length > 0, `Template ${key} should produce shapes`);

            const ids = new Set();
            const nodes = [];
            const arrows = [];

            for (const shape of shapes) {
                // Ensure unique ID
                assert.ok(!ids.has(shape.id), `Duplicate shape ID detected: ${shape.id}`);
                ids.add(shape.id);

                if (shape.type === "tech_node") {
                    nodes.push(shape);
                    assert.ok(shape.title && shape.title.length > 0);
                    assert.ok(shape.width > 50);
                    assert.ok(shape.height > 50);
                    assert.ok(!isNaN(shape.x));
                    assert.ok(!isNaN(shape.y));
                    assert.ok(Array.isArray(shape.specs) && shape.specs.length > 0);
                } else if (shape.type === "arrow") {
                    arrows.push(shape);
                    assert.ok(!isNaN(shape.startX));
                    assert.ok(!isNaN(shape.startY));
                    assert.ok(!isNaN(shape.endX));
                    assert.ok(!isNaN(shape.endY));
                    const length = Math.hypot(shape.endX - shape.startX, shape.endY - shape.startY);
                    assert.ok(length >= 20, `Arrow ${shape.id} is too short (< 20px)`);
                }
            }

            assert.ok(nodes.length >= 3, `Template ${key} must have at least 3 nodes`);
            assert.ok(arrows.length >= 2, `Template ${key} must have at least 2 connector arrows for flow simulation`);
        });
    }
});
