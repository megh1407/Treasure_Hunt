/**
 * Library-specific 3D object meshes (Bookshelves, Books).
 */

export function BookshelfMesh() {
  return (
    <group>
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[0.7, 2.8, 3.4]} />
        <meshStandardMaterial color="#4a3a2c" />
      </mesh>
      {[0.6, 1.3, 2.0, 2.6].map((y) => (
        <mesh key={y} position={[0.12, y, 0]}>
          <boxGeometry args={[0.5, 0.34, 3.1]} />
          <meshStandardMaterial color="#8a6a4d" />
        </mesh>
      ))}
    </group>
  );
}

export function BookMesh() {
  return (
    <group>
      <mesh position={[0, 0.78, 0]} rotation={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.42, 0.1, 0.32]} />
        <meshStandardMaterial color="#7a3f34" />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.72, 6]} />
        <meshStandardMaterial color="#3a2f26" />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[1.1, 0.08, 0.7]} />
        <meshStandardMaterial color="#5b4634" />
      </mesh>
    </group>
  );
}
