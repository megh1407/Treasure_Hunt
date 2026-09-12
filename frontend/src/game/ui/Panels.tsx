import { useEffect, useState } from "react";
import { Award, CheckCircle2, KeyRound, Lock, LogOut, Package, ScanLine, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { HoloPanel } from "./HoloPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GAME_CONFIG, INVENTORY_CATALOG, formatTime } from "@/game/config";
import { getLevel } from "@/game/data/levels";
import { useGameStore } from "@/store/gameStore";

export function CluePanel() {
  const clue = useGameStore((s) => s.discoveredClue);
  const setPanel = useGameStore((s) => s.setPanel);
  const interaction = useGameStore((s) => s.lastInteraction);
  if (!clue) return null;

  return (
    <HoloPanel
      title="ENCRYPTED TRACE RECOVERED"
      subtitle={interaction?.message}
      footer={
        <>
          <Button variant="ghost" onClick={() => setPanel(null)}>
            Later
          </Button>
          <Button onClick={() => setPanel("challenge")}>Open Challenge</Button>
        </>
      }
    >
      <blockquote className="rounded-md border border-primary/25 bg-primary/5 p-4 font-display text-base leading-relaxed text-primary">
        “{clue.text}”
      </blockquote>
      <p className="mt-3 text-xs text-muted-foreground">
        Decrypt this trace to confirm the next destination.
      </p>
    </HoloPanel>
  );
}

export function ChallengePanel() {
  const challenge = useGameStore((s) => s.activeChallenge);
  const submitAnswer = useGameStore((s) => s.submitAnswer);
  const setPanel = useGameStore((s) => s.setPanel);
  const attempts = useGameStore((s) => s.attempts);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!challenge) return null;

  const submit = async () => {
    if (!value.trim() || busy) return;
    setBusy(true);
    try {
      const ok = await submitAnswer(value.trim());
      if (!ok) {
        setError(`Incorrect. +${challenge.penaltySeconds}s penalty added. Try again.`);
        setValue("");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <HoloPanel
      title={`CHALLENGE — ${challenge.type.replace("_", " ").toUpperCase()}`}
      subtitle={`Attempts: ${attempts} · Wrong answer penalty: +${challenge.penaltySeconds}s`}
      onClose={() => setPanel(null)}
      footer={
        <>
          <Button variant="ghost" onClick={() => setPanel("hint")}>
            Need a hint?
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Validating…" : "Submit Answer"}
          </Button>
        </>
      }
    >
      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {challenge.question}
      </p>
      <Input
        autoFocus
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Enter your answer"
        className="mt-4 font-display tracking-widest"
      />
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <p className="mt-3 text-[11px] text-muted-foreground">
        Answers are validated by the mission server; the client never scores itself.
      </p>
    </HoloPanel>
  );
}

export function InventoryPanel() {
  const inventory = useGameStore((s) => s.inventory);
  const setPanel = useGameStore((s) => s.setPanel);

  return (
    <HoloPanel
      title="INVENTORY"
      subtitle="Items recovered during the hunt"
      onClose={() => setPanel(null)}
    >
      {inventory.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No items collected yet. Investigate objects to recover equipment.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {inventory.map((id) => {
            const item = INVENTORY_CATALOG[id];
            return (
              <li key={id} className="rounded-md border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center gap-2 font-display text-sm text-primary">
                  <Package className="h-4 w-4" /> {item.name}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {Object.values(INVENTORY_CATALOG)
          .filter((i) => !inventory.includes(i.id))
          .map((i) => (
            <div
              key={i.id}
              className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground"
            >
              <KeyRound className="h-3.5 w-3.5 opacity-50" /> {i.name} — not found
            </div>
          ))}
      </div>
    </HoloPanel>
  );
}

export function HintPanel() {
  const level = useGameStore((s) => s.currentLevel);
  const useHint = useGameStore((s) => s.useHint);
  const usedHints = useGameStore((s) => s.usedHints);
  const revealed = useGameStore((s) => s.revealedHints);
  const setPanel = useGameStore((s) => s.setPanel);
  const activeChallenge = useGameStore((s) => s.activeChallenge);
  const hints = getLevel(level).challenge.hints;

  return (
    <HoloPanel
      title={`TACTICAL HINTS — LEVEL ${level}`}
      subtitle={
        activeChallenge
          ? "Hints for the active puzzle. Each revelation incurs a penalty."
          : "Mission guidance for this level. Revealing clues incurs a time penalty."
      }
      onClose={() => setPanel(null)}
      footer={
        activeChallenge ? (
          <Button onClick={() => setPanel("challenge")}>Return to Challenge</Button>
        ) : (
          <Button variant="secondary" onClick={() => setPanel(null)}>
            Back to Mission
          </Button>
        )
      }
    >
      <div className="mb-3 rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground">
        <span className="font-semibold text-primary">Hint Protocol:</span> Revealing a hint immediately adds its penalty to your mission time. Already unlocked hints remain visible at no further cost.
      </div>
      {hints.length === 0 && (
        <p className="text-sm text-muted-foreground">No hints configured for this level.</p>
      )}
      <div className="space-y-3">
        {hints.map((hint) => {
          const isUsed = usedHints.includes(hint.order);
          const isLocked =
            hint.order === 2
              ? !usedHints.includes(1)
              : hint.order === 3
              ? !usedHints.includes(2)
              : false;

          return (
            <HintItem
              key={hint.order}
              hint={hint}
              used={isUsed}
              locked={isLocked}
              text={revealed.find((revealedHint) => revealedHint.order === hint.order)?.text}
              onUse={useHint}
            />
          );
        })}
      </div>
    </HoloPanel>
  );
}

function HintItem({
  hint,
  used,
  locked,
  text,
  onUse,
}: {
  hint: ReturnType<typeof getLevel>["challenge"]["hints"][number];
  used: boolean;
  locked: boolean;
  text: string | undefined;
  onUse: (order: number) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleReveal = async () => {
    if (locked || used) return;
    setLoading(true);
    try {
      await onUse(hint.order);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-md border p-3 ${
        locked ? "border-border/40 bg-background/20 opacity-75" : "border-border/70 bg-background/40"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {locked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="font-display text-sm text-foreground/90">Hint {hint.order}</span>
        </div>
        <span className="text-xs font-mono font-medium text-destructive">+{hint.penaltySeconds}s penalty</span>
      </div>
      {used ? (
        <p className="mt-2 text-sm text-primary/90 bg-primary/10 rounded p-2.5 border border-primary/20">{text}</p>
      ) : locked ? (
        <div className="mt-2 flex items-center justify-between rounded bg-muted/20 px-2.5 py-1.5 text-xs text-muted-foreground border border-border/30">
          <span className="font-mono text-[11px] uppercase tracking-wider">
            LOCKED — USE HINT {hint.order - 1} FIRST
          </span>
          <Lock className="h-3 w-3" />
        </div>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          className="mt-2 text-xs"
          disabled={loading}
          onClick={handleReveal}
        >
          {loading ? "Unlocking…" : `Reveal Hint (+${hint.penaltySeconds}s)`}
        </Button>
      )}
    </div>
  );
}

export function ExitConfirmModal() {
  const setPanel = useGameStore((s) => s.setPanel);
  const navigate = useNavigate();

  const handleExit = () => {
    setPanel(null);
    void navigate({ to: "/" });
  };

  return (
    <HoloPanel
      title="EXIT TO MAIN MENU"
      subtitle="Your mission progress is saved securely on the server"
      onClose={() => setPanel(null)}
      footer={
        <>
          <Button variant="ghost" onClick={() => setPanel(null)}>
            Stay in Game [ESC]
          </Button>
          <Button variant="destructive" onClick={handleExit}>
            <LogOut className="mr-1.5 h-4 w-4" /> Exit Mission
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-foreground/90">
          Are you sure you want to exit to the main dashboard?
        </p>
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-primary">Progress is Preserved:</p>
          <p>
            Your current level, collected inventory items, solved clues, and elapsed timer
            are saved authoritatively in the database. You can resume at any time.
          </p>
        </div>
      </div>
    </HoloPanel>
  );
}

export function ScannerPanel() {
  const busy = useGameStore((s) => s.scannerBusy);
  const result = useGameStore((s) => s.scannerResult);
  const setPanel = useGameStore((s) => s.setPanel);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="scanline h-24 w-full bg-gradient-to-b from-transparent via-primary/25 to-transparent" />
      </div>
      <div className="holo-panel relative w-full max-w-md rounded-xl p-6 text-center">
        <ScanLine className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-3 font-display text-base text-primary text-glow">AR SCANNER</h2>
        {busy ? (
          <p className="mt-3 text-sm text-muted-foreground">Sweeping local spectrum…</p>
        ) : (
          <p className="mt-3 text-sm text-foreground/90">{result}</p>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Scanner usage penalty: +{GAME_CONFIG.penalties.scannerUse}s
        </p>
        <Button className="mt-5" disabled={busy} onClick={() => setPanel(null)}>
          Close
        </Button>
      </div>
    </div>
  );
}

export function PausePanel() {
  const resume = useGameStore((s) => s.resume);
  const elapsed = useGameStore((s) => s.elapsedSeconds);
  const penalty = useGameStore((s) => s.penaltySeconds);

  return (
    <HoloPanel
      title="MISSION PAUSED"
      subtitle="The clock is stopped"
      onClose={resume}
      footer={<Button onClick={resume}>Resume Mission</Button>}
    >
      <dl className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Game time" value={formatTime(elapsed)} />
        <Stat label="Penalty" value={`+${penalty}s`} />
        <Stat label="Final time" value={formatTime(elapsed + penalty)} />
      </dl>
      <div className="mt-5 space-y-1 text-xs text-muted-foreground">
        <p>WASD / Arrows — move · Mouse — look · E — investigate</p>
        <p>V — camera toggle · ESC — pause</p>
      </div>
    </HoloPanel>
  );
}

export function LevelCompletePanel() {
  const elapsed = useGameStore((s) => s.elapsedSeconds);
  const penalty = useGameStore((s) => s.penaltySeconds);
  const level = useGameStore((s) => s.currentLevel);
  const setPanel = useGameStore((s) => s.setPanel);
  const clue = useGameStore((s) => s.discoveredClue);

  const clearedLevel = Math.max(1, level - 1);

  return (
    <HoloPanel
      title={`LEVEL ${clearedLevel} COMPLETE — NEXT CLUE REVEALED`}
      subtitle="Puzzle decrypted! Next clue trace unlocked."
      onClose={() => setPanel(null)}
      footer={
        <Button
          onClick={() => setPanel(null)}
          className="w-full bg-primary font-display tracking-widest text-primary-foreground hover:bg-primary/90"
        >
          CONTINUE MISSION SEARCH [ESC]
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Next Clue Card */}
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <Sparkles className="h-4 w-4" /> DECRYPTED NEXT CLUE
          </div>
          <blockquote className="mt-2.5 rounded border-l-2 border-primary pl-3 font-display text-base leading-relaxed text-foreground text-glow">
            “{clue?.text || "Where machines learn to move, the second trace waits beneath the tools."}”
          </blockquote>
        </div>

        {/* Timing Stats */}
        <dl className="grid grid-cols-3 gap-2.5 text-center">
          <Stat label="Game time" value={formatTime(elapsed)} />
          <Stat label="Penalty" value={`+${penalty}s`} />
          <Stat label="Final time" value={formatTime(elapsed + penalty)} />
        </dl>

        <p className="text-xs text-muted-foreground leading-relaxed text-center">
          Exit this interior and search the campus grounds to follow the clue.
        </p>
      </div>
    </HoloPanel>
  );
}

/**
 * Special Unique Victory Experience for Level 10 (Innovation Vault).
 * Mandatory Techfest celebration UI with manual "NEXT" button (no auto-redirect).
 */
export function VictoryModal() {
  const setPanel = useGameStore((s) => s.setPanel);
  const player = useGameStore((s) => s.player);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="holo-panel relative w-full max-w-xl overflow-hidden rounded-2xl border-2 border-cyan-400/80 p-7 shadow-[0_0_50px_rgba(6,182,212,0.4)] text-center">
        {/* Pulsing energy backdrop */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl animate-pulse" />

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.6)]">
          <Award className="h-8 w-8 animate-bounce" />
        </div>

        <p className="mt-4 font-display text-xs uppercase tracking-[0.4em] text-cyan-400">
          TECHFEST 2026 · FINAL QUEST ACCOMPLISHED
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-foreground text-glow sm:text-4xl">
          CORE-X PROTOTYPE RECOVERED!
        </h1>

        <div className="my-5 rounded-xl border border-cyan-500/30 bg-cyan-950/40 p-4 text-left space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
            <CheckCircle2 className="h-4 w-4" /> ALL 10 ENCRYPTED TRACES RESOLVED
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed">
            Operative <span className="font-bold text-cyan-300">{player?.playerName || "Agent"}</span>,
            you have breached the Innovation Vault, decrypted the ultimate cryptographic sequence,
            and restored the lost AR/VR CORE-X hardware. The university campus is secured!
          </p>
        </div>

        <Button
          size="lg"
          onClick={() => setPanel("scoreboard")}
          className="mt-2 w-full bg-cyan-500 hover:bg-cyan-400 text-black font-display font-bold tracking-widest text-sm shadow-[0_0_20px_rgba(6,182,212,0.5)]"
        >
          NEXT — VIEW FINAL SCOREBOARD <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Dedicated Final Scoreboard for Level 10 Completion.
 * Displays Name, Branch, 10/10, Completion Time, Penalty, Final Time.
 * STRICTLY NO FINAL RANK IS DISPLAYED.
 */
export function FinalScoreboardModal() {
  const navigate = useNavigate();
  const setPanel = useGameStore((s) => s.setPanel);
  const player = useGameStore((s) => s.player);
  const elapsed = useGameStore((s) => s.elapsedSeconds);
  const penalty = useGameStore((s) => s.penaltySeconds);

  const handleReturnHome = () => {
    setPanel(null);
    void navigate({ to: "/" });
  };

  const playerName = player?.playerName || "Operative";
  const branch = player?.branch || player?.team || "Engineering";
  const finalTimeSeconds = elapsed + penalty;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="holo-panel relative w-full max-w-lg overflow-hidden rounded-2xl border border-primary/40 p-7 shadow-2xl">
        <div className="text-center">
          <p className="font-display text-[10px] tracking-[0.4em] text-primary">OFFICIAL TELEMETRY</p>
          <h2 className="mt-1 text-2xl font-bold text-foreground text-glow">
            FINAL MISSION SCOREBOARD
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Authoritative performance report verified by the mission control server
          </p>
        </div>

        <div className="mt-6 divide-y divide-border/60 rounded-xl border border-border/70 bg-background/50 text-sm">
          <div className="flex items-center justify-between p-3.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Player Name</span>
            <span className="font-display font-bold text-foreground text-base">{playerName}</span>
          </div>

          <div className="flex items-center justify-between p-3.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Department Branch</span>
            <span className="font-mono font-semibold text-primary">{branch}</span>
          </div>

          <div className="flex items-center justify-between p-3.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Levels Completed</span>
            <span className="font-mono font-bold text-emerald-400">10 / 10 COMPLETED</span>
          </div>

          <div className="flex items-center justify-between p-3.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Completion Time</span>
            <span className="font-mono">{formatTime(elapsed)}</span>
          </div>

          <div className="flex items-center justify-between p-3.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Penalty Time</span>
            <span className="font-mono text-destructive">+{penalty}s</span>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-primary/10">
            <span className="text-xs uppercase tracking-widest font-bold text-primary">Final / Net Time</span>
            <span className="font-display text-lg font-bold text-primary">
              {formatTime(finalTimeSeconds)}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-2.5 text-center text-[11px] text-muted-foreground">
          <ShieldCheck className="inline-block mr-1 h-3.5 w-3.5 text-primary" />
          Mission finalized and archived authoritatively.
        </div>

        <Button
          onClick={handleReturnHome}
          className="mt-6 w-full font-display tracking-widest"
        >
          NEXT — RETURN TO BASE BASE
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-3">
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-sm text-foreground">{value}</dd>
    </div>
  );
}

/** Transient decoy/penalty toast. */
export function GameToast() {
  const toast = useGameStore((s) => s.toast);
  const setToast = useGameStore((s) => s.setToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast, setToast]);

  if (!toast) return null;
  return (
    <div className="pointer-events-none absolute bottom-40 left-1/2 z-30 w-[min(92vw,28rem)] -translate-x-1/2">
      <div className="holo-panel rounded-lg px-4 py-3 text-center text-sm text-foreground/90">
        {toast}
      </div>
    </div>
  );
}
