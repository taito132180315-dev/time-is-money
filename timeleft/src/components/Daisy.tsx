import React, { useMemo } from 'react';
import * as THREE from 'three';

export function Daisy() {
  const totalFlorets = 400;
  const maxRadius = 0.55;
  // Golden angle for Fibonacci spiral
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  // Generate the center disk florets
  const florets = useMemo(() => {
    return Array.from({ length: totalFlorets }).map((_, i) => {
      const theta = i * goldenAngle;
      const r = maxRadius * Math.sqrt(i / totalFlorets);
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      // Create a slight dome shape for the center
      const y = 0.2 + Math.sqrt(Math.max(0, maxRadius ** 2 - r ** 2)) * 0.3;

      // Outer florets are slightly darker/orange, inner are yellow
      const color = new THREE.Color().lerpColors(
        new THREE.Color("#FFC107"), // Inner yellow
        new THREE.Color("#FF8F00"), // Outer orange
        r / maxRadius
      );

      return (
        <mesh key={`floret-${i}`} position={[x, y, z]} scale={[0.035, 0.035, 0.035]}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      );
    });
  }, []);

  // Generate the 60 petals
  const numPetals = 60;
  const petals = useMemo(() => {
    return Array.from({ length: numPetals }).map((_, i) => {
      const angle = (i / numPetals) * Math.PI * 2;
      // Distribute into 3 layers for a natural, full look
      const layer = i % 3;
      const tilt = (layer - 1) * 0.08;
      const yOffset = (layer - 1) * 0.02;
      
      // Add slight randomness to make it look organic
      const randomTilt = (Math.random() - 0.5) * 0.04;
      const randomAngle = angle + (Math.random() - 0.5) * 0.02;

      return (
        <group key={`petal-${i}`} rotation={[0, randomAngle, 0]}>
          <mesh
            position={[1.1, yOffset, 0]}
            rotation={[0, 0, tilt + randomTilt]}
            scale={[0.7, 0.025, 0.11]}
          >
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
          </mesh>
        </group>
      );
    });
  }, []);

  return (
    <group>
      {/* Center Base */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.2, 32]} />
        <meshStandardMaterial color="#FFB300" roughness={0.9} />
      </mesh>

      {/* Receptacle (Green base under the flower) */}
      <mesh position={[0, -0.05, 0]} scale={[1, 0.3, 1]}>
        <sphereGeometry args={[0.6, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#4CAF50" roughness={0.9} />
      </mesh>

      {/* Stem */}
      <mesh position={[0, -2.0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 4, 16]} />
        <meshStandardMaterial color="#4CAF50" roughness={0.9} />
      </mesh>

      {/* Florets (The textured center) */}
      <group>{florets}</group>

      {/* Petals (60 petals) */}
      <group>{petals}</group>
    </group>
  );
}
