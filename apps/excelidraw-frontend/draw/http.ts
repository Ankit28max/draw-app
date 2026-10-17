import { HTTP_BACKEND } from "@/config";
import axios from "axios";

export async function getExistingShapes(roomId: string) {
    try {
        const res = await axios.get(`${HTTP_BACKEND}/chats/${roomId}`);
        const messages = res.data?.messages || [];

        const shapesMap = new Map<string, any>();
        const anonymousShapes = [];

        for (const x of messages) {
            try {
                if (!x.message) continue;
                const messageData = JSON.parse(x.message);
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
        console.error("Failed to load existing shapes:", e);
        return [];
    }
}