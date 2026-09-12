import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";

import type { SceneId } from "../types";

export interface ProximityTarget {
  id: string;
  label: string;
  position: [number, number, number];
  radius: number;
  action?: string;
  /**
   * If set, pressing E on this target navigates to the specified scene
   * instead of calling investigate(). Used for building entrances and
   * scene exit triggers — no hardcoded ID checks needed in GameScreen.
   */
  navigatesTo?: SceneId | undefined;
}

/**
 * Reusable proximity system: reports the closest in-range target.
 * Works for every building, room and object type.
 */
export function ProximityWatcher({
  targets,
  positionRef,
  onChange,
}: {
  targets: ProximityTarget[];
  positionRef: React.RefObject<THREE.Vector3>;
  onChange: (target: ProximityTarget | null) => void;
}) {
  const last = useRef<string | null>(null);
  const acc = useRef(0);

  useFrame((_, delta) => {
    acc.current += delta;
    if (acc.current < 0.12) return;
    acc.current = 0;
    const p = positionRef.current;
    if (!p) return;

    let best: ProximityTarget | null = null;
    let bestDist = Infinity;
    for (const t of targets) {
      const d = Math.hypot(t.position[0] - p.x, t.position[2] - p.z);
      if (d <= t.radius && d < bestDist) {
        best = t;
        bestDist = d;
      }
    }
    const id = best?.id ?? null;
    if (id !== last.current) {
      last.current = id;
      onChange(best);
    }
  });

  return null;
}
