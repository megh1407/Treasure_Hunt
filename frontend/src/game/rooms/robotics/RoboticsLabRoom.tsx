import { getLevel } from "../../data/levels";
import { ObjectMesh } from "../../objects";
import { ROBOTICS_CONFIG } from "./RoboticsConfig";

export interface RoboticsLabRoomProps {
  levelId: number;
  highlightedId: string | null;
}

const { dimensions, colors, lighting } = ROBOTICS_CONFIG;
const halfWidth = dimensions.width / 2;
const halfDepth = dimensions.depth / 2;
const wallY = dimensions.height / 2;

const ROBOTICS_WALLS: ReadonlyArray<{
  position: [number, number, number];
  rotationY: number;
}> = [
  { position: [0, wallY, -halfDepth], rotationY: 0 },
  { position: [0, wallY, halfDepth], rotationY: Math.PI },
  { position: [-halfWidth, wallY, 0], rotationY: Math.PI / 2 },
  { position: [halfWidth, wallY, 0], rotationY: -Math.PI / 2 },
];

export function RoboticsLabRoom({ levelId, highlightedId }: RoboticsLabRoomProps) {
  const level = getLevel(levelId);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.floor} roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, dimensions.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.ceiling} />
      </mesh>

      {/* Walls */}
      {ROBOTICS_WALLS.map((wall, idx) => (
        <mesh key={idx} position={wall.position} rotation={[0, wall.rotationY, 0]} receiveShadow>
          <planeGeometry args={[dimensions.width, dimensions.height]} />
          <meshStandardMaterial color={colors.wall} side={2} roughness={0.6} />
        </mesh>
      ))}

      {/* Robotic Assembly Bay Pedestal Platform (under robot_arm at [-4.2, 0, -2.5]) */}
      <mesh position={[-4.2, 0.04, -2.5]} receiveShadow castShadow>
        <boxGeometry args={[3.2, 0.08, 3.2]} />
        <meshStandardMaterial color={colors.assemblyPlatform} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Hazard Warning Safety Border around Assembly Bay */}
      <mesh position={[-4.2, 0.05, -2.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 1.85, 4]} />
        <meshBasicMaterial color={colors.hazardStripe} />
      </mesh>

      {/* Overhead Cable & Equipment Trunking */}
      <mesh position={[0, dimensions.height - 0.2, 0]} castShadow>
        <boxGeometry args={[14, 0.2, 0.4]} />
        <meshStandardMaterial color={colors.steelCabinet} metalness={0.6} />
      </mesh>

      {/* Wall mounted equipment rack on back wall */}
      <mesh position={[0, 2.2, -halfDepth + 0.1]} castShadow>
        <boxGeometry args={[4.5, 1.2, 0.15]} />
        <meshStandardMaterial color={colors.wallTrim} metalness={0.4} />
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
