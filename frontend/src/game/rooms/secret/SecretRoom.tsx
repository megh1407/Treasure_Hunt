import { getLevel } from "../../data/levels";
import { ObjectMesh } from "../../objects";
import { SECRET_CONFIG } from "./SecretConfig";

export interface SecretRoomProps {
  levelId: number;
  highlightedId: string | null;
}

const { dimensions, colors, lighting } = SECRET_CONFIG;
const halfWidth = dimensions.width / 2;
const halfDepth = dimensions.depth / 2;
const wallY = dimensions.height / 2;

const SECRET_WALLS: ReadonlyArray<{
  position: [number, number, number];
  rotationY: number;
}> = [
  { position: [0, wallY, -halfDepth], rotationY: 0 },
  { position: [0, wallY, halfDepth], rotationY: Math.PI },
  { position: [-halfWidth, wallY, 0], rotationY: Math.PI / 2 },
  { position: [halfWidth, wallY, 0], rotationY: -Math.PI / 2 },
];

export function SecretRoom({ levelId, highlightedId }: SecretRoomProps) {
  const level = getLevel(levelId);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.floor} roughness={0.6} metalness={0.5} />
      </mesh>

      {/* Hexagonal Reinforced Vault Floor Plate */}
      <mesh position={[0, 0.02, -3.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.8, 6]} />
        <meshStandardMaterial color={colors.vaultFloor} roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Radiant Containment Ring on floor */}
      <mesh position={[0, 0.03, -3.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.35, 32]} />
        <meshBasicMaterial color={colors.cyanCoreGlow} />
      </mesh>

      {/* Raised Containment Pedestal base */}
      <mesh position={[0, 0.15, -3.8]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.8, 0.3, 16]} />
        <meshStandardMaterial color={colors.corePedestal} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, dimensions.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.ceiling} />
      </mesh>

      {/* Walls */}
      {SECRET_WALLS.map((wall, idx) => (
        <mesh key={idx} position={wall.position} rotation={[0, wall.rotationY, 0]} receiveShadow>
          <planeGeometry args={[dimensions.width, dimensions.height]} />
          <meshStandardMaterial color={colors.wall} side={2} roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {/* Vault Reinforced Blast Door Arch on back wall */}
      <mesh position={[0, 2.2, -halfDepth + 0.1]} castShadow>
        <boxGeometry args={[4.2, 3.8, 0.2]} />
        <meshStandardMaterial color={colors.reinforcedDoor} metalness={0.6} roughness={0.4} />
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
      {/* Dramatic CORE-X pod glow */}
      <pointLight
        position={lighting.corePoint.position}
        intensity={lighting.corePoint.intensity}
        distance={lighting.corePoint.distance}
        color={lighting.corePoint.color}
      />
    </group>
  );
}
