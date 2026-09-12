import type React from "react";
import { useEffect, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import type { GameObject } from "../../types";
import { useGameStore } from "@/store/gameStore";

export interface InteractiveObjectProps {
  object: GameObject;
  highlighted: boolean;
  children?: React.ReactNode;
}

/**
 * Spatial and interaction wrapper for any 3D object in the game world.
 *
 * Positions and orients the object according to its GameObject definition,
 * supports direct 3D click investigation with proximity checks, and provides immediate
 * visual highlight and active scanning pulse feedback.
 */
export function InteractiveObject({ object, highlighted, children }: InteractiveObjectProps) {
  const isInvestigating = useGameStore((s) => s.investigatingId === object.id);
  const ringRef = useRef<THREE.Mesh>(null);
  const scanRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "default";
    };
  }, []);

  useFrame((_, delta) => {
    if (isInvestigating && scanRef.current) {
      scanRef.current.rotation.z += delta * 4;
      const mat = scanRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
      }
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const store = useGameStore.getState();
    if (!store.isReady || !store.activeSessionId || store.investigatingId || store.panel) return;

    // Verify player is within reasonable interaction distance
    const [px, , pz] = store.playerPosition;
    const [ox, , oz] = object.position;
    const dist = Math.hypot(px - ox, pz - oz);
    const maxClickDist = Math.max(object.radius * 1.5, 3.5);
    if (dist > maxClickDist) {
      store.setToast(`Move closer to investigate ${object.label || object.id.replace(/_/g, " ")}`);
      return;
    }

    void store.investigate(object.id);
  };

  const showHighlight = highlighted || isInvestigating;
  const ringColor = isInvestigating ? "#fbbf24" : "#7fe3f2";

  return (
    <group
      position={object.position}
      rotation={[0, object.rotationY ?? 0, 0]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        const store = useGameStore.getState();
        if (store.isReady && store.activeSessionId) {
          document.body.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      {children}
      {showHighlight && (
        <mesh ref={ringRef} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.85, 26]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.75} />
        </mesh>
      )}
      {isInvestigating && (
        <mesh ref={scanRef} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.62, 26]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}
