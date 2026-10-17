import { WebSocket, WebSocketServer } from 'ws';
import jwt from "jsonwebtoken";
import { JWT_SECRET } from '@repo/backend-common/config';
import { prismaClient } from "@repo/db/client";

const wss = new WebSocketServer({ port: 8080 });

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
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string };
      if (decoded && decoded.userId) {
        return decoded.userId;
      }
    }
  } catch (e) {
    // Fall back to guest session
  }
  return `guest-${Math.random().toString(36).substring(2, 10)}`;
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

wss.on('connection', function connection(ws, request) {
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
        const payload = JSON.stringify({
          type: "cursor_move",
          roomId: roomIdStr,
          connectionId: currentUser.connectionId,
          userName: currentUser.userName,
          color: currentUser.color,
          x,
          y,
        });

        users.forEach(u => {
          if (u.rooms.includes(roomIdStr) && u.ws !== ws && u.ws.readyState === WebSocket.OPEN) {
            u.ws.send(payload);
          }
        });
      }
      return;
    }

    if (parsedData.type === "cursor_leave") {
      const roomIdStr = String(parsedData.roomId);
      const payload = JSON.stringify({
        type: "cursor_leave",
        roomId: roomIdStr,
        connectionId: currentUser.connectionId,
      });

      users.forEach(u => {
        if (u.rooms.includes(roomIdStr) && u.ws !== ws && u.ws.readyState === WebSocket.OPEN) {
          u.ws.send(payload);
        }
      });
      return;
    }

    if (parsedData.type === "chat") {
      const roomIdStr = String(parsedData.roomId);
      const messageContent = parsedData.message;

      // Broadcast immediately to ALL other tabs in the same room (low latency)
      users.forEach(user => {
        if (user.rooms.includes(roomIdStr) && user.ws !== ws) {
          if (user.ws.readyState === WebSocket.OPEN) {
            user.ws.send(JSON.stringify({
              type: "chat",
              message: messageContent,
              roomId: roomIdStr
            }));
          }
        }
      });

      // Persist to database asynchronously
      ensureRoomAndUser(roomIdStr, userId).then(async (resolvedRoomId) => {
        if (resolvedRoomId !== null) {
          try {
            await prismaClient.chat.create({
              data: {
                roomId: resolvedRoomId,
                message: messageContent,
                userId
              }
            });
          } catch (e) {
            console.error("Error storing shape in database:", e);
          }
        }
      }).catch(err => {
        console.error("Failed to ensure room/user for chat save:", err);
      });

      return;
    }

    if (parsedData.type === "delete_shape") {
      const roomIdStr = String(parsedData.roomId);
      const shapeId = parsedData.shapeId;

      users.forEach(user => {
        if (user.rooms.includes(roomIdStr) && user.ws !== ws) {
          if (user.ws.readyState === WebSocket.OPEN) {
            user.ws.send(JSON.stringify({
              type: "delete_shape",
              shapeId,
              roomId: roomIdStr
            }));
          }
        }
      });

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

      users.forEach(user => {
        if (user.rooms.includes(roomIdStr) && user.ws !== ws) {
          if (user.ws.readyState === WebSocket.OPEN) {
            user.ws.send(JSON.stringify({
              type: "update_shape",
              shape,
              roomId: roomIdStr
            }));
          }
        }
      });

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

      users.forEach(user => {
        if (user.rooms.includes(roomIdStr) && user.ws !== ws) {
          if (user.ws.readyState === WebSocket.OPEN) {
            user.ws.send(JSON.stringify({
              type: "clear_canvas",
              roomId: roomIdStr
            }));
          }
        }
      });
      return;
    }
  });
});
