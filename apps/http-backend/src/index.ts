import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { middleware } from "./middleware";
import { CreateUserSchema, SigninSchema, CreateRoomSchema } from "@repo/common/types";
import { prismaClient } from "@repo/db/client";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

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
    const password = parsedData.data.password;

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
    const password = parsedData.data.password;

    try {
        const user = await prismaClient.user.findFirst({
            where: {
                email,
                password
            }
        });

        if (!user) {
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

app.listen(3001, () => {
    console.log("HTTP backend server running on port 3001");
});