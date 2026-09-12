import { getLevel } from "../../data/levels";
import { ObjectMesh } from "../../objects";
import { MAIN_BUILDING_CONFIG } from "./MainBuildingConfig";

export interface MainBuildingRoomProps {
  levelId: number;
  highlightedId: string | null;
}

const { dimensions, colors, lighting } = MAIN_BUILDING_CONFIG;
const halfWidth = dimensions.width / 2;
const halfDepth = dimensions.depth / 2;
const wallY = dimensions.height / 2;

const MAIN_BUILDING_WALLS: ReadonlyArray<{
  position: [number, number, number];
  rotationY: number;
}> = [
  { position: [0, wallY, -halfDepth], rotationY: 0 },
  { position: [0, wallY, halfDepth], rotationY: Math.PI },
  { position: [-halfWidth, wallY, 0], rotationY: Math.PI / 2 },
  { position: [halfWidth, wallY, 0], rotationY: -Math.PI / 2 },
];

export function MainBuildingRoom({ levelId, highlightedId }: MainBuildingRoomProps) {
  const level = getLevel(levelId);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.floor} roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Corridor Runner Tile */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.5, dimensions.depth]} />
        <meshStandardMaterial color={colors.accentTile} roughness={0.6} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, dimensions.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.ceiling} />
      </mesh>

      {/* Walls */}
      {MAIN_BUILDING_WALLS.map((wall, idx) => (
        <mesh key={idx} position={wall.position} rotation={[0, wall.rotationY, 0]} receiveShadow>
          <planeGeometry args={[dimensions.width, dimensions.height]} />
          <meshStandardMaterial color={colors.wall} side={2} roughness={0.6} />
        </mesh>
      ))}

      {/* Corridor Architectural Columns */}
      {[-5.5, 5.5].map((x) =>
        [-4, 0, 4].map((z) => (
          <mesh key={`${x}_${z}`} position={[x, wallY, z]} castShadow receiveShadow>
            <boxGeometry args={[0.7, dimensions.height, 0.7]} />
            <meshStandardMaterial color={colors.corridorPillar} metalness={0.3} />
          </mesh>
        ))
      )}

      {/* Wall trim banner */}
      <mesh position={[0, 3.2, -halfDepth + 0.05]}>
        <boxGeometry args={[14, 0.5, 0.1]} />
        <meshStandardMaterial color={colors.wallTrim} />
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
