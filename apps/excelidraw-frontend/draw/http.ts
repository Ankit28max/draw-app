import { HTTP_BACKEND } from "@/config";
import axios from "axios";

export async function getExistingShapes(roomId: string) {
    try {
        let messages: any[] = [];
        try {
            // 1. Same-origin proxy first (immune to CORS and build-time env baking)
            const res = await axios.get(`/api/chats/${roomId}`, { timeout: 6000 });
            messages = res.data?.messages || [];
        } catch {
            // 2. Direct HTTP_BACKEND fallback
            const res = await axios.get(`${HTTP_BACKEND}/chats/${roomId}`, { timeout: 6000 });
            messages = res.data?.messages || [];
        }

        const shapesMap = new Map<string, any>();
        const anonymousShapes = [];

        for (const x of messages) {
            try {
                if (!x.message) continue;
                let messageData = x.message;
                if (typeof messageData === "string") {
                    try {
                        messageData = JSON.parse(messageData);
                    } catch {
                        continue;
                    }
                }
                if (messageData && messageData.shape) {
                    const s = messageData.shape;
                    if (s.id) {
                        shapesMap.set(s.id, s);
                    } else {
                        anonymousShapes.push(s);
                    }
                }
            } catch (e) {
                // Ignore non-shape or invalid chat messages
            }
        }

        return [...Array.from(shapesMap.values()), ...anonymousShapes];
    } catch (e) {
        console.warn(`[Shapes] Could not load shapes for room ${roomId}:`, e);
        return [];
    }
}