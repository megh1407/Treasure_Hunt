import { create } from "zustand";
import { GAME_CONFIG } from "@/game/config";
import { getLevel } from "@/game/data/levels";
import type {
  BuildingId,
  Challenge,
  Clue,
  InventoryItemId,
  Player,
  PlayerStatus,
  SceneId,
} from "@/game/types";
import { getSceneConfig, getSceneForLevel } from "@/game/scenes/registry";
import { api } from "@/services/gameApi";
import { realtime } from "@/services/realtime";
import type { InteractionResult, PlayerRecoveryData, RegisterPayload } from "@/services/types";

// SceneId is defined in game/types.ts — re-exported here for backward compatibility.
export type { SceneId } from "@/game/types";

export type CameraMode = "third" | "first";
export type PanelId =
  | "inventory"
  | "hint"
  | "scanner"
  | "pause"
  | "challenge"
  | "clue"
  | "level_complete"
  | "victory"
  | "scoreboard"
  | "map"
  | "exit_confirm"
  | null;

export const STORAGE_KEY_PLAYER_ID = "core_quest_player_id";
export const STORAGE_KEY_ACTIVE_SCENE = "core_quest_active_scene";

interface GameState {
  player: Player | null;
  activeSessionId: string | null;
  isReady: boolean;
  isInitializing: boolean;
  initializationError: string | null;
  isHydrating: boolean;
  hasHydrated: boolean;
  status: PlayerStatus;
  scene: SceneId;
  cameraMode: CameraMode;
  currentLevel: number;
  building: BuildingId;
  room: string | null;
  startedAt: number | null;
  isPaused: boolean;
  pausedAt: number | null;
  totalPausedSeconds: number;
  isPauseTransitioning: boolean;
  pausedTotalMs: number;
  elapsedSeconds: number;
  penaltySeconds: number;
  inventory: InventoryItemId[];
  discoveredClue: Clue | null;
  pendingClue: Clue | null;
  activeChallenge: Omit<Challenge, "answer"> | null;
  usedHints: number[];
  revealedHints: { order: number; text: string }[];
  investigated: string[];
  attempts: number;
  panel: PanelId;
  toast: string | null;
  lastInteraction: InteractionResult | null;
  scannerBusy: boolean;
  scannerResult: string | null;
  playerPosition: [number, number, number];
  investigatingId: string | null;
  spawnOverride: [number, number, number] | null;
  levelCompleted: boolean;
  missionCompleted: boolean;
  isTransitioningScene: boolean;

  register: (payload: RegisterPayload) => Promise<void>;
  initializeGame: () => Promise<void>;
  startGame: () => Promise<void>;
  tick: () => void;
  setScene: (scene: SceneId) => void;
  setCameraMode: (mode: CameraMode) => void;
  toggleCamera: () => void;
  setPanel: (panel: PanelId) => void;
  setToast: (msg: string | null) => void;
  setPlayerPosition: (pos: [number, number, number]) => void;
  investigate: (objectId: string) => Promise<void>;
  submitAnswer: (answer: string) => Promise<boolean>;
  useHint: (order: number) => Promise<void>;
  runScanner: () => Promise<void>;
  pauseGame: () => Promise<void>;
  resumeGame: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  completeSession: () => Promise<void>;
  hydrateGame: () => Promise<void>;
  setIsTransitioningScene: (isTransitioning: boolean) => void;
  retryInitialization: () => Promise<void>;
  reset: () => void;
}

