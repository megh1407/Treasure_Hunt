import { getLevel } from "../../data/levels";
import { ObjectMesh } from "../../objects";
import { ELECTRONICS_CONFIG } from "./ElectronicsConfig";

export interface ElectronicsLabRoomProps {
  levelId: number;
  highlightedId: string | null;
}

const { dimensions, colors, lighting } = ELECTRONICS_CONFIG;
const halfWidth = dimensions.width / 2;
const halfDepth = dimensions.depth / 2;
const wallY = dimensions.height / 2;

const ELECTRONICS_WALLS: ReadonlyArray<{
  position: [number, number, number];
  rotationY: number;
}> = [
  { position: [0, wallY, -halfDepth], rotationY: 0 },
  { position: [0, wallY, halfDepth], rotationY: Math.PI },
  { position: [-halfWidth, wallY, 0], rotationY: Math.PI / 2 },
  { position: [halfWidth, wallY, 0], rotationY: -Math.PI / 2 },
];

export function ElectronicsLabRoom({ levelId, highlightedId }: ElectronicsLabRoomProps) {
  const level = getLevel(levelId);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.floor} roughness={0.7} metalness={0.25} />
      </mesh>

      {/* Static-dissipative ESD Work Mat Platforms */}
      <mesh position={[2.8, 0.02, -3.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.5, 3.8]} />
        <meshStandardMaterial color={colors.esdMat} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[-3.2, 0.02, -3.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.5, 3.8]} />
        <meshStandardMaterial color={colors.esdMat} roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, dimensions.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.ceiling} />
      </mesh>

      {/* Walls */}
      {ELECTRONICS_WALLS.map((wall, idx) => (
        <mesh key={idx} position={wall.position} rotation={[0, wall.rotationY, 0]} receiveShadow>
          <planeGeometry args={[dimensions.width, dimensions.height]} />
          <meshStandardMaterial color={colors.wall} side={2} roughness={0.65} />
        </mesh>
      ))}

      {/* Overhead Cable Trunking Rack */}
      <mesh position={[0, dimensions.height - 0.25, -1]} castShadow>
        <boxGeometry args={[14, 0.2, 0.35]} />
        <meshStandardMaterial color={colors.steelRack} metalness={0.5} />
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
