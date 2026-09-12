import { getLevel } from "../../data/levels";
import { ObjectMesh } from "../../objects";
import { GARDEN_CONFIG } from "./GardenConfig";

export interface GardenPavilionRoomProps {
  levelId: number;
  highlightedId: string | null;
}

const { dimensions, colors, lighting } = GARDEN_CONFIG;
const halfWidth = dimensions.width / 2;
const halfDepth = dimensions.depth / 2;
const wallY = dimensions.height / 2;

const GARDEN_WALLS: ReadonlyArray<{
  position: [number, number, number];
  rotationY: number;
}> = [
  { position: [0, wallY, -halfDepth], rotationY: 0 },
  { position: [0, wallY, halfDepth], rotationY: Math.PI },
  { position: [-halfWidth, wallY, 0], rotationY: Math.PI / 2 },
  { position: [halfWidth, wallY, 0], rotationY: -Math.PI / 2 },
];

export function GardenPavilionRoom({ levelId, highlightedId }: GardenPavilionRoomProps) {
  const level = getLevel(levelId);

  return (
    <group>
      {/* Garden Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.floor} roughness={0.9} />
      </mesh>

      {/* Central Flagstone Walkway */}
      <mesh position={[0, 0.02, 2.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.2, 11]} />
        <meshStandardMaterial color={colors.stonePath} roughness={0.7} />
      </mesh>

      {/* Stone Pedestal Plinth at center */}
      <mesh position={[0, 0.12, -2.5]} receiveShadow castShadow>
        <cylinderGeometry args={[2.0, 2.2, 0.24, 16]} />
        <meshStandardMaterial color={colors.stonePath} roughness={0.7} />
      </mesh>

      {/* Glass Conservatory Ceiling */}
      <mesh position={[0, dimensions.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.glassRoof} transparent opacity={0.7} />
      </mesh>

      {/* Perimeter Walls / Foliage Hedgerows */}
      {GARDEN_WALLS.map((wall, idx) => (
        <mesh key={idx} position={wall.position} rotation={[0, wall.rotationY, 0]} receiveShadow>
          <planeGeometry args={[dimensions.width, dimensions.height]} />
          <meshStandardMaterial color={colors.wall} side={2} roughness={0.8} />
        </mesh>
      ))}

      {/* Timber Conservatory Trusses */}
      {[-4, 0, 4].map((z) => (
        <mesh key={z} position={[0, dimensions.height - 0.2, z]} castShadow>
          <boxGeometry args={[dimensions.width - 0.4, 0.35, 0.35]} />
          <meshStandardMaterial color={colors.timberTruss} roughness={0.7} />
        </mesh>
      ))}

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
