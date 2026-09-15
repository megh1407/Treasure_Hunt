import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import * as THREE from "three";
import { CampusScene } from "./CampusScene";
import { LibraryRoom } from "../rooms/library";
import { RoboticsLabRoom } from "../rooms/robotics";
import { ComputerLabRoom } from "../rooms/computer";
import { AuditoriumRoom } from "../rooms/auditorium";
import { CafeteriaRoom } from "../rooms/cafeteria";
import { MainBuildingRoom } from "../rooms/main_building";
import { ElectronicsLabRoom } from "../rooms/electronics";
import { GardenPavilionRoom } from "../rooms/garden";
import { ServerRoom } from "../rooms/server";
import { SecretRoom } from "../rooms/secret";
import { Player, type Blocker } from "../player/Player";
import { ProximityWatcher, type ProximityTarget } from "../player/ProximityWatcher";
import { CAMPUS, doorPosition } from "../data/campus";
import { getLevel } from "../data/levels";
import { getSceneConfig, getSceneForBuilding, getSceneForLevel } from "../scenes/registry";
import { useGameStore } from "@/store/gameStore";
import type { SceneId } from "@/game/types";

// ─────────────────────────────────────────────────────────────────────────────
// Interior component registry
// ─────────────────────────────────────────────────────────────────────────────

interface InteriorSceneProps {
  levelId: number;
  highlightedId: string | null;
}

const SCENE_COMPONENTS: Partial<Record<SceneId, React.ComponentType<InteriorSceneProps>>> = {
  library_interior: LibraryRoom,
  robotics_lab_interior: RoboticsLabRoom,
  computer_lab_interior: ComputerLabRoom,
  auditorium_interior: AuditoriumRoom,
  cafeteria_interior: CafeteriaRoom,
  main_building_interior: MainBuildingRoom,
  electronics_lab_interior: ElectronicsLabRoom,
  garden_interior: GardenPavilionRoom,
  server_room_interior: ServerRoom,
  secret_room_interior: SecretRoom,
};

/**
 * Lightweight background shader preheater.
 * Compiles WebGL shaders during browser idle time so scene activation is instant.
 */
