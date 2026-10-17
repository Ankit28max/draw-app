import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";

export function middleware(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers["authorization"] ?? "";

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string };

        if (decoded && decoded.userId) {
            (req as any).userId = decoded.userId;
            next();
            return;
        }

        res.status(403).json({
            message: "Unauthorized"
        });
    } catch (e) {
        res.status(403).json({
            message: "Unauthorized"
        });
    }
}