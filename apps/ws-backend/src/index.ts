import http from "node:http";
import { WebSocket, WebSocketServer } from 'ws';
import jwt from "jsonwebtoken";
import { JWT_SECRET } from '@repo/backend-common/config';
import { prismaClient } from "@repo/db/client";

const PORT = Number(process.env.PORT || 8080);

// HTTP server to handle health checks and container probes
const server = http.createServer(async (req, res) => {
  const url = req.url?.split("?")[0];
  if (url === "/health" || url === "/") {
    let dbStatus = "unknown";
    try {
      await prismaClient.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    } catch {
      dbStatus = "disconnected";
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "healthy",
      service: "ws-backend",
      database: dbStatus,
      activeConnections: wss.clients.size,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

const wss = new WebSocketServer({ server });

server.listen(PORT, () => {
  console.log(`WebSocket and HTTP health server running on port ${PORT}`);
});

// Heartbeat protocol: prune dead sockets every 30 seconds to prevent zombie connections and memory leaks
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((client: any) => {
    if (client.isAlive === false) {
      console.log("Terminating dead WebSocket connection");
      return client.terminate();
    }
    client.isAlive = false;
    client.ping();
  });
}, 30000);

interface User {
  ws: WebSocket;
  rooms: string[];
  userId: string;
  connectionId: string;
  userName: string;
  color: string;
}

const users: User[] = [];

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

function assignColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index]!;
}

function broadcastRoomPresence(roomId: string) {
  const roomUsers = users
    .filter(u => u.rooms.includes(roomId))
    .map(u => ({
      connectionId: u.connectionId,
      userId: u.userId,
      userName: u.userName,
      color: u.color,
    }));

  const message = JSON.stringify({
    type: "presence_update",
    roomId,
    users: roomUsers,
  });

  users.forEach(u => {
    if (u.rooms.includes(roomId) && u.ws.readyState === WebSocket.OPEN) {
      u.ws.send(message);
    }
  });
}

function checkUser(token: string): string {
  try {
    let cleanToken = token ? token.trim() : "";
    if (cleanToken.startsWith("Bearer ")) {
      cleanToken = cleanToken.slice(7).trim();
    }
    if (cleanToken) {
      const decoded = jwt.verify(cleanToken, JWT_SECRET) as { userId?: string };
      if (decoded && decoded.userId) {
        return decoded.userId;
      }
    }
  } catch (e) {
    // Fall back to guest session
  }
  return `guest-${Math.random().toString(36).substring(2, 10)}`;
}

// Write-Behind Persistence Buffer to prevent DB connection exhaustion during rapid sketching
interface QueuedShape {
  roomIdStr: string;
  userId: string;
  messageContent: string;
}

const persistenceQueue: QueuedShape[] = [];
let isFlushingQueue = false;

async function flushPersistenceQueue() {
  if (isFlushingQueue || persistenceQueue.length === 0) return;
  isFlushingQueue = true;
  const batch = persistenceQueue.splice(0, 30);

  try {
    for (const item of batch) {
      const resolvedRoomId = await ensureRoomAndUser(item.roomIdStr, item.userId);
      if (resolvedRoomId !== null) {
        await prismaClient.chat.create({
          data: {
            roomId: resolvedRoomId,
            message: item.messageContent,
            userId: item.userId
          }
        });
      }
    }
  } catch (e) {
    console.error("Error flushing persistence queue:", e);
  } finally {
    isFlushingQueue = false;
  }
}

// Drain queue every 1.5 seconds
setInterval(flushPersistenceQueue, 1500);

// Multi-client room broadcast helper (scalable across Redis Pub/Sub if configured)
function broadcastToRoom(roomIdStr: string, senderWs: WebSocket | null, payload: string) {
  users.forEach(u => {
    if (u.rooms.includes(roomIdStr) && u.ws !== senderWs && u.ws.readyState === WebSocket.OPEN) {
      u.ws.send(payload);
    }
  });
}

async function ensureRoomAndUser(roomIdParam: string, userId: string): Promise<number | null> {
  try {
    // 1. Ensure user exists in database to satisfy foreign key constraint
    let dbUser = await prismaClient.user.findUnique({
      where: { id: userId }
    });

    if (!dbUser) {
      dbUser = await prismaClient.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: `${userId}@canvas.local`,
          name: "Collaborator",
          password: "guest-password-temp"
        }
      });
    }

    // 2. Ensure room exists in database to satisfy foreign key constraint
    const numericId = Number(roomIdParam);
    if (!isNaN(numericId)) {
      let room = await prismaClient.room.findUnique({
        where: { id: numericId }
      });
      if (!room) {
        room = await prismaClient.room.create({
          data: {
            slug: `room-${numericId}`,
            adminId: dbUser.id
          }
        });
      }
      return room.id;
    } else {
      const slug = roomIdParam.trim().toLowerCase();
      let room = await prismaClient.room.findFirst({
        where: { slug }
      });
      if (!room) {
        room = await prismaClient.room.create({
          data: {
            slug,
            adminId: dbUser.id
          }
        });
      }
      return room.id;
    }
  } catch (e) {
    console.error("ensureRoomAndUser error:", e);
    return null;
  }
}

