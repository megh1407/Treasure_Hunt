import { getLevel } from "../../data/levels";
import { ObjectMesh } from "../../objects";
import { COMPUTER_CONFIG } from "./ComputerConfig";

export interface ComputerLabRoomProps {
  levelId: number;
  highlightedId: string | null;
}

const { dimensions, colors, lighting } = COMPUTER_CONFIG;
const halfWidth = dimensions.width / 2;
const halfDepth = dimensions.depth / 2;
const wallY = dimensions.height / 2;

const COMPUTER_WALLS: ReadonlyArray<{
  position: [number, number, number];
  rotationY: number;
}> = [
  { position: [0, wallY, -halfDepth], rotationY: 0 },
  { position: [0, wallY, halfDepth], rotationY: Math.PI },
  { position: [-halfWidth, wallY, 0], rotationY: Math.PI / 2 },
  { position: [halfWidth, wallY, 0], rotationY: -Math.PI / 2 },
];

export function ComputerLabRoom({ levelId, highlightedId }: ComputerLabRoomProps) {
  const level = getLevel(levelId);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.floor} roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, dimensions.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.ceiling} />
      </mesh>

      {/* Walls */}
      {COMPUTER_WALLS.map((wall, idx) => (
        <mesh key={idx} position={wall.position} rotation={[0, wall.rotationY, 0]} receiveShadow>
          <planeGeometry args={[dimensions.width, dimensions.height]} />
          <meshStandardMaterial color={colors.wall} side={2} roughness={0.7} />
        </mesh>
      ))}

      {/* Server Platform Base under Server Rack at [0, 0, -5.5] */}
      <mesh position={[0, 0.04, -5.5]} receiveShadow castShadow>
        <boxGeometry args={[4.2, 0.08, 2.4]} />
        <meshStandardMaterial color={colors.serverPlinth} metalness={0.4} roughness={0.3} />
      </mesh>

      {/* Raised Floor Cable Channel (glow strip toward server area) */}
      <mesh position={[0, 0.02, -1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 5.0]} />
        <meshBasicMaterial color={colors.cableChannel} transparent opacity={0.35} />
      </mesh>

      {/* Wall mounted server room acoustic baffle panels */}
      <mesh position={[-halfWidth + 0.1, 2.0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[10, 1.8, 0.12]} />
        <meshStandardMaterial color={colors.wallPanel} roughness={0.8} />
      </mesh>
      <mesh position={[halfWidth - 0.1, 2.0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[10, 1.8, 0.12]} />
        <meshStandardMaterial color={colors.wallPanel} roughness={0.8} />
      </mesh>

      {/* Exit visual marker */}
      <mesh position={[0, 0.04, 8.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 1.4]} />
        <meshBasicMaterial color={colors.exitMarker} transparent opacity={0.25} />
      </mesh>

      {/* Dynamic level quest objects */}
      {level.objects.map((o) => (
        <ObjectMesh key={o.id} object={o} highlighted={highlightedId === o.id} />
      ))}

      {/* Room lighting */}
      <ambientLight intensity={lighting.ambient.intensity} />
      <pointLight
        position={lighting.primaryPoint.position}
        intensity={lighting.primaryPoint.intensity}
        distance={lighting.primaryPoint.distance}
        color={lighting.primaryPoint.color}
        castShadow
      />
      <pointLight
        position={lighting.accentPoint.position}
        intensity={lighting.accentPoint.intensity}
        distance={lighting.accentPoint.distance}
        color={lighting.accentPoint.color}
      />
    </group>
  );
}
