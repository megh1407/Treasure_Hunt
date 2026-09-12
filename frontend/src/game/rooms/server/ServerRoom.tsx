import { getLevel } from "../../data/levels";
import { ObjectMesh } from "../../objects";
import { SERVER_CONFIG } from "./ServerConfig";

export interface ServerRoomProps {
  levelId: number;
  highlightedId: string | null;
}

const { dimensions, colors, lighting } = SERVER_CONFIG;
const halfWidth = dimensions.width / 2;
const halfDepth = dimensions.depth / 2;
const wallY = dimensions.height / 2;

const SERVER_WALLS: ReadonlyArray<{
  position: [number, number, number];
  rotationY: number;
}> = [
  { position: [0, wallY, -halfDepth], rotationY: 0 },
  { position: [0, wallY, halfDepth], rotationY: Math.PI },
  { position: [-halfWidth, wallY, 0], rotationY: Math.PI / 2 },
  { position: [halfWidth, wallY, 0], rotationY: -Math.PI / 2 },
];

export function ServerRoom({ levelId, highlightedId }: ServerRoomProps) {
  const level = getLevel(levelId);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.floor} roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Perforated Raised Server Tiles (Cold Aisle) */}
      <mesh position={[0, 0.02, -1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.5, 12]} />
        <meshStandardMaterial color={colors.perforatedFloor} roughness={0.5} metalness={0.5} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, dimensions.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.ceiling} />
      </mesh>

      {/* Walls */}
      {SERVER_WALLS.map((wall, idx) => (
        <mesh key={idx} position={wall.position} rotation={[0, wall.rotationY, 0]} receiveShadow>
          <planeGeometry args={[dimensions.width, dimensions.height]} />
          <meshStandardMaterial color={colors.wall} side={2} roughness={0.65} />
        </mesh>
      ))}

      {/* Overhead Cable Trays */}
      {[-3, 3].map((x) => (
        <mesh key={x} position={[x, dimensions.height - 0.3, 0]} castShadow>
          <boxGeometry args={[0.5, 0.25, 14]} />
          <meshStandardMaterial color={colors.cableTray} metalness={0.7} />
        </mesh>
      ))}

      {/* Blue LED Aisle Guide Strips */}
      {[-2.3, 2.3].map((x) => (
        <mesh key={x} position={[x, 0.03, -1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.1, 12]} />
          <meshBasicMaterial color={colors.blueLED} />
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
