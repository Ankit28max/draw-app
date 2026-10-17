"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/button";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

export function RoomJoinSection() {
    const [roomId, setRoomId] = useState("");
    const router = useRouter();

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        const target = roomId.trim() || "1";
        router.push(`/canvas/${target}`);
    };

    const handleRandomRoom = () => {
        const randomId = Math.floor(1000 + Math.random() * 9000).toString();
        router.push(`/canvas/${randomId}`);
    };

    return (
        <div className="mt-8 flex flex-col items-center gap-4 max-w-md mx-auto">
            <form onSubmit={handleJoin} className="w-full flex items-center gap-2 bg-card/60 backdrop-blur-md p-1.5 rounded-2xl border border-border shadow-lg">
                <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter Room Number (e.g. 1, 42)"
                    className="flex-1 bg-transparent px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none"
                />
                <Button type="submit" variant="primary" size="lg" className="h-10 px-5 text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
                    <span>Open Room</span>
                    <ArrowRight className="w-4 h-4" />
                </Button>
            </form>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <button
                    onClick={handleRandomRoom}
                    type="button"
                    className="hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
                >
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Create Random Room</span>
                </button>
                <span>•</span>
                <Link href="/canvas/1" className="hover:text-primary transition-colors">
                    Default Room 1
                </Link>
            </div>
        </div>
    );
}
