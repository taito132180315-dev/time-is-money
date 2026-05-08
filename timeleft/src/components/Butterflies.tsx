import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Butterfly({ color, offset, scale = 1, radius = 4, onClick }: { color: string, offset: number, scale?: number, radius?: number, onClick?: () => void }) {
  const parentRef = useRef<THREE.Group>(null);
  const flutterRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Group>(null);
  const rightWingRef = useRef<THREE.Group>(null);

  const speed = 0.3 + (offset % 0.2); // Slightly different speeds
  const flapSpeed = 25;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + offset;

    // Smooth path for the parent group
    if (parentRef.current) {
      // Complex figure-8 / wandering path
      const px = Math.sin(t * speed) * radius + Math.sin(t * speed * 2.1) * (radius * 0.3);
      const py = Math.cos(t * speed * 0.8) * (radius * 0.4) + 1.5 + Math.sin(t * speed * 1.5) * 0.5;
      const pz = Math.cos(t * speed * 1.2) * radius + Math.sin(t * speed * 1.7) * (radius * 0.3);

      // Look slightly ahead on the same path
      const nx = Math.sin((t + 0.05) * speed) * radius + Math.sin((t + 0.05) * speed * 2.1) * (radius * 0.3);
      const ny = Math.cos((t + 0.05) * speed * 0.8) * (radius * 0.4) + 1.5 + Math.sin((t + 0.05) * speed * 1.5) * 0.5;
      const nz = Math.cos((t + 0.05) * speed * 1.2) * radius + Math.sin((t + 0.05) * speed * 1.7) * (radius * 0.3);

      parentRef.current.position.set(px, py, pz);
      parentRef.current.lookAt(nx, ny, nz);
    }

    // Erratic flutter for the child group (simulating butterfly bobbing)
    if (flutterRef.current) {
      flutterRef.current.position.y = Math.sin(t * flapSpeed * 0.5) * 0.05 * scale;
      flutterRef.current.position.x = Math.sin(t * flapSpeed * 0.3) * 0.02 * scale;
    }

    // Flapping wings
    if (leftWingRef.current && rightWingRef.current) {
      const flapAngle = Math.sin(t * flapSpeed) * 0.8 + 0.4; // Flap between 0.4 and 1.2 radians
      leftWingRef.current.rotation.z = flapAngle;
      rightWingRef.current.rotation.z = -flapAngle;
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    onClick?.();
  };

  const hoverProps = onClick ? {
    onPointerEnter: (e: any) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; },
    onPointerLeave: (e: any) => { e.stopPropagation(); document.body.style.cursor = 'auto'; },
  } : {};

  return (
    <group ref={parentRef}>
      {/* 透明な大きいヒットエリア */}
      {onClick && (
        <mesh onClick={handleClick} {...hoverProps}>
          <sphereGeometry args={[1.5, 8, 8]} />
          <meshStandardMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      <group ref={flutterRef}>
        {/* Body — scaled uniformly, stays thin */}
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[scale, scale, scale]} onClick={handleClick} {...hoverProps}>
          <capsuleGeometry args={[0.015, 0.15, 8, 16]} />
          <meshStandardMaterial color="#222222" roughness={0.8} />
        </mesh>

        {/* Right Wing */}
        <group ref={leftWingRef} position={[0.015 * scale, 0, 0]}>
          <mesh position={[0.1 * scale, 0, 0]} scale={[scale, 0.05, 0.8 * scale]} onClick={handleClick} {...hoverProps}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={color} roughness={0.3} side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
          <mesh position={[0.08 * scale, 0, -0.1 * scale]} scale={[scale, 0.05, 0.8 * scale]} onClick={handleClick} {...hoverProps}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color={color} roughness={0.3} side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
        </group>

        {/* Left Wing */}
        <group ref={rightWingRef} position={[-0.015 * scale, 0, 0]}>
          <mesh position={[-0.1 * scale, 0, 0]} scale={[scale, 0.05, 0.8 * scale]} onClick={handleClick} {...hoverProps}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={color} roughness={0.3} side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
          <mesh position={[-0.08 * scale, 0, -0.1 * scale]} scale={[scale, 0.05, 0.8 * scale]} onClick={handleClick} {...hoverProps}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color={color} roughness={0.3} side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function Butterflies({ count = 5, onButterflyClick }: { count?: number; onButterflyClick?: () => void }) {
  const butterflies = useMemo(() => {
    // Magical, vibrant colors
    const colors = ['#60A5FA', '#A855F7', '#F472B6', '#34D399', '#FBBF24'];
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      color: colors[i % colors.length],
      offset: Math.random() * 100,
      scale: 3.0 + Math.random() * 2.0,
      radius: 12 + Math.random() * 5,
    }));
  }, [count]);

  return (
    <group>
      {butterflies.map((b) => (
        <Butterfly key={b.id} color={b.color} offset={b.offset} scale={b.scale} radius={b.radius} onClick={onButterflyClick} />
      ))}
    </group>
  );
}
