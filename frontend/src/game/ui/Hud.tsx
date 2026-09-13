import { Compass, Eye, HandHelping, LogOut, Map, Package, Pause, ScanLine, Sparkles, Timer } from "lucide-react";
import { EVENT, GAME_CONFIG, formatTime } from "@/game/config";
import { getLevel } from "@/game/data/levels";
import { getSceneConfig } from "@/game/scenes/registry";
import { useGameStore } from "@/store/gameStore";
import type { ProximityTarget } from "@/game/player/ProximityWatcher";

function HudButton({
  icon: Icon,
  label,
  onClick,
  hint,
}: {
  icon: typeof Package;
  label: string;
  onClick: () => void;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="pointer-events-auto group flex items-center gap-2 rounded-md border border-primary/25 bg-background/70 px-3 py-2 text-xs font-medium tracking-wide text-foreground/85 backdrop-blur transition-colors hover:border-primary/60 hover:text-primary"
    >
      <Icon className="h-4 w-4 text-primary/80 transition-colors group-hover:text-primary" />
      <span className="hidden sm:inline">{label}</span>
      {hint && <span className="hidden text-[10px] text-muted-foreground md:inline">{hint}</span>}
    </button>
  );
}

export function Hud({ nearby }: { nearby: ProximityTarget | null }) {
  const isReady = useGameStore((s) => s.isReady);
  const status = useGameStore((s) => s.status);
  const initializationError = useGameStore((s) => s.initializationError);
  const retryInitialization = useGameStore((s) => s.retryInitialization);
  const elapsed = useGameStore((s) => s.elapsedSeconds);
  const penalty = useGameStore((s) => s.penaltySeconds);
  const level = useGameStore((s) => s.currentLevel);
  const scene = useGameStore((s) => s.scene);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const toggleCamera = useGameStore((s) => s.toggleCamera);
  const setPanel = useGameStore((s) => s.setPanel);
  const runScanner = useGameStore((s) => s.runScanner);
  const pause = useGameStore((s) => s.pause);
  const clue = useGameStore((s) => s.discoveredClue);
  const investigatingId = useGameStore((s) => s.investigatingId);
  const panel = useGameStore((s) => s.panel);

  const objective =
    status === "completed"
      ? "Mission Accomplished — CORE-X prototype secured!"
      : clue
      ? "Follow the unlocked trace to locate the target"
      : getLevel(level).objective;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="holo-panel rounded-lg px-4 py-2">
          <div className="font-display text-xs tracking-[0.35em] text-primary">UPDATES 2K26</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {EVENT.storyTitle}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="holo-panel flex items-center gap-4 rounded-lg px-4 py-2 text-sm">
            <span className="flex items-center gap-2 font-display tabular-nums">
              <Timer className="h-4 w-4 text-primary" />
              {formatTime(elapsed)}
            </span>
            <span className="text-xs text-destructive tabular-nums">+{penalty}s</span>
            <span className="text-xs text-muted-foreground">
              LEVEL {level}/{GAME_CONFIG.totalLevels}
            </span>
          </div>

          <button
            onClick={() => setPanel("exit_confirm")}
            title="Exit to main menu"
            className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-background/80 px-3 py-2 text-xs font-medium text-red-400 backdrop-blur transition-all hover:border-red-500 hover:bg-red-500/15 hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div
          className={`flex flex-col gap-2 max-w-md ${
            panel !== null ? "opacity-0 pointer-events-none" : "transition-opacity duration-200"
          }`}
        >
          <div className="holo-panel rounded-lg px-4 py-2.5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-primary/80">
              <Compass className="h-3.5 w-3.5" /> Objective
            </div>
            <p className="mt-1 text-xs text-foreground/90">{objective}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {getSceneConfig(scene).locationLabel}
            </p>
          </div>

          {clue && (
            <div
              id="hud-persistent-clue"
              className="holo-panel rounded-lg px-4 py-2.5 border border-cyan-400/50 bg-[#06141f]/90 shadow-[0_0_15px_rgba(6,182,212,0.2)] backdrop-blur-sm"
            >
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-[0.25em] text-cyan-400">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> CURRENT CLUE
              </div>
              <p className="mt-1.5 font-display text-xs leading-relaxed text-cyan-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                “{clue.text}”
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <HudButton icon={Map} label="Campus Map" onClick={() => setPanel("map")} hint="M" />
          <HudButton icon={ScanLine} label="AR Scan" onClick={() => isReady && runScanner()} />
          <HudButton icon={Package} label="Inventory" onClick={() => setPanel("inventory")} hint="I" />
          <HudButton icon={HandHelping} label="Hints" onClick={() => isReady && setPanel("hint")} hint="H" />
          <HudButton
            icon={Eye}
            label={cameraMode === "third" ? "First Person" : "Third Person"}
            onClick={toggleCamera}
            hint="V"
          />
          <HudButton icon={Pause} label="Pause" onClick={() => isReady && pause()} hint="ESC" />
        </div>
      </div>

      {(nearby || investigatingId || initializationError || status === "completed") && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2">
          <div className="holo-panel holo-pulse flex items-center gap-2 rounded-full px-4 py-2 text-sm shadow-lg shadow-primary/20">
            {investigatingId ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                <span className="font-display text-amber-300">
                  Analyzing {nearby?.label ?? investigatingId.replace(/_/g, " ")}…
                </span>
              </>
            ) : status === "completed" ? (
              <button
                onClick={() => setPanel("level_complete")}
                className="pointer-events-auto flex items-center gap-1.5 font-display text-emerald-400 hover:text-emerald-300"
              >
                Mission Accomplished · View Results
              </button>
            ) : initializationError ? (
              <button
                onClick={() => void retryInitialization()}
                className="pointer-events-auto flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80"
              >
                <span>Connection failed</span>
                <span className="rounded border border-destructive/50 bg-destructive/20 px-2 py-0.5 font-display text-[10px]">
                  Retry
                </span>
              </button>
            ) : !isReady ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="font-display text-muted-foreground">
                  Initializing session…
                </span>
              </>
            ) : nearby ? (
              <>
                <span className="font-display text-primary">[E]</span>{" "}
                <span className="text-foreground/90">
                  {nearby.action ?? "Investigate"} — {nearby.label}
                </span>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