const initial = {
  player: null,
  activeSessionId: null as string | null,
  isReady: false,
  isInitializing: false,
  initializationError: null as string | null,
  isHydrating: false,
  hasHydrated: false,
  status: "not_started" as PlayerStatus,
  scene: "campus" as SceneId,
  cameraMode: "third" as CameraMode,
  currentLevel: 1,
  building: "main_gate" as BuildingId,
  room: null,
  startedAt: null,
  isPaused: false,
  pausedAt: null,
  totalPausedSeconds: 0,
  isPauseTransitioning: false,
  pausedTotalMs: 0,
  elapsedSeconds: 0,
  penaltySeconds: 0,
  inventory: [] as InventoryItemId[],
  discoveredClue: null,
  pendingClue: null as Clue | null,
  activeChallenge: null,
  usedHints: [] as number[],
  revealedHints: [] as { order: number; text: string }[],
  investigated: [] as string[],
  attempts: 0,
  panel: null as PanelId,
  toast: null,
  lastInteraction: null,
  scannerBusy: false,
  scannerResult: null,
  playerPosition: [0, 0, 42] as [number, number, number],
  investigatingId: null as string | null,
  spawnOverride: null as [number, number, number] | null,
  levelCompleted: false,
  missionCompleted: false,
  isTransitioningScene: false,
};

let initializationPromise: Promise<void> | null = null;

function log(state: GameState, type: Parameters<typeof realtime.emit>[0]["type"], message: string) {
  realtime.emit({
    playerId: state.player?.id ?? "local",
    playerName: state.player?.playerName ?? "Local Player",
    type,
    message,
  });
}

function isSessionSyncError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("no active game session") ||
    (message.includes("session with id") &&
      (message.includes("not found") || message.includes("inactive") || message.includes("does not belong")))
  );
}

