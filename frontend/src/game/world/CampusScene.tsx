import * as THREE from "three";
import { Html } from "@react-three/drei";
import { CAMPUS } from "../data/campus";

/** Low-poly campus exterior. Interiors are separate scenes, never visible from outside. */
export function CampusScene() {
  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[130, 140]} />
        <meshStandardMaterial color="#1d2733" />
      </mesh>

      {/* main road */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 108]} />
        <meshStandardMaterial color="#2a3542" />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.35, 104]} />
        <meshBasicMaterial color="#4f7c8a" />
      </mesh>

      {CAMPUS.map((b) => {
        const [x, z] = b.position;
        const [w, h, d] = b.size;
        const isGarden = b.id === "garden";
        return (
          <group key={b.id} position={[x, 0, z]}>
            <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[w, h, d]} />
              <meshStandardMaterial
                color={b.color}
                roughness={0.85}
                metalness={isGarden ? 0 : 0.12}
              />
            </mesh>
            {!isGarden && (
              <>
                {/* window band — purely decorative, interiors are not visible */}
                <mesh position={[0, h * 0.62, d / 2 + 0.02]}>
                  <planeGeometry args={[w * 0.82, h * 0.16]} />
                  <meshStandardMaterial
                    color="#8fd6e6"
                    emissive="#2b6d7d"
                    emissiveIntensity={0.7}
                  />
                </mesh>
                {/* door — oriented to whichever facade it sits on */}
                <mesh
                  position={[
                    b.door[0] + (b.door[0] !== 0 ? Math.sign(b.door[0]) * 0.03 : 0),
                    1.2,
                    b.door[1] + (b.door[1] !== 0 ? Math.sign(b.door[1]) * 0.03 : 0),
                  ]}
                  rotation={[0, b.door[0] !== 0 ? Math.sign(b.door[0]) * (Math.PI / 2) : 0, 0]}
                >
                  <planeGeometry args={[2.2, 2.4]} />
                  <meshStandardMaterial
                    color="#14202b"
                    emissive="#0e2b33"
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </>
            )}
            <Html
              position={[0, h + 1.4, 0]}
              center
              distanceFactor={26}
              occlude={false}
              zIndexRange={[10, 0]}
            >
              <div className="pointer-events-none whitespace-nowrap rounded border border-primary/30 bg-background/70 px-2 py-0.5 text-[10px] font-display tracking-widest text-primary/90">
                {b.name.toUpperCase()}
              </div>
            </Html>
          </group>
        );
      })}

      {/* perimeter fence posts */}
      {Array.from({ length: 28 }).map((_, i) => {
        const angle = (i / 28) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.sin(angle) * 52, 1, Math.cos(angle) * 58]}>
            <boxGeometry args={[0.3, 2, 0.3]} />
            <meshStandardMaterial color="#33414f" />
          </mesh>
        );
      })}
    </group>
  );
}
