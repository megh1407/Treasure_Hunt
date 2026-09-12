import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Cpu, Radar, ScanLine, Timer } from "lucide-react";
import { EVENT, GAME_CONFIG } from "@/game/config";

const title = "Core Quest Finder — Virtual 3D Campus Treasure Hunt";
const description =
  "A browser-based 3D virtual campus treasure hunt. Explore, investigate, solve encrypted traces and recover the lost CORE-X prototype.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="holo-grid relative min-h-dvh overflow-hidden bg-background">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto flex min-h-dvh max-w-5xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <span className="font-display text-sm tracking-[0.4em] text-primary">TECHFEST</span>
          <nav className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/guidelines" className="hover:text-primary">
              Guidelines
            </Link>
            <Link to="/leaderboard" className="hover:text-primary">
              Dashboard
            </Link>
          </nav>
        </header>

        <section className="flex flex-1 flex-col justify-center py-16">
          <p className="font-display text-xs tracking-[0.4em] text-primary/80">
            {EVENT.name} · VIRTUAL AR/VR TREASURE HUNT
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-tight text-foreground text-glow sm:text-6xl">
            THE LOST <span className="text-primary">AR-VR CORE</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {EVENT.storyBody[0]} {EVENT.storyBody[1]}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-display text-sm tracking-widest text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              ENTER THE HUNT
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/guidelines"
              className="inline-flex items-center gap-2 rounded-md border border-primary/30 px-6 py-3 font-display text-sm tracking-widest text-foreground/85 transition-colors hover:border-primary/70 hover:text-primary"
            >
              MISSION BRIEF
            </Link>
          </div>

          <dl className="mt-16 grid gap-4 sm:grid-cols-4">
            <Feature
              icon={Cpu}
              label="Levels"
              value={`${GAME_CONFIG.totalLevels} encrypted traces`}
            />
            <Feature icon={Timer} label="Scoring" value="Time + penalty" />
            <Feature icon={ScanLine} label="Tools" value="AR scanner & hints" />
            <Feature icon={Radar} label="Campus" value="12 explorable zones" />
          </dl>
        </section>

        <footer className="border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
          Prototype build · Level 1 (Library) playable · Levels 2–10 in deployment
        </footer>
      </div>
    </main>
  );
}

function Feature({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) {
  return (
    <div className="holo-panel rounded-lg p-4">
      <Icon className="h-4 w-4 text-primary" />
      <dt className="mt-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground/90">{value}</dd>
    </div>
  );
}
