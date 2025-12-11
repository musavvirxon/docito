import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function FloatingIcon({ position, icon, color }: { position: [number, number, number]; icon: string; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.8}>
      <group position={position}>
        <mesh ref={meshRef}>
          <boxGeometry args={[0.5, 0.5, 0.1]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Icon represented as a colored sphere on the box */}
        <mesh position={[0, 0, 0.08]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.4} roughness={0.3} emissive="#ffffff" emissiveIntensity={0.2} />
        </mesh>
      </group>
    </Float>
  );
}

function GlowingOrb() {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.15;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Core orb - solid gradient sphere */}
      <Sphere args={[1, 48, 48]}>
        <meshStandardMaterial
          ref={materialRef}
          color="#3b82f6"
          metalness={0.3}
          roughness={0.4}
          transparent
          opacity={0.9}
        />
      </Sphere>
      
      {/* Inner highlight */}
      <Sphere args={[0.85, 32, 32]}>
        <meshStandardMaterial color="#60a5fa" metalness={0.2} roughness={0.5} transparent opacity={0.4} />
      </Sphere>
      
      {/* Outer glow shell */}
      <Sphere args={[1.15, 32, 32]}>
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.15} side={THREE.BackSide} />
      </Sphere>
    </group>
  );
}

function OrbitingRings() {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = state.clock.elapsedTime * 0.2;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <>
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.6, 0.025, 16, 64]} />
        <meshStandardMaterial color="#60a5fa" metalness={0.8} roughness={0.2} transparent opacity={0.7} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[0, Math.PI / 4, Math.PI / 4]}>
        <torusGeometry args={[1.9, 0.02, 16, 64]} />
        <meshStandardMaterial color="#818cf8" metalness={0.8} roughness={0.2} transparent opacity={0.5} />
      </mesh>
    </>
  );
}

function Particles() {
  const count = 60;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.2 + Math.random() * 1;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.03;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#60a5fa" transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

function Scene() {
  const icons = [
    { position: [2, 0.4, 0.4] as [number, number, number], icon: '🩺', color: '#3b82f6' },
    { position: [-1.8, 0.7, 0.3] as [number, number, number], icon: '🏥', color: '#10b981' },
    { position: [0.4, 1.8, 0.4] as [number, number, number], icon: '🧪', color: '#8b5cf6' },
    { position: [-0.7, -1.6, 0.4] as [number, number, number], icon: '💊', color: '#f59e0b' },
    { position: [1.4, -1.1, 0.6] as [number, number, number], icon: '📋', color: '#ec4899' },
    { position: [-1.6, -0.4, 0.5] as [number, number, number], icon: '🛡️', color: '#06b6d4' },
  ];

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -5, -3]} intensity={0.4} color="#60a5fa" />
      
      <GlowingOrb />
      <OrbitingRings />
      <Particles />
      
      {icons.map((item, i) => (
        <FloatingIcon key={i} {...item} />
      ))}
      
      <OrbitControls 
        enableZoom={false} 
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.3}
        maxPolarAngle={Math.PI / 1.5}
        minPolarAngle={Math.PI / 3}
      />
    </>
  );
}

export default function HeroOrb3D() {
  return (
    <div className="w-full h-[500px] lg:h-[600px]">
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
