import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Compass, HelpCircle, KeyRound, Play, Trophy, Users } from "lucide-react";
import { api } from "@/services/gameApi";
import { Button } from "@/components/ui/button";

const title = "Player Dashboard — Core Quest Finder";
const description = "Operative dashboard: Top 5 players, field guidelines, and mission navigation.";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: PlayerDashboardPage,
});

function PlayerDashboardPage() {
  const { data: top5 = [], isLoading } = useQuery({
    queryKey: ["top5-players"],
    queryFn: () => api.getTop5Players(),
    staleTime: 10_000,
  });

  return (
    <main className="holo-grid min-h-dvh bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header Bar */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-primary/20 pb-6">
          <div>
            <p className="font-display text-[10px] tracking-[0.4em] text-primary">OPERATIVE PORTAL</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground text-glow sm:text-4xl">
              PLAYER DASHBOARD
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Official standings and operative guidelines for Techfest 2026
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="rounded-md border border-border/60 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              ← Back to Base
            </Link>
            <Link
              to="/play"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-display tracking-wider text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Enter Mission
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.4fr]">
          {/* SECTION 1: TOP 5 PLAYERS (Names Only) */}
          <section className="holo-panel flex flex-col rounded-2xl p-6 border border-primary/30 shadow-lg">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-bold tracking-widest text-primary">
                  TOP 5 OPERATIVES
                </h2>
              </div>
              <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                HONOR ROLL
              </span>
            </div>

            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Top 5 operatives currently leading the campus investigation.
            </p>

            <div className="mt-4 flex-1 space-y-2.5">
              {isLoading && (
                <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                  Syncing standings with mission control…
                </div>
              )}

              {!isLoading && top5.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
                  No operatives recorded yet. Be the first to clear the quest!
                </div>
              )}

              {!isLoading &&
                top5.slice(0, 5).map((row, idx) => (
                  <div
                    key={`${row.playerName}-${idx}`}
                    className="flex items-center gap-3 rounded-lg border border-primary/20 bg-background/60 p-3.5 transition-all hover:border-primary/50"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 font-display text-xs font-bold text-primary">
                      {idx + 1}
                    </div>
                    <div className="flex-1 truncate">
                      <p className="truncate font-display text-sm font-bold text-foreground">
                        {row.playerName}
                      </p>
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-5 rounded-lg border border-primary/15 bg-primary/5 p-3 text-[11px] text-muted-foreground text-center">
              Standings verified authoritatively by mission server.
            </div>
          </section>

          {/* SECTION 2: OPERATIVE GUIDELINES */}
          <section className="holo-panel flex flex-col rounded-2xl p-6 border border-primary/30 shadow-lg">
            <div className="flex items-center justify-between border-b border-primary/20 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-bold tracking-widest text-primary">
                  MISSION GUIDELINES
                </h2>
              </div>
              <Link
                to="/guidelines"
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                Full Brief <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-muted-foreground">
              <div className="rounded-lg border border-border/60 bg-background/50 p-3.5">
                <h3 className="font-display font-semibold text-foreground flex items-center gap-2 text-xs">
                  <KeyRound className="h-3.5 w-3.5 text-primary" /> Investigation & Solve Flow
                </h3>
                <p className="mt-1.5 leading-relaxed">
                  Approach highlighted objects and press <strong className="text-foreground font-mono">E</strong> or click to investigate.
                  When you locate the target, the puzzle question appears immediately. Solving the question decrypts and reveals the <strong>Next Clue</strong>.
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-background/50 p-3.5">
                <h3 className="font-display font-semibold text-foreground flex items-center gap-2 text-xs">
                  <Compass className="h-3.5 w-3.5 text-primary" /> Tactical Campus Map
                </h3>
                <p className="mt-1.5 leading-relaxed">
                  Press <strong className="text-foreground font-mono">M</strong> at any time to consult the architectural nav-grid.
                  The map displays building locations, entrances, and your live position. Clues must be solved in the field!
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-background/50 p-3.5">
                <h3 className="font-display font-semibold text-foreground flex items-center gap-2 text-xs">
                  <HelpCircle className="h-3.5 w-3.5 text-primary" /> Tactical Hints & Timing
                </h3>
                <p className="mt-1.5 leading-relaxed">
                  If stuck, tactical hints can be unlocked inside puzzles. Unlocking a hint incurs a time penalty.
                  Final scoring is determined by total game time plus penalties.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
              <span className="text-[11px] text-muted-foreground font-mono">Techfest 2026 Core Quest</span>
              <Link to="/guidelines">
                <Button size="sm" variant="outline" className="border-primary/40 text-xs">
                  View Mission Rules
                </Button>
              </Link>
            </div>
          </section>
        </div>

        {/* SECTION 3: NORMAL PLAYER NAVIGATION CARDS */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            to="/register"
            className="group holo-panel rounded-xl p-4 border border-border/60 transition-all hover:border-primary/60 hover:bg-primary/5 flex items-center justify-between"
          >
            <div>
              <p className="font-display text-sm font-bold text-foreground group-hover:text-primary">
                New Operative Registration
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Register your credentials to start a fresh quest session
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            to="/play"
            className="group holo-panel rounded-xl p-4 border border-primary/40 bg-primary/5 transition-all hover:border-primary hover:bg-primary/10 flex items-center justify-between"
          >
            <div>
              <p className="font-display text-sm font-bold text-primary">
                Resume Active Quest
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Continue searching for the CORE-X prototype across campus
              </p>
            </div>
            <Play className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
          </Link>
        </section>
      </div>
    </main>
  );
}
