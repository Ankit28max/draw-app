"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Hash } from "lucide-react";
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
        const randomId = `room-${Math.floor(1000 + Math.random() * 9000)}`;
        router.push(`/canvas/${randomId}`);
    };

    return (
        <div className="flex flex-col items-center gap-3.5 max-w-lg mx-auto w-full">
            <form onSubmit={handleJoin} className="w-full flex items-center gap-2 bg-zinc-900/90 backdrop-blur-xl p-2 rounded-2xl border border-zinc-800 shadow-2xl focus-within:border-blue-500/60 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                <div className="pl-3 text-zinc-500 flex items-center">
                    <Hash className="w-4 h-4" />
                </div>
                <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter or create room name (e.g. sprint-9, arch-v2)"
                    className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none"
                />
                <button
                    type="submit"
                    className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-blue-600/30 cursor-pointer"
                >
                    <span>Launch Room</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </form>

            <div className="flex items-center gap-4 text-xs text-zinc-400">
                <button
                    onClick={handleRandomRoom}
                    type="button"
                    className="hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
                >
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Generate Instant Random Room</span>
                </button>
                <span className="text-zinc-700">•</span>
                <Link href="/canvas/1" className="hover:text-zinc-200 transition-colors">
                    Join Main Room (1)
                </Link>
            </div>
        </div>
    );
}