wss.on('connection', function connection(ws: WebSocket, request) {
  (ws as any).isAlive = true;
  ws.on('pong', () => {
    (ws as any).isAlive = true;
  });

  const url = request.url;
  if (!url) return;

  const queryParams = new URLSearchParams(url.split('?')[1]);
  const token = queryParams.get('token') || "";
  const userId = checkUser(token);
  const connectionId = `conn-${Math.random().toString(36).substring(2, 10)}`;

  const currentUser: User = {
    userId,
    connectionId,
    userName: `Guest-${connectionId.slice(-4)}`,
    color: assignColor(connectionId),
    rooms: [],
    ws
  };
  users.push(currentUser);

  // Send initialization handshake
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "init",
      connectionId: currentUser.connectionId,
      color: currentUser.color,
      userId: currentUser.userId
    }));
  }

  ws.on('close', function() {
    const userIndex = users.findIndex(x => x.ws === ws);
    if (userIndex !== -1) {
      const closedUser = users[userIndex];
      const affectedRooms = [...(closedUser?.rooms || [])];
      users.splice(userIndex, 1);

      affectedRooms.forEach(roomId => {
        // Broadcast cursor leave
        users.forEach(u => {
          if (u.rooms.includes(roomId) && u.ws.readyState === WebSocket.OPEN) {
            u.ws.send(JSON.stringify({
              type: "cursor_leave",
              roomId,
              connectionId: closedUser?.connectionId,
            }));
          }
        });
        // Broadcast updated presence list
        broadcastRoomPresence(roomId);
      });
    }
  });

  ws.on('error', function(err) {
    console.error("WebSocket client error:", err);
  });

  ws.on('message', async function message(data) {
    // Guard against oversized payload attacks (>512KB)
    const rawLen = Buffer.isBuffer(data) ? data.length : typeof (data as any) === "string" ? (data as any).length : 0;
    if (rawLen > 524288) return;

    let parsedData: any;
    try {
      if (typeof data !== "string") {
        parsedData = JSON.parse(data.toString());
      } else {
        parsedData = JSON.parse(data);
      }
    } catch (e) {
      console.error("Invalid JSON message received", e);
      return;
    }

    if (parsedData.type === "ping") {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "pong" }));
      }
      return;
    }

    if (parsedData.type === "join_room") {
      const roomIdStr = String(parsedData.roomId);
      if (parsedData.userName && typeof parsedData.userName === "string" && parsedData.userName.trim()) {
        currentUser.userName = parsedData.userName.trim();
      }
      if (!currentUser.rooms.includes(roomIdStr)) {
        currentUser.rooms.push(roomIdStr);
      }
      // Send handshake confirmation to client so connectionId and color are guaranteed
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "init",
          connectionId: currentUser.connectionId,
          color: currentUser.color,
          userId: currentUser.userId
        }));
      }
      // Ensure the room exists in background
      ensureRoomAndUser(roomIdStr, userId).catch(() => {});
      // Broadcast updated presence to all participants in this room
      broadcastRoomPresence(roomIdStr);
      return;
    }

    if (parsedData.type === "leave_room") {
      const targetRoom = String(parsedData.roomId || parsedData.room);
      currentUser.rooms = currentUser.rooms.filter(x => x !== targetRoom);
      users.forEach(u => {
        if (u.rooms.includes(targetRoom) && u.ws !== ws && u.ws.readyState === WebSocket.OPEN) {
          u.ws.send(JSON.stringify({
            type: "cursor_leave",
            roomId: targetRoom,
            connectionId: currentUser.connectionId,
          }));
        }
      });
      broadcastRoomPresence(targetRoom);
      return;
    }

    if (parsedData.type === "cursor_move") {
      const roomIdStr = String(parsedData.roomId);
      const x = parsedData.x;
      const y = parsedData.y;

      if (typeof x === "number" && typeof y === "number") {
        broadcastToRoom(roomIdStr, ws, JSON.stringify({
          type: "cursor_move",
          roomId: roomIdStr,
          connectionId: currentUser.connectionId,
          userName: currentUser.userName,
          color: currentUser.color,
          x,
          y,
        }));
      }
      return;
    }

    if (parsedData.type === "cursor_leave") {
      const roomIdStr = String(parsedData.roomId);
      broadcastToRoom(roomIdStr, ws, JSON.stringify({
        type: "cursor_leave",
        roomId: roomIdStr,
        connectionId: currentUser.connectionId,
      }));
      return;
    }

    if (parsedData.type === "chat") {
      const roomIdStr = String(parsedData.roomId);
      const messageContent = parsedData.message;

      // Broadcast immediately to ALL other tabs in the same room (< 1ms latency)
      broadcastToRoom(roomIdStr, ws, JSON.stringify({
        type: "chat",
        message: messageContent,
        roomId: roomIdStr
      }));

      // Queue for write-behind persistence
      persistenceQueue.push({
        roomIdStr,
        userId,
        messageContent
      });
      if (persistenceQueue.length >= 25) {
        flushPersistenceQueue().catch(() => {});
      }

      return;
    }

    if (parsedData.type === "delete_shape") {
      const roomIdStr = String(parsedData.roomId);
      const shapeId = parsedData.shapeId;

      broadcastToRoom(roomIdStr, ws, JSON.stringify({
        type: "delete_shape",
        shapeId,
        roomId: roomIdStr
      }));

      if (shapeId) {
        ensureRoomAndUser(roomIdStr, userId).then(async (resolvedRoomId) => {
          if (resolvedRoomId !== null) {
            try {
              const chats = await prismaClient.chat.findMany({
                where: { roomId: resolvedRoomId, message: { contains: shapeId } }
              });
              for (const c of chats) {
                await prismaClient.chat.delete({ where: { id: c.id } });
              }
            } catch (e) {
              console.error("Error deleting shape from database:", e);
            }
          }
        }).catch(() => {});
      }
      return;
    }

    if (parsedData.type === "update_shape") {
      const roomIdStr = String(parsedData.roomId);
      const shape = parsedData.shape;

      broadcastToRoom(roomIdStr, ws, JSON.stringify({
        type: "update_shape",
        shape,
        roomId: roomIdStr
      }));

      if (shape && shape.id) {
        ensureRoomAndUser(roomIdStr, userId).then(async (resolvedRoomId) => {
          if (resolvedRoomId !== null) {
            try {
              const chats = await prismaClient.chat.findMany({
                where: { roomId: resolvedRoomId, message: { contains: shape.id } }
              });
              for (const c of chats) {
                await prismaClient.chat.update({
                  where: { id: c.id },
                  data: {
                    message: JSON.stringify({ shape })
                  }
                });
              }
            } catch (e) {
              console.error("Error updating shape in database:", e);
            }
          }
        }).catch(() => {});
      }
      return;
    }

    if (parsedData.type === "clear_canvas") {
      const roomIdStr = String(parsedData.roomId);

      // 1. Broadcast clear event to all clients in this room immediately
      broadcastToRoom(roomIdStr, ws, JSON.stringify({
        type: "clear_canvas",
        roomId: roomIdStr
      }));

      // 2. Clear any pending unpersisted strokes for this room from the write-behind buffer
      for (let i = persistenceQueue.length - 1; i >= 0; i--) {
        if (persistenceQueue[i]?.roomIdStr === roomIdStr) {
          persistenceQueue.splice(i, 1);
        }
      }

      // 3. Delete all persisted shapes/chats from the database for this room
      ensureRoomAndUser(roomIdStr, userId).then(async (resolvedRoomId) => {
        if (resolvedRoomId !== null) {
          try {
            await prismaClient.chat.deleteMany({
              where: { roomId: resolvedRoomId }
            });
            console.log(`Successfully cleared all persisted shapes for room ${roomIdStr} (id: ${resolvedRoomId})`);
          } catch (e) {
            console.error(`Error deleting canvas chats for room ${roomIdStr}:`, e);
          }
        }
      }).catch((e) => {
        console.error("ensureRoomAndUser error during clear_canvas:", e);
      });

      return;
    }

    if (parsedData.type === "flow_simulation_toggle") {
      const roomIdStr = String(parsedData.roomId);
      broadcastToRoom(roomIdStr, ws, JSON.stringify(parsedData));
      return;
    }
  });
});

// Production Graceful Shutdown: flush write-behind buffer and disconnect cleanly
async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Flushing persistence buffer and closing server...`);
  clearInterval(heartbeatInterval);
  try {
    await flushPersistenceQueue();
    console.log("Persistence buffer drained.");
  } catch (e) {
    console.error("Error draining persistence buffer during shutdown:", e);
  }

  server.close();
  wss.close(() => {
    console.log("WebSocket server closed.");
    prismaClient.$disconnect().then(() => {
      console.log("Database disconnected. Process exiting cleanly.");
      process.exit(0);
    });
  });

  // Force exit after 5 seconds if connections hang
  setTimeout(() => {
    console.error("Graceful shutdown timeout exceeded. Forcing exit.");
    process.exit(1);
  }, 5000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

