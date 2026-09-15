import { useCallback, useEffect, useRef, useState } from "react";
import { GameWorld } from "@/game/world/GameWorld";
import type { ProximityTarget } from "@/game/player/ProximityWatcher";
import { Hud } from "./Hud";
import { MapPanel } from "./MapPanel";
import {
  ChallengePanel,
  CluePanel,
  ExitConfirmModal,
  GameToast,
  HintPanel,
  InventoryPanel,
  LevelCompletePanel,
  PausePanel,
  ScannerPanel,
  VictoryModal,
  FinalScoreboardModal,
} from "./Panels";
import { useGameStore } from "@/store/gameStore";

export function GameScreen() {
  const [nearby, setNearby] = useState<ProximityTarget | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const nearbyRef = useRef<ProximityTarget | null>(null);
  const panel = useGameStore((s) => s.panel);
  const setPanel = useGameStore((s) => s.setPanel);
  const tick = useGameStore((s) => s.tick);
  const investigate = useGameStore((s) => s.investigate);
  const setScene = useGameStore((s) => s.setScene);
  const toggleCamera = useGameStore((s) => s.toggleCamera);
  const pause = useGameStore((s) => s.pause);
  const resume = useGameStore((s) => s.resume);

  const handleNearby = useCallback((t: ProximityTarget | null) => {
    nearbyRef.current = t;
    setNearby(t);
  }, []);

  useEffect(() => {
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [tick]);

  useEffect(() => {
    void useGameStore.getState().initializeGame();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 1. ESC handling: close non-pause panels, pause normal gameplay, resume if paused
      if (e.code === "Escape") {
        const store = useGameStore.getState();
        if (!store.isReady || !store.activeSessionId) return;
        const currentPanel = store.panel;
        if (currentPanel === "pause") {
          void resume();
        } else if (currentPanel !== null) {
          setPanel(null);
        } else {
          void pause();
        }
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Camera toggle
      if (e.code === "KeyV") {
        toggleCamera();
        return;
      }

      // Tactical map shortcut
      if (e.code === "KeyM") {
        const currentPanel = useGameStore.getState().panel;
        if (currentPanel === "map") setPanel(null);
        else if (currentPanel === null) setPanel("map");
        return;
      }

      // Hints shortcut
      if (e.code === "KeyH") {
        const store = useGameStore.getState();
        if (!store.isReady || !store.activeSessionId) return;
        const currentPanel = store.panel;
        if (currentPanel === "hint") setPanel(null);
        else if (currentPanel === null) setPanel("hint");
        return;
      }

      // Inventory shortcut
      if (e.code === "KeyI") {
        const currentPanel = useGameStore.getState().panel;
        if (currentPanel === "inventory") setPanel(null);
        else if (currentPanel === null) setPanel("inventory");
        return;
      }

      // Investigate / Navigate shortcut
      if (e.code === "KeyE") {
        const store = useGameStore.getState();
        if (store.panel || store.isTransitioningScene || store.investigatingId) return;
        const target = nearbyRef.current;
        if (!target) return;
        // Data-driven navigation: target.navigatesTo is set by the scene registry.
        if (target.navigatesTo) {
          store.setIsTransitioningScene(true);
          setTransitioning(true);
          setTimeout(() => {
            setScene(target.navigatesTo!);
            setTimeout(() => {
              setTransitioning(false);
              store.setIsTransitioningScene(false);
            }, 80);
          }, 40);
        } else {
          if (!store.isReady || !store.activeSessionId) return;
          const targetId = store.selectedObject?.id ?? target.id;
          void investigate(targetId);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [investigate, pause, resume, setPanel, setScene, toggleCamera]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <GameWorld onNearby={handleNearby} />
      <Hud nearby={nearby} />
      <GameToast />
      {transitioning && (
        <div className="pointer-events-none absolute inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-75" />
      )}
      {panel === "map" && <MapPanel />}
      {panel === "exit_confirm" && <ExitConfirmModal />}
      {panel === "clue" && <CluePanel />}
      {panel === "challenge" && <ChallengePanel />}
      {panel === "inventory" && <InventoryPanel />}
      {panel === "hint" && <HintPanel />}
      {panel === "scanner" && <ScannerPanel />}
      {panel === "pause" && <PausePanel />}
      {panel === "level_complete" && <LevelCompletePanel />}
      {panel === "victory" && <VictoryModal />}
      {panel === "scoreboard" && <FinalScoreboardModal />}
    </div>
  );
}
