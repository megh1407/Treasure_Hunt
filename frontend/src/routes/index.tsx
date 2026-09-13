import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Cpu, Radar, ScanLine, Timer } from "lucide-react";
import { DevelopedBy } from "@/components/DevelopedBy";

const title = "Updates 2K26 | The Lost AR-VR Core";
const description =
  "A virtual AR/VR treasure hunt where engineering students explore, investigate, and solve hidden challenges across a virtual campus.";

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
          <span className="font-display text-sm tracking-[0.4em] text-primary">UPDATES 2K26</span>
          <nav className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/guidelines" className="hover:text-primary transition-colors">
              Guidelines
            </Link>
            <Link to="/leaderboard" className="hover:text-primary transition-colors">
              Leaderboard
            </Link>
          </nav>
        </header>

        <section className="flex flex-1 flex-col justify-center py-16">
          <p className="font-display text-xs tracking-[0.4em] text-primary/80">
            UPDATES 2K26 · VIRTUAL AR/VR TREASURE HUNT
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-tight text-foreground text-glow sm:text-6xl">
            THE LOST <span className="text-primary">AR-VR CORE</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            A mysterious AR/VR prototype called CORE-X has disappeared from the campus innovation vault. Explore the virtual campus, investigate hidden traces, solve engineering-based challenges, and recover the lost core.
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
              label="QUEST"
              value="Investigate hidden traces"
            />
            <Feature
              icon={Timer}
              label="SCORING"
              value="Time + penalty"
            />
            <Feature
              icon={ScanLine}
              label="TOOLS"
              value="AR scanner & hints"
            />
            <Feature
              icon={Radar}
              label="CAMPUS"
              value="Explore the virtual campus"
            />
          </dl>
        </section>

        <DevelopedBy className="my-6" />

        <footer className="border-t border-border/60 pt-4 text-[11px] text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>Explore. Investigate. Solve. Advance.</span>
          <span className="font-mono text-[10px] opacity-70">Updates 2K26 · Core Quest</span>
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