function StagedPreheater({ activeScene }: { activeScene: SceneId }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const handle =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback(() => {
            try {
              gl.compile(scene, camera);
            } catch {}
          })
        : setTimeout(() => {
            try {
              gl.compile(scene, camera);
            } catch {}
          }, 400);

    return () => {
      if (typeof cancelIdleCallback !== "undefined" && typeof handle === "number") {
        cancelIdleCallback(handle);
      } else {
        clearTimeout(handle as number);
      }
    };
  }, [activeScene, gl, scene, camera]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function GameWorld({ onNearby }: { onNearby: (t: ProximityTarget | null) => void }) {
  const scene = useGameStore((s) => s.scene);
  const currentLevel = useGameStore((s) => s.currentLevel);
  const investigated = useGameStore((s) => s.investigated);
  const spawnOverride = useGameStore((s) => s.spawnOverride);
  const positionRef = useRef(new THREE.Vector3());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // All scene-specific data flows from the registry — no inLibrary boolean.
  const config = getSceneConfig(scene);

  // ── Bounded Interior Scene Cache ────────────────────────────────────────
  // Keeps current active interior + likely next quest interior pre-warmed in memory.
  // Maximum 2 interiors in cache to strictly bound GPU memory.
  const likelyNextScene = getSceneForLevel(currentLevel)?.id;

  const [cachedInteriors, setCachedInteriors] = useState<SceneId[]>(() => {
    return config.isInterior ? [scene] : likelyNextScene ? [likelyNextScene] : [];
  });

  useEffect(() => {
    setCachedInteriors((prev) => {
      const next = new Set(prev);
      if (config.isInterior) next.add(scene);
      if (likelyNextScene) next.add(likelyNextScene);
      const arr = Array.from(next);
      return arr.length > 2 ? arr.slice(-2) : arr;
    });
  }, [scene, config.isInterior, likelyNextScene]);

  // ── Proximity targets ───────────────────────────────────────────────────

  const targets = useMemo<ProximityTarget[]>(() => {
    if (config.isInterior) {
      // Interior: level objects (investigate target vs scan object) + exit trigger (navigate back)
      const isQuestRoom = config.levelId != null && config.levelId === currentLevel;
      const levelObjects: ProximityTarget[] =
        config.levelId != null
          ? getLevel(config.levelId).objects.map((o) => {
              const isSearched = investigated.includes(o.id);
              const action = isQuestRoom && !isSearched ? "Investigate Target" : "Scan Object";
              return {
                id: o.id,
                label: isSearched ? `${o.label} (searched)` : o.label,
                position: o.position,
                radius: o.radius,
                action,
              };
            })
          : [];

      const exitTarget: ProximityTarget[] =
        config.exitTo !== null && config.exitPosition !== null
          ? [
              {
                id: "__exit_scene",
                label: `Exit to ${getSceneConfig(config.exitTo).locationLabel}`,
                position: config.exitPosition,
                radius: config.exitRadius,
                action: "Leave",
                navigatesTo: config.exitTo,
              },
            ]
          : [];

      return [...levelObjects, ...exitTarget];
    }

    // Campus / open-world: one proximity target per enterable building
    return CAMPUS.filter((b) => b.enterable).map((b) => {
      const [x, z] = doorPosition(b);
      const ox = b.door[0] !== 0 ? Math.sign(b.door[0]) * 1.2 : 0;
      const oz = b.door[1] !== 0 ? Math.sign(b.door[1]) * 1.2 : 0;
      const targetScene = getSceneForBuilding(b.id);
      return {
        id: `__enter_${b.id}`,
        label: `Enter ${b.name}`,
        position: [x + ox, 0, z + oz] as [number, number, number],
        radius: 3.2,
        action: "Enter",
        navigatesTo: targetScene?.id,
      };
    });
  }, [config, investigated, currentLevel]);

  // ── Collision blockers ──────────────────────────────────────────────────

  const blockers = useMemo<Blocker[]>(() => {
    if (config.isInterior) {
      return config.levelId != null
        ? getLevel(config.levelId)
            .objects.filter((o) => o.kind !== "book" && o.kind !== "painting")
            .map((o) => ({ x: o.position[0], z: o.position[2], w: 1.2, d: 1.2 }))
        : [];
    }
    return CAMPUS.filter((b) => b.id !== "garden" && b.id !== "main_gate").map((b) => ({
      x: b.position[0],
      z: b.position[1],
      w: b.size[0],
      d: b.size[2],
    }));
  }, [config]);

  // ── Scene change side-effects ───────────────────────────────────────────

  useEffect(() => {
    onNearby(null);
    setHighlightedId(null);
    useGameStore.getState().clearInvestigationState();
  }, [scene, onNearby]);

  // ── Render ──────────────────────────────────────────────────────────────

  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 1.5) : 1;

  return (
    <Canvas
      shadows
      dpr={[1, dpr]}
      camera={{ fov: 62, near: 0.1, far: 260, position: [0, 4, 50] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[config.background]} />
      <fog attach="fog" args={config.fog} />

      {/* 1. Persistent Campus Scene: always preserved in memory, hidden when inside interiors */}
      <group visible={scene === "campus"}>
        {scene === "campus" && (
          <>
            <ambientLight intensity={0.55} color="#9fc6dd" />
            <hemisphereLight intensity={0.7} groundColor="#1b2530" color="#8fb7cc" />
            <directionalLight
              position={[28, 40, 20]}
              intensity={1.1}
              castShadow
              shadow-mapSize={[1024, 1024]}
            />
          </>
        )}
        <CampusScene />
      </group>

      {/* 2. Cached Interior Scenes: active is visible; prepared/previous rooms are in memory */}
      {cachedInteriors.map((interiorId) => {
        const Comp = SCENE_COMPONENTS[interiorId];
        const intCfg = getSceneConfig(interiorId);
        if (!Comp || !intCfg) return null;
        const isCurrent = scene === interiorId;
        return (
          <group key={interiorId} visible={isCurrent}>
            <Comp
              levelId={intCfg.levelId ?? 1}
              highlightedId={isCurrent ? highlightedId : null}
            />
          </group>
        );
      })}

      {/* Player spawn and bounds come entirely from the registry. */}
      <Player
        spawn={spawnOverride ?? config.spawn}
        bounds={config.bounds}
        blockers={blockers}
        onMove={(p) => positionRef.current.copy(p)}
      />

      <ProximityWatcher
        targets={targets}
        positionRef={positionRef}
        onChange={(t) => {
          setHighlightedId(t ? t.id : null);
          if (t && !t.navigatesTo) {
            useGameStore.getState().setSelectedObject({
              id: t.id,
              name: t.label.replace(" (searched)", ""),
              levelId: config.levelId,
              room: config.room,
              action: (t.action as "Scan Object" | "Investigate Target") || "Scan Object",
            });
          } else if (!t) {
            useGameStore.getState().setSelectedObject(null);
          }
          onNearby(t);
        }}
      />

      <StagedPreheater activeScene={scene} />
    </Canvas>
  );
}
