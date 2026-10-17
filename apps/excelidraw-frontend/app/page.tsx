import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Pencil, Share2, Users2, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { RoomJoinSection } from "@/components/RoomJoinSection";
import { UserNav } from "@/components/UserNav";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Header Navigation */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-40 bg-background/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <span className="p-1.5 rounded-lg bg-primary text-primary-foreground">
              <Pencil className="w-5 h-5" />
            </span>
            Excalidraw
          </div>
          <UserNav />
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Real-time Collaborative Drawing Tool
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
              Collaborative Whiteboarding{" "}
              <span className="text-primary block sm:inline">Made Simple</span>
            </h1>
            
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              Create, collaborate, and share diagrams and sketches with your team in real time.
              No sign-up required to start drawing immediately.
            </p>

            <RoomJoinSection />

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup">
                <Button variant="outline" size="lg" className="h-11 px-6 text-sm">
                  Create Free Account
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/40 border-y border-border/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl font-bold tracking-tight">Everything you need to sketch ideas</h2>
              <p className="mt-3 text-muted-foreground">High-performance canvas powered by WebSockets for instant synchronization.</p>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              <Card className="p-6 rounded-2xl bg-card border hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <Share2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">Real-time Collaboration</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Work together with your team simultaneously. Every stroke is instantly synced across everyone connected to the room.
                </p>
              </Card>

              <Card className="p-6 rounded-2xl bg-card border hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <Users2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">Instant Multi-room</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Organize ideas into isolated rooms. Share your unique room link with collaborators to jump straight in.
                </p>
              </Card>

              <Card className="p-6 rounded-2xl bg-card border hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <Pencil className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">Essential Drawing Tools</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Pencil, rectangles, circles, and shapes at your fingertips with a distraction-free full-screen canvas.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-primary text-primary-foreground rounded-3xl p-10 sm:p-16 max-w-4xl mx-auto text-center shadow-2xl">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Ready to start creating?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-primary-foreground/90">
                Jump straight into the canvas without any setup, or sign in to save your drawings.
              </p>
              <div className="mt-8 flex justify-center">
                <Link href="/canvas/1">
                  <Button size="lg" variant="secondary" className="h-12 px-8 text-base font-semibold shadow-lg">
                    Open Whiteboard Canvas
                    <Pencil className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 Excalidraw App. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/canvas/1" className="hover:text-foreground transition-colors">
              Canvas
            </Link>
            <Link href="/signin" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}