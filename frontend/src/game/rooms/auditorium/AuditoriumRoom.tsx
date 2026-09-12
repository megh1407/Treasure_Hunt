import { getLevel } from "../../data/levels";
import { ObjectMesh } from "../../objects";
import { AUDITORIUM_CONFIG } from "./AuditoriumConfig";

export interface AuditoriumRoomProps {
  levelId: number;
  highlightedId: string | null;
}

const { dimensions, colors, lighting } = AUDITORIUM_CONFIG;
const halfWidth = dimensions.width / 2;
const halfDepth = dimensions.depth / 2;
const wallY = dimensions.height / 2;

const AUDITORIUM_WALLS: ReadonlyArray<{
  position: [number, number, number];
  rotationY: number;
}> = [
  { position: [0, wallY, -halfDepth], rotationY: 0 },
  { position: [0, wallY, halfDepth], rotationY: Math.PI },
  { position: [-halfWidth, wallY, 0], rotationY: Math.PI / 2 },
  { position: [halfWidth, wallY, 0], rotationY: -Math.PI / 2 },
];

export function AuditoriumRoom({ levelId, highlightedId }: AuditoriumRoomProps) {
  const level = getLevel(levelId);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.floor} roughness={0.8} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, dimensions.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.ceiling} />
      </mesh>

      {/* Walls */}
      {AUDITORIUM_WALLS.map((wall, idx) => (
        <mesh key={idx} position={wall.position} rotation={[0, wall.rotationY, 0]} receiveShadow>
          <planeGeometry args={[dimensions.width, dimensions.height]} />
          <meshStandardMaterial color={colors.wall} side={2} roughness={0.7} />
        </mesh>
      ))}

      {/* Raised Stage Platform at front [0, 0.15, -5.5] */}
      <mesh position={[0, 0.15, -5.5]} receiveShadow castShadow>
        <boxGeometry args={[15, 0.3, 5.5]} />
        <meshStandardMaterial color={colors.stageFloor} roughness={0.5} />
      </mesh>

      {/* Golden Stage Apron Edge Marking */}
      <mesh position={[0, 0.31, -2.75]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[15, 0.1]} />
        <meshBasicMaterial color={colors.stageEdge} />
      </mesh>

      {/* Stage Backdrop Screen / Panel on back wall */}
      <mesh position={[0, 2.8, -halfDepth + 0.1]} castShadow>
        <boxGeometry args={[10, 3.2, 0.15]} />
        <meshStandardMaterial color={colors.acousticPanel} roughness={0.85} />
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
