"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, User } from "lucide-react";

export function UserNav() {
    const [token, setToken] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setToken(localStorage.getItem("token"));
            setUserName(localStorage.getItem("userName"));
        }
    }, []);

    const handleSignOut = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("userName");
            setToken(null);
            setUserName(null);
        }
    };

    if (token) {
        return (
            <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-300 hidden sm:flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-medium text-white">{userName || "Signed In"}</span>
                </span>
                <button
                    onClick={handleSignOut}
                    className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2.5">
            <Link
                href="/signin"
                className="px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
            >
                Sign in
            </Link>
            <Link
                href="/signup"
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
                Get Started
            </Link>
        </div>
    );
}
