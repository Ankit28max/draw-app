import express from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { middleware } from "./middleware";
import { CreateUserSchema, CreateRoomSchema, SignInSchema } from "@repo/common/types";
const app = express();

app.post("/signup", (req, res) => {
    const data = CreateUserSchema.safeParse(req.body);
    if (!data.success) {
        res.status(400).json({
            message: "Invalid data"
        })
        return;
    }
    //dbcall
    res.json({
        userId: "123"
    })
})

app.post("/signin", (req, res) => {
    const data = SignInSchema.safeParse(req.body);
    if (!data.success) {
        res.status(400).json({
            message: "Invalid data"
        })
        return;
    }
    const userId = 1;
    const token = jwt.sign({
        userId
    }, JWT_SECRET);
    res.json({ 
        token 
    });
})

app.post("/room", middleware, (req, res) => {
    const data = CreateRoomSchema.safeParse(req.body);
    if (!data.success) {
        res.status(400).json({
            message: "Invalid data"
        })
        return;
    }
    //dbcall
    res.json({
        roomId: "123"
    })
})

app.listen(3001);