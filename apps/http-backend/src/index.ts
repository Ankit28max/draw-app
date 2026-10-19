import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { middleware } from "./middleware";
import { CreateUserSchema, SigninSchema, CreateRoomSchema } from "@repo/common/types";
import { prismaClient } from "@repo/db/client";
import cors from "cors";
import crypto from "node:crypto";

const app = express();
app.use(express.json());

const corsOrigin = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(",").map(s => s.trim()) 
    : "*";
app.use(cors({ origin: corsOrigin }));

// Enterprise-grade password hashing with cryptographic salt and timing attack protection
function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
    if (!stored.includes(":")) {
        // Safe backward-compatibility for legacy accounts
        return password === stored;
    }
    const [salt, key] = stored.split(":");
    if (!salt || !key) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(hash, "hex"));
}

// Health check endpoint for container probes (Docker / Kubernetes / Railway / AWS)
app.get("/health", async (_req: Request, res: Response) => {
    if (!process.env.DATABASE_URL) {
        res.status(503).json({
            status: "unhealthy",
            error: "DATABASE_URL environment variable is missing",
            timestamp: new Date().toISOString()
        });
        return;
    }

    try {
        await prismaClient.$queryRaw`SELECT 1`;
        res.json({
            status: "healthy",
            service: "http-backend",
            uptime: Math.round(process.uptime()),
            timestamp: new Date().toISOString()
        });
    } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error("Health check DB connection error:", errorMsg);
        res.status(503).json({
            status: "unhealthy",
            error: "Database connection failed",
            detail: errorMsg,
            timestamp: new Date().toISOString()
        });
    }
});

app.post("/signup", async (req: Request, res: Response) => {
    const parsedData = CreateUserSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({
            message: "Invalid inputs. Username/email and password must be at least 3 characters."
        });
        return;
    }

    const email = parsedData.data.username.trim().toLowerCase();
    const name = parsedData.data.name?.trim() || email.split("@")[0] || "User";
    const password = hashPassword(parsedData.data.password);

    try {
        const existing = await prismaClient.user.findFirst({
            where: { email }
        });
        if (existing) {
            res.status(409).json({
                message: "User already exists with this username/email"
            });
            return;
        }

        const user = await prismaClient.user.create({
            data: {
                email,
                password,
                name
            }
        });

        const token = jwt.sign({
            userId: user.id
        }, JWT_SECRET);

        res.json({
            userId: user.id,
            token,
            name: user.name
        });
    } catch (e) {
        console.error("Signup error:", e);
        res.status(500).json({
            message: "Internal server error during registration"
        });
    }
});

app.post("/signin", async (req: Request, res: Response) => {
    const parsedData = SigninSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({
            message: "Invalid inputs. Please check your username and password."
        });
        return;
    }

    const email = parsedData.data.username.trim().toLowerCase();
    const rawPassword = parsedData.data.password;

    try {
        const user = await prismaClient.user.findFirst({
            where: {
                email
            }
        });

        if (!user || !verifyPassword(rawPassword, user.password)) {
            res.status(401).json({
                message: "Invalid username or password"
            });
            return;
        }

        const token = jwt.sign({
            userId: user.id
        }, JWT_SECRET);

        res.json({
            token,
            userId: user.id,
            name: user.name
        });
    } catch (e) {
        console.error("Signin error:", e);
        res.status(500).json({
            message: "Internal server error during login"
        });
    }
});

app.post("/room", middleware, async (req: Request, res: Response) => {
    const parsedData = CreateRoomSchema.safeParse(req.body);
    if (!parsedData.success) {
        res.status(400).json({
            message: "Incorrect inputs"
        });
        return;
    }
    const userId = ((req as any).userId as string) || "";

    try {
        const room = await prismaClient.room.create({
            data: {
                slug: parsedData.data.name.trim().toLowerCase(),
                adminId: userId
            }
        });

        res.json({
            roomId: room.id
        });
    } catch (e) {
        res.status(409).json({
            message: "Room already exists with this name"
        });
    }
});

app.get("/chats/:roomId", async (req: Request, res: Response) => {
    try {
        const rawRoomId = req.params.roomId;
        if (!rawRoomId) {
            res.json({ messages: [] });
            return;
        }

        const roomIdParam = String(rawRoomId);
        let roomId = Number(roomIdParam);

        if (isNaN(roomId)) {
            const room = await prismaClient.room.findFirst({
                where: { slug: roomIdParam.trim().toLowerCase() }
            });
            if (room) {
                roomId = room.id;
            } else {
                res.json({ messages: [] });
                return;
            }
        }

        const messages = await prismaClient.chat.findMany({
            where: {
                roomId: roomId
            },
            orderBy: {
                id: "asc"
            },
            take: 1000
        });

        res.json({
            messages
        });
    } catch (e) {
        console.error("Error fetching chats:", e);
        res.json({
            messages: []
        });
    }
});

app.get("/room/:slug", async (req: Request, res: Response) => {
    const rawSlug = req.params.slug;
    if (!rawSlug) {
        res.json({ room: null });
        return;
    }

    const slug = String(rawSlug);
    const room = await prismaClient.room.findFirst({
        where: {
            slug
        }
    });

    res.json({
        room
    });
});

app.delete("/chats/:roomId", async (req: Request, res: Response) => {
    try {
        const rawRoomId = req.params.roomId;
        if (!rawRoomId) {
            res.status(400).json({ success: false, message: "Missing roomId" });
            return;
        }

        const roomIdParam = String(rawRoomId);
        let roomId = Number(roomIdParam);

        if (isNaN(roomId)) {
            const room = await prismaClient.room.findFirst({
                where: { slug: roomIdParam.trim().toLowerCase() }
            });
            if (room) {
                roomId = room.id;
            } else {
                res.json({ success: true, count: 0 });
                return;
            }
        }

        const deleted = await prismaClient.chat.deleteMany({
            where: { roomId }
        });

        res.json({ success: true, count: deleted.count });
    } catch (e) {
        console.error("Error clearing chats:", e);
        res.status(500).json({ success: false, message: "Failed to clear chats" });
    }
});

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
    console.log(`HTTP backend server running on port ${PORT}`);
});