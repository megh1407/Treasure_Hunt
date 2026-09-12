import { getLevel } from "../../data/levels";
import { ObjectMesh } from "../../objects";
import { LIBRARY_CONFIG } from "./LibraryConfig";
import { EXIT_MARKER, LIBRARY_WALLS, READING_TABLE, STUDY_DESK } from "./LibraryLayout";

export interface LibraryRoomProps {
  levelId: number;
  highlightedId: string | null;
}

/**
 * Library interior room component.
 *
 * Renders the architectural shell (floor, ceiling, walls), static interior furniture,
 * room lighting, exit visual indicator, and dynamic level quest objects via ObjectMesh.
 *
 * Spatial navigation constraints (spawn, bounds, exit routing) are owned by the Scene Registry.
 */
export function LibraryRoom({ levelId, highlightedId }: LibraryRoomProps) {
  const level = getLevel(levelId);
  const { dimensions, colors, lighting } = LIBRARY_CONFIG;

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.floor} />
      </mesh>

      {/* ceiling */}
      <mesh position={[0, dimensions.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[dimensions.width, dimensions.depth]} />
        <meshStandardMaterial color={colors.ceiling} />
      </mesh>

      {/* walls */}
      {LIBRARY_WALLS.map((wall, idx) => (
        <mesh key={idx} position={wall.position} rotation={[0, wall.rotationY, 0]} receiveShadow>
          <planeGeometry args={[dimensions.width, dimensions.height]} />
          <meshStandardMaterial color={colors.wall} side={2} />
        </mesh>
      ))}

      {/* static reading table */}
      <mesh position={READING_TABLE.top.position} castShadow>
        <boxGeometry args={READING_TABLE.top.size} />
        <meshStandardMaterial color={colors.readingTable} />
      </mesh>
      {READING_TABLE.legs.map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.35, z]}>
          <boxGeometry args={READING_TABLE.legSize} />
          <meshStandardMaterial color={colors.readingTableLegs} />
        </mesh>
      ))}

      {/* static study desk */}
      <mesh position={STUDY_DESK.position}>
        <boxGeometry args={STUDY_DESK.size} />
        <meshStandardMaterial color={colors.studyDesk} />
      </mesh>

      {/* exit visual marker */}
      <mesh position={EXIT_MARKER.position} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={EXIT_MARKER.size} />
        <meshBasicMaterial color={colors.exitMarker} transparent opacity={0.22} />
      </mesh>

      {/* dynamic level quest objects */}
      {level.objects.map((o) => (
        <ObjectMesh key={o.id} object={o} highlighted={highlightedId === o.id} />
      ))}

      {/* room lights */}
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
