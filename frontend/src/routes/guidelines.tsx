import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { EVENT, GAME_CONFIG } from "@/game/config";
import { useGameStore } from "@/store/gameStore";

const title = "Mission Brief & Rules — Core Quest Finder";
const description =
  "Controls, scoring, penalties and mission rules for the Core Quest Finder virtual 3D treasure hunt.";

export const Route = createFileRoute("/guidelines")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: GuidelinesPage,
});

const CONTROLS = [
  ["W A S D / Arrows", "Move around the campus"],
  ["Mouse drag", "Look around"],
  ["E", "Investigate the highlighted object"],
  ["V", "Toggle first / third person view"],
  ["ESC", "Pause the mission"],
];

const RULES = [
  `${GAME_CONFIG.totalLevels} levels, each hiding one encrypted trace inside a campus location.`,
  "Investigate objects to find the trace. Most objects are decoys — they cost nothing but time.",
  `A wrong challenge answer adds +${GAME_CONFIG.penalties.wrongAnswer}s to your final time.`,
  `Hints cost +${GAME_CONFIG.penalties.hint.join("s / +")}s depending on how deep you go.`,
  `Each AR scanner sweep costs +${GAME_CONFIG.penalties.scannerUse}s.`,
  "Final score = game time + total penalties. Lowest final time wins.",
  "Single player: your session is independent of everyone else's.",
];

function GuidelinesPage() {
  const navigate = useNavigate();
  const startGame = useGameStore((s) => s.startGame);
  const player = useGameStore((s) => s.player);

  const begin = async () => {
    await startGame();
    void navigate({ to: "/play" });
  };

  return (
    <main className="holo-grid min-h-dvh bg-background px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <p className="font-display text-[10px] tracking-[0.4em] text-primary">
          {EVENT.name} — MISSION BRIEF
        </p>
        <h1 className="mt-3 text-3xl text-foreground text-glow sm:text-4xl">{EVENT.storyTitle}</h1>
        <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground">
          {EVENT.storyBody.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <section className="holo-panel mt-8 rounded-xl p-6">
          <h2 className="font-display text-sm tracking-widest text-primary">CONTROLS</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {CONTROLS.map(([key, desc]) => (
              <div key={key} className="flex items-start gap-3">
                <dt className="rounded border border-primary/30 bg-primary/10 px-2 py-1 font-display text-[11px] text-primary">
                  {key}
                </dt>
                <dd className="pt-1 text-xs text-muted-foreground">{desc}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="holo-panel mt-5 rounded-xl p-6">
          <h2 className="font-display text-sm tracking-widest text-primary">RULES & SCORING</h2>
          <ul className="mt-4 space-y-2">
            {RULES.map((r) => (
              <li key={r} className="flex gap-3 text-sm text-foreground/85">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {r}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button onClick={begin} className="px-8">
            {player ? "Begin the hunt" : "Begin as guest operative"}
          </Button>
          <Link
            to="/register"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Register a different player
          </Link>
        </div>
      </div>
    </main>
  );
}
