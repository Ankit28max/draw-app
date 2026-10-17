"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@repo/ui/button";
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
                <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium text-foreground">{userName || "Signed In"}</span>
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSignOut}
                    className="px-3 py-1.5 text-xs text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <Link href="/signin">
                <Button variant="outline" size="sm" className="px-4 py-2 cursor-pointer">
                    Sign in
                </Button>
            </Link>
            <Link href="/signup">
                <Button variant="primary" size="sm" className="px-4 py-2 cursor-pointer">
                    Sign up
                </Button>
            </Link>
        </div>
    );
}
