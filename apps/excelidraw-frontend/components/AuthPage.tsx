"use client";

import { useState } from "react";
import { HTTP_BACKEND } from "@/config";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AuthPage({ isSignin }: { isSignin: boolean }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (isSignin) {
                const res = await axios.post(`${HTTP_BACKEND}/signin`, {
                    username: username.trim(),
                    password
                });
                if (res.data?.token) {
                    localStorage.setItem("token", res.data.token);
                    if (res.data.name) localStorage.setItem("userName", res.data.name);
                    router.push("/");
                } else {
                    setError(res.data?.message || "Sign in failed");
                }
            } else {
                const res = await axios.post(`${HTTP_BACKEND}/signup`, {
                    username: username.trim(),
                    password,
                    name: name.trim() || username.trim()
                });
                if (res.data?.token) {
                    localStorage.setItem("token", res.data.token);
                    if (res.data.name) localStorage.setItem("userName", res.data.name);
                    router.push("/");
                } else if (res.data?.userId) {
                    router.push("/signin");
                } else {
                    setError(res.data?.message || "Sign up failed");
                }
            }
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || "Authentication failed. Please check inputs.");
            } else {
                setError("Something went wrong. Please check your credentials.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-screen h-screen flex justify-center items-center bg-zinc-950 text-white font-sans">
            <div className="w-full max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        {isSignin ? "Welcome Back" : "Create an Account"}
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        {isSignin ? "Sign in to access your saved whiteboards" : "Sign up to start collaborating with your team"}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isSignin && (
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Full Name</label>
                            <input
                                type="text"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-800/80 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">Username (Email)</label>
                        <input
                            type="text"
                            required
                            placeholder="user@example.com"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-800/80 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-800/80 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? "Please wait..." : (isSignin ? "Sign In" : "Sign Up")}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-zinc-400">
                    {isSignin ? (
                        <p>
                            Don&apos;t have an account?{" "}
                            <Link href="/signup" className="text-primary hover:underline">
                                Sign up
                            </Link>
                        </p>
                    ) : (
                        <p>
                            Already have an account?{" "}
                            <Link href="/signin" className="text-primary hover:underline">
                                Sign in
                            </Link>
                        </p>
                    )}
                    <p className="mt-3">
                        <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-xs">
                            ← Back to Home
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}