export const useGameStore = create<GameState>((set, get) => ({
  ...initial,

  register: async (payload) => {
    const player = await api.registerPlayer(payload);
    try {
      localStorage.setItem(STORAGE_KEY_PLAYER_ID, player.id);
    } catch {}
    set({ player, status: "not_started" });
  },

  initializeGame: async () => {
    // 1. If already initialized and ready with valid session, return immediately
    const state = get();
    if (
      (state.isReady && state.player && state.activeSessionId && state.startedAt && state.status !== "completed") ||
      (state.status === "completed" && state.hasHydrated && state.player)
    ) {
      return;
    }

    // 2. Coordinated singleton promise: if initialization is already in flight, await it
    if (initializationPromise) {
      return initializationPromise;
    }

    initializationPromise = (async () => {
      set({ isInitializing: true, isHydrating: true, initializationError: null });

      try {
        let storedId: string | null = null;
        try {
          storedId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_PLAYER_ID) : null;
        } catch {}

        // Check if player is already set in memory (e.g. from register call)
        const inMemoryPlayer = get().player;
        const targetPlayerId = inMemoryPlayer?.id || storedId;

        let recovered: PlayerRecoveryData | null = null;
        if (targetPlayerId) {
          try {
            recovered = await api.recoverPlayer(targetPlayerId);
          } catch (recoveryErr) {
            console.warn("[GameStore] Recovery lookup failed:", recoveryErr);
          }

          if (!recovered || !recovered.player) {
            // Player does not exist on backend (e.g. database wiped or deleted)
            try {
              if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY_PLAYER_ID);
            } catch {}
          }
        }

        if (recovered && recovered.player) {
          const { player, activeSession, levelProgress } = recovered;
          const isCompleted = player.status === "completed";

          let activeSessionId = !isCompleted && activeSession?.isActive ? activeSession.id : null;
          let sessionStartTime = !isCompleted && activeSession?.isActive ? (activeSession.startTime ?? null) : null;
          let isPaused = Boolean(!isCompleted && activeSession?.isActive && activeSession.isPaused);
          let pausedAt = isPaused ? (activeSession?.pausedAt ?? null) : null;
          let totalPausedSeconds =
            !isCompleted && activeSession?.totalPausedSeconds ? activeSession.totalPausedSeconds : 0;

          // CRITICAL: If player exists BUT has no active session (and not completed), start a valid session now!
          if (!isCompleted && !activeSessionId) {
            try {
              const sessionResult = await api.startSession(player.id);
              activeSessionId = sessionResult.sessionId ?? `session_${Date.now()}`;
              sessionStartTime = sessionResult.startTime ?? Date.now();
              isPaused = false;
              pausedAt = null;
              totalPausedSeconds = 0;
            } catch (startErr) {
              console.error("[GameStore] Failed to auto-start session for existing player:", startErr);
              throw startErr;
            }
          }

          const startedAt = sessionStartTime ?? (player.startTime ?? Date.now());

          let elapsedSeconds = player.gameTimeSeconds;
          if (startedAt && !isCompleted && activeSessionId) {
            if (isPaused) {
              const pauseTime = pausedAt ?? Date.now();
              elapsedSeconds = Math.max(0, Math.floor((pauseTime - startedAt) / 1000) - totalPausedSeconds);
            } else {
              elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000) - totalPausedSeconds);
            }
          }

          const investigated = levelProgress?.investigatedObjects ?? [];
          const inventory = (
            (player.inventory && player.inventory.length > 0)
              ? player.inventory
              : (levelProgress?.collectedItems ?? [])
          ) as InventoryItemId[];
          const usedHints = levelProgress?.usedHints ?? [];
          const attempts = levelProgress?.attempts ?? 0;

          const lvl = getLevel(player.currentLevel);
          let revealedHints: { order: number; text: string }[] = [];
          if (levelProgress?.revealedHints && levelProgress.revealedHints.length > 0) {
            revealedHints = levelProgress.revealedHints;
          } else if (usedHints.length > 0) {
            revealedHints = lvl.challenge.hints
              .filter((h) => usedHints.includes(h.order))
              .map((h) => ({ order: h.order, text: h.text }));
          }

          const isSolving =
            player.status === "solving" ||
            (isPaused && activeSession?.statusBeforePause === "solving");

          let discoveredClue: Clue | null = null;
          let activeChallenge: Omit<Challenge, "answer"> | null = null;
          const targetObjId = lvl.clue.objectId;
          if (!isCompleted && (isSolving || (targetObjId && investigated.includes(targetObjId)))) {
            discoveredClue = lvl.clue;
            const { answer: _answer, ...safeChallenge } = lvl.challenge;
            activeChallenge = safeChallenge;
          } else if (!isCompleted && player.currentLevel > 1) {
            // When player has advanced beyond level 1, the active clue guiding them
            // is the trace unlocked upon clearing the previous level.
            const prevLvl = getLevel(player.currentLevel - 1);
            discoveredClue = {
              ...prevLvl.clue,
              destination: "",
            };
          }

          const activeLevelScene = getSceneForLevel(player.currentLevel);

          if (isCompleted) {
            set({
              player: {
                ...player,
                inventory,
              },
              scene: "campus",
              building: "main_gate",
              room: null,
              currentLevel: 10,
              status: "completed",
              panel: "level_complete",
              levelCompleted: true,
              missionCompleted: true,
              penaltySeconds: player.penaltySeconds,
              activeSessionId: null,
              startedAt,
              isPaused: false,
              pausedAt: null,
              totalPausedSeconds,
              isPauseTransitioning: false,
              elapsedSeconds: player.gameTimeSeconds,
              investigated,
              inventory,
              usedHints,
              revealedHints,
              attempts,
              discoveredClue: null,
              activeChallenge: null,
              isHydrating: false,
              hasHydrated: true,
              isInitializing: false,
              isReady: false,
              initializationError: null,
            });
            return;
          }

          let storedScene: SceneId | null = null;
          try {
            storedScene = typeof window !== "undefined"
              ? (localStorage.getItem(STORAGE_KEY_ACTIVE_SCENE) as SceneId | null)
              : null;
          } catch {}

          // Determine scene safely: do NOT assume interior just because currentLevel > 1.
          // Player enters interior only when they actually investigate objects or are solving.
          const prevLevelScene = player.currentLevel > 1 ? getSceneForLevel(player.currentLevel - 1) : null;
          let scene: SceneId = "campus";
          let isAtPrevCompletedRoom = false;

          if (storedScene === "campus") {
            scene = "campus";
          } else if (storedScene && storedScene === activeLevelScene?.id) {
            scene = storedScene;
          } else if (storedScene && prevLevelScene && storedScene === prevLevelScene.id) {
            // Player completed the previous level, has advanced to currentLevel, but has not exited room yet
            scene = storedScene;
            isAtPrevCompletedRoom = true;
          } else if (isSolving || investigated.length > 0) {
            scene = activeLevelScene ? activeLevelScene.id : "campus";
          } else {
            scene = "campus";
          }

          const sceneCfg = getSceneConfig(scene);
          let spawnOverride: [number, number, number] | null = null;
          if (scene === "campus" && player.currentLevel > 1) {
            // Player is outdoors after advancing: spawn outside the previous completed building
            if (prevLevelScene?.exitSpawnPosition) {
              spawnOverride = prevLevelScene.exitSpawnPosition;
            }
          }

          set({
            player: {
              ...player,
              inventory,
            },
            scene,
            building: sceneCfg.buildingId,
            room: sceneCfg.room,
            spawnOverride,
            currentLevel: player.currentLevel,
            status: isPaused ? "paused" : isSolving ? "solving" : "searching",
            panel: isPaused ? "pause" : isAtPrevCompletedRoom ? "level_complete" : null,
            levelCompleted: isAtPrevCompletedRoom,
            penaltySeconds: player.penaltySeconds,
            activeSessionId,
            startedAt,
            isPaused,
            pausedAt,
            totalPausedSeconds,
            isPauseTransitioning: false,
            elapsedSeconds,
            investigated,
            inventory,
            usedHints,
            revealedHints,
            attempts,
            discoveredClue,
            activeChallenge,
            isHydrating: false,
            hasHydrated: true,
            isInitializing: false,
            isReady: Boolean(activeSessionId && startedAt),
            initializationError: null,
          });
          return;
        }

        // FRESH PLAYER CREATION & SESSION START:
        let player = inMemoryPlayer;
        if (!player) {
          let attempts = 0;
          let lastRegError: unknown = null;
          while (!player && attempts < 3) {
            attempts++;
            const randSuffix = Math.floor(1000 + Math.random() * 9000);
            const uniqueGuestEnrollment = `GST${Date.now().toString().slice(-4)}${randSuffix}`.slice(0, 11);
            try {
              player = await api.registerPlayer({
                playerName: "Guest Operative",
                enrollmentNumber: uniqueGuestEnrollment,
                email: `guest_${randSuffix}@example.com`,
                contactNumber: `900000${randSuffix}`,
                branch: "CO",
                team: "CO",
              });
            } catch (regErr) {
              lastRegError = regErr;
              if (attempts >= 3) throw lastRegError || new Error("Registration failed after 3 attempts");
            }
          }
        }
        if (!player) {
          throw new Error("Failed to initialize player registration");
        }
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY_PLAYER_ID, player.id);
            localStorage.setItem(STORAGE_KEY_ACTIVE_SCENE, "campus");
          }
        } catch {}

        const sessionResult = await api.startSession(player.id);
        const startTime = sessionResult?.startTime ?? Date.now();
        const sessionId = sessionResult?.sessionId ?? `session_${Date.now()}`;

        set({
          player,
          activeSessionId: sessionId,
          startedAt: startTime,
          isPaused: false,
          pausedAt: null,
          totalPausedSeconds: 0,
          isPauseTransitioning: false,
          status: "searching",
          scene: "campus",
          elapsedSeconds: 0,
          isHydrating: false,
          hasHydrated: true,
          isInitializing: false,
          isReady: true,
          initializationError: null,
        });
        log(get(), "player_started", "started the hunt at the Main Gate");
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Game initialization failed";
        console.error("[GameStore] Initialization error:", err);
        set({
          isHydrating: false,
          hasHydrated: true,
          isInitializing: false,
          isReady: false,
          initializationError: errorMsg,
        });
      } finally {
        initializationPromise = null;
      }
    })();

    return initializationPromise;
  },

  hydrateGame: async () => {
    return get().initializeGame();
  },

  startGame: async () => {
    return get().initializeGame();
  },

  tick: () => {
    const { startedAt, status, isPaused, pausedAt, totalPausedSeconds } = get();
    if (!startedAt || status === "completed" || isPaused || pausedAt) return;
    const currentElapsed = Math.max(
      0,
      Math.floor((Date.now() - startedAt) / 1000) - totalPausedSeconds
    );
    set({ elapsedSeconds: currentElapsed });
  },

  setScene: (scene) => {
    const prevScene = get().scene;
    if (prevScene === scene) {
      set({ isTransitioningScene: false });
      return;
    }
    const prevCfg = getSceneConfig(prevScene);
    const cfg = getSceneConfig(scene);
    let spawnOverride: [number, number, number] | null = null;
    if (scene === "campus" && prevCfg?.isInterior && prevCfg.exitSpawnPosition) {
      spawnOverride = prevCfg.exitSpawnPosition;
    }
    set({
      scene,
      building: cfg.buildingId,
      room: cfg.room,
      spawnOverride,
      isTransitioningScene: false,
    });
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_ACTIVE_SCENE, scene);
      }
    } catch {}
    if (cfg.enterLogMessage) log(get(), "room_entered", cfg.enterLogMessage);
  },

  setIsTransitioningScene: (isTransitioningScene) => set({ isTransitioningScene }),

  setCameraMode: (cameraMode) => set({ cameraMode }),
  toggleCamera: () => set({ cameraMode: get().cameraMode === "third" ? "first" : "third" }),
  setPanel: (panel) => set({ panel }),
  setToast: (toast) => set({ toast }),
  setPlayerPosition: (playerPosition) => set({ playerPosition }),

  investigate: async (objectId) => {
    const state = get();
    // Authoritative session and readiness guards
    if (!state.isReady || !state.activeSessionId || state.panel || state.investigatingId) return;
    // Immediate feedback acknowledgment before awaiting network/API
    set({
      investigatingId: objectId,
      toast: `Analyzing ${objectId.replace(/_/g, " ")}...`,
    });
    try {
      const playerId = state.player?.id ?? "local";
      let result: InteractionResult;
      try {
        result = await api.investigateObject(playerId, objectId);
      } catch (err) {
        if (!state.player || !isSessionSyncError(err)) throw err;
        const session = await api.startSession(state.player.id);
        set({ activeSessionId: session.sessionId, startedAt: session.startTime, isReady: true });
        result = await api.investigateObject(playerId, objectId);
      }

      // CROSS-LEVEL OBJECT: Show immersive message ONLY. Zero state mutation.
      if (result.outcome === "cross_level") {
        set({ toast: result.message });
        return;
      }

      const currentInvestigated = get().investigated;
      const investigated = currentInvestigated.includes(objectId)
        ? currentInvestigated
        : [...currentInvestigated, objectId];

      if (result.outcome === "clue") {
        set({
          investigated,
          lastInteraction: result,
          discoveredClue: null, // Next clue MUST NOT appear before solving question
          pendingClue: result.clue ? { ...result.clue, destination: "" } : null,
          activeChallenge: result.challenge ?? null,
          panel: "challenge", // QUESTION APPEARS IMMEDIATELY
          status: "solving",
          inventory:
            result.grantedItem && !get().inventory.includes(result.grantedItem)
              ? [...get().inventory, result.grantedItem]
              : get().inventory,
        });
        log(get(), "challenge_opened", `investigated ${objectId} — puzzle question unlocked`);
        if (result.grantedItem) log(get(), "item_collected", `collected ${result.grantedItem}`);
        return;
      }

      set({ investigated, lastInteraction: result, toast: result.message });
      log(get(), "object_investigated", `investigated ${objectId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to investigate object";
      set({ toast: msg });
    } finally {
      set({ investigatingId: null });
    }
  },

  submitAnswer: async (answer) => {
    const state = get();
    if (!state.isReady || !state.activeSessionId) return false;
    const challenge = state.activeChallenge;
    if (!challenge) return false;

    try {
      const res = await api.submitAnswer(state.player?.id ?? "local", challenge.id, answer);
      if (!res.correct) {
        set({
          penaltySeconds: state.penaltySeconds + res.penaltySeconds,
          attempts: state.attempts + 1,
          toast: `${res.message} +${res.penaltySeconds}s penalty`,
        });
        log(get(), "wrong_answer", `wrong answer on ${challenge.id} (+${res.penaltySeconds}s)`);
        return false;
      }

      const nextLevel = res.nextLevel;
      const mission = nextLevel === null;
      if (mission && state.player?.id) {
        void api.completeSession(state.player.id, state.activeSessionId ?? undefined);
      }
      const isAdvancing = nextLevel !== null && nextLevel !== state.currentLevel;
      const newlyRevealedClue =
        res.nextClue
          ? { ...res.nextClue, destination: "" }
          : state.pendingClue
          ? { ...state.pendingClue, destination: "" }
          : state.discoveredClue
          ? { ...state.discoveredClue, destination: "" }
          : { ...getLevel(state.currentLevel).clue, destination: "" };

      // Preserve player in their current scene/location so they can exit naturally to campus
      set({
        attempts: isAdvancing ? 0 : state.attempts + 1,
        levelCompleted: true,
        missionCompleted: mission,
        panel: mission ? "victory" : "level_complete",
        status: mission ? "completed" : "searching",
        isReady: !mission,
        activeSessionId: mission ? null : state.activeSessionId,
        currentLevel: nextLevel ?? state.currentLevel,
        player: state.player
          ? {
              ...state.player,
              currentLevel: nextLevel ?? state.player.currentLevel,
              currentBuilding: state.building,
              currentRoom: state.room,
              gameTimeSeconds: state.elapsedSeconds,
              penaltySeconds: state.penaltySeconds,
              finalTimeSeconds: state.elapsedSeconds + state.penaltySeconds,
            }
          : null,
        scene: state.scene,
        building: state.building,
        room: state.room,
        activeChallenge: null,
        pendingClue: null,
        discoveredClue: newlyRevealedClue, // NEXT CLUE IS NOW REVEALED AFTER CORRECT ANSWER!
        investigated: isAdvancing ? [] : state.investigated,
        usedHints: isAdvancing ? [] : state.usedHints,
        revealedHints: isAdvancing ? [] : state.revealedHints,
      });
      log(get(), "level_completed", `completed Level ${state.currentLevel}`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to validate answer";
      set({ toast: msg });
      return false;
    }
  },

  useHint: async (order) => {
    const state = get();
    if (!state.isReady || !state.activeSessionId) return;
    const challenge = state.activeChallenge ?? getLevel(state.currentLevel).challenge;
    if (state.usedHints.includes(order)) return;

    try {
      const res = await api.requestHint(state.player?.id ?? "local", challenge.id, order);
      set({
        usedHints: [...state.usedHints, order],
        revealedHints: [...state.revealedHints, { order, text: res.text }],
        penaltySeconds: state.penaltySeconds + res.penaltySeconds,
      });
      log(get(), "hint_used", `used Hint ${order} (+${res.penaltySeconds}s)`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unlock hint";
      set({ toast: msg });
    }
  },

  runScanner: async () => {
    const state = get();
    if (!state.isReady || !state.activeSessionId || state.scannerBusy || !state.startedAt) return;
    set({ scannerBusy: true, scannerResult: null, panel: "scanner" });

    try {
      const res = await api.runScanner(
        state.player?.id ?? "local",
        state.playerPosition,
        state.currentLevel,
      );
      set({
        scannerResult: res.message,
        penaltySeconds: get().penaltySeconds + res.penaltySeconds,
      });
      log(get(), "scanner_used", `used the AR scanner (+${res.penaltySeconds}s)`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Scanner failed to connect to satellite network";
      set({ scannerResult: msg });
    } finally {
      set({ scannerBusy: false });
    }
  },

  pauseGame: async () => {
    const { player, activeSessionId, isPaused, isPauseTransitioning, isReady } = get();
    if (!isReady || isPaused || isPauseTransitioning || !player || !activeSessionId) return;

    set({ isPauseTransitioning: true });
    try {
      let result: Awaited<ReturnType<typeof api.pauseSession>>;
      try {
        result = await api.pauseSession(player.id, activeSessionId);
      } catch (err) {
        if (!isSessionSyncError(err)) throw err;
        const session = await api.startSession(player.id);
        set({ activeSessionId: session.sessionId, startedAt: session.startTime, isReady: true });
        result = await api.pauseSession(player.id, session.sessionId);
      }
      const { startedAt } = get();
      const pausedAt = result.pausedAt ?? Date.now();
      const totalPausedSeconds = result.totalPausedSeconds;
      const elapsedSeconds = startedAt
        ? Math.max(0, Math.floor((pausedAt - startedAt) / 1000) - totalPausedSeconds)
        : get().elapsedSeconds;

      set({
        isPaused: true,
        pausedAt,
        totalPausedSeconds,
        status: result.status,
        panel: "pause",
        elapsedSeconds,
      });
      log(get(), "session_paused", "paused the session");
    } catch (err) {
      console.error("Failed to pause session:", err);
    } finally {
      set({ isPauseTransitioning: false });
    }
  },

  resumeGame: async () => {
    const { player, activeSessionId, isPaused, isPauseTransitioning, isReady } = get();
    if (!isReady || !isPaused || isPauseTransitioning || !player || !activeSessionId) return;

    set({ isPauseTransitioning: true });
    try {
      const result = await api.resumeSession(player.id, activeSessionId);
      const { startedAt } = get();
      const totalPausedSeconds = result.totalPausedSeconds;
      const elapsedSeconds = startedAt
        ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000) - totalPausedSeconds)
        : get().elapsedSeconds;

      set({
        isPaused: false,
        pausedAt: null,
        totalPausedSeconds,
        status: result.status,
        panel: null,
        elapsedSeconds,
      });
      log(get(), "session_resumed", "resumed the session");
    } catch (err) {
      console.error("Failed to resume session:", err);
    } finally {
      set({ isPauseTransitioning: false });
    }
  },

  pause: () => {
    void get().pauseGame();
  },

  resume: () => {
    void get().resumeGame();
  },

  completeSession: async () => {
    const { player, activeSessionId, isReady } = get();
    if (!isReady || !player || !activeSessionId) return;
    try {
      const updated = await api.completeSession(player.id, activeSessionId);
      set({
        player: updated,
        status: "completed",
        activeSessionId: null,
        isReady: false,
        isPaused: false,
        pausedAt: null,
        totalPausedSeconds: 0,
        elapsedSeconds: updated.gameTimeSeconds,
        penaltySeconds: updated.penaltySeconds,
      });
      log(get(), "player_completed", "completed the mission");
    } catch (err) {
      console.error("Failed to complete session:", err);
    }
  },

  retryInitialization: async () => {
    initializationPromise = null;
    return get().initializeGame();
  },

  reset: () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY_PLAYER_ID);
        localStorage.removeItem(STORAGE_KEY_ACTIVE_SCENE);
      }
    } catch {}
    initializationPromise = null;
    set({ ...initial, hasHydrated: true, isReady: false });
  },
}));

export const selectFinalTime = (s: GameState) => s.elapsedSeconds + s.penaltySeconds;
export const TOTAL_LEVELS = GAME_CONFIG.totalLevels;
