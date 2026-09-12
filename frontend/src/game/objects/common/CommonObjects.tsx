/**
 * Reusable low-poly 3D furniture and decorative prop meshes.
 * These can be placed in any interior room or layout.
 */

export function TableMesh() {
  return (
    <mesh position={[0, 0.75, 0]} castShadow>
      <boxGeometry args={[2.4, 0.12, 1.2]} />
      <meshStandardMaterial color="#5a4634" />
    </mesh>
  );
}

export function ChairMesh() {
  return (
    <group>
      <mesh position={[0, 0.48, 0]}>
        <boxGeometry args={[0.6, 0.1, 0.6]} />
        <meshStandardMaterial color="#4d5a68" />
      </mesh>
      <mesh position={[0, 0.85, -0.26]}>
        <boxGeometry args={[0.6, 0.66, 0.09]} />
        <meshStandardMaterial color="#4d5a68" />
      </mesh>
    </group>
  );
}

export function CabinetMesh() {
  return (
    <group>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[1.1, 1.7, 0.7]} />
        <meshStandardMaterial color="#3f4a56" metalness={0.3} />
      </mesh>
      {[0.45, 1.0, 1.45].map((y) => (
        <mesh key={y} position={[0, y, 0.37]}>
          <boxGeometry args={[0.9, 0.06, 0.04]} />
          <meshStandardMaterial color="#8fa2b3" />
        </mesh>
      ))}
    </group>
  );
}

export function LockerMesh() {
  return (
    <mesh position={[0, 1, 0]} castShadow>
      <boxGeometry args={[0.9, 2, 0.6]} />
      <meshStandardMaterial color="#425568" metalness={0.4} />
    </mesh>
  );
}

export function BoxMesh() {
  return (
    <mesh position={[0, 0.35, 0]} rotation={[0, 0.3, 0]} castShadow>
      <boxGeometry args={[0.9, 0.7, 0.9]} />
      <meshStandardMaterial color="#7c6244" />
    </mesh>
  );
}

export function ComputerMesh() {
  return (
    <group>
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[1.3, 0.75, 0.7]} />
        <meshStandardMaterial color="#3b4653" />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[0.95, 0.6, 0.06]} />
        <meshStandardMaterial color="#12181f" emissive="#0d242b" />
      </mesh>
    </group>
  );
}

export function PaintingMesh() {
  return (
    <group>
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[1.8, 1.2, 0.08]} />
        <meshStandardMaterial color="#2b2118" />
      </mesh>
      <mesh position={[0, 2, 0.06]}>
        <planeGeometry args={[1.55, 0.98]} />
        <meshStandardMaterial color="#6b5a45" />
      </mesh>
    </group>
  );
}

export function NoticeboardMesh() {
  return (
    <group>
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[2.2, 1.4, 0.1]} />
        <meshStandardMaterial color="#33404d" />
      </mesh>
      {[-0.6, 0, 0.62].map((x, i) => (
        <mesh key={x} position={[x, 1.8 + (i % 2) * 0.16, 0.07]}>
          <planeGeometry args={[0.5, 0.66]} />
          <meshStandardMaterial color={i === 1 ? "#c7cfd6" : "#9fb1bd"} />
        </mesh>
      ))}
    </group>
  );
}

export function FallbackMesh() {
  return (
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[0.8, 1, 0.8]} />
      <meshStandardMaterial color="#556" />
    </mesh>
  );
}
