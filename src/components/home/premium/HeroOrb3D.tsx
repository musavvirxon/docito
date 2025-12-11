import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sphere, Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function FloatingIcon({ position, icon, color }: { position: [number, number, number]; icon: string; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <group position={position}>
        <mesh ref={meshRef}>
          <boxGeometry args={[0.3, 0.3, 0.05]} />
          <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
        </mesh>
        <Text
          position={[0, 0, 0.03]}
          fontSize={0.15}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {icon}
        </Text>
      </group>
    </Float>
  );
}

function GlowingOrb() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.2;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Core orb */}
      <Sphere args={[1, 64, 64]}>
        <MeshDistortMaterial
          color="#3b82f6"
          attach="material"
          distort={0.3}
          speed={2}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.7}
        />
      </Sphere>
      
      {/* Inner glow */}
      <Sphere args={[0.95, 32, 32]}>
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.3} />
      </Sphere>
      
      {/* Outer glow */}
      <Sphere args={[1.2, 32, 32]}>
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.1} side={THREE.BackSide} />
      </Sphere>
    </group>
  );
}

function OrbitingRings() {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = state.clock.elapsedTime * 0.3;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = state.clock.elapsedTime * 0.2;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.y = state.clock.elapsedTime * 0.4;
    }
  });

  return (
    <>
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.8, 0.02, 16, 100]} />
        <meshStandardMaterial color="#60a5fa" metalness={0.9} roughness={0.1} transparent opacity={0.6} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[0, Math.PI / 4, Math.PI / 4]}>
        <torusGeometry args={[2.2, 0.015, 16, 100]} />
        <meshStandardMaterial color="#818cf8" metalness={0.9} roughness={0.1} transparent opacity={0.4} />
      </mesh>
      <mesh ref={ring3Ref} rotation={[Math.PI / 3, 0, Math.PI / 6]}>
        <torusGeometry args={[2.5, 0.01, 16, 100]} />
        <meshStandardMaterial color="#a78bfa" metalness={0.9} roughness={0.1} transparent opacity={0.3} />
      </mesh>
    </>
  );
}

function Particles() {
  const count = 100;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2.5 + Math.random() * 1.5;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
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
      <pointsMaterial size={0.03} color="#60a5fa" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function Scene() {
  const icons = [
    { position: [2.2, 0.5, 0.5] as [number, number, number], icon: '🩺', color: '#3b82f6' },
    { position: [-2, 0.8, 0.3] as [number, number, number], icon: '🏥', color: '#10b981' },
    { position: [0.5, 2, 0.5] as [number, number, number], icon: '🧪', color: '#8b5cf6' },
    { position: [-0.8, -1.8, 0.5] as [number, number, number], icon: '💊', color: '#f59e0b' },
    { position: [1.5, -1.2, 0.8] as [number, number, number], icon: '📋', color: '#ec4899' },
    { position: [-1.8, -0.5, 0.6] as [number, number, number], icon: '🛡️', color: '#06b6d4' },
  ];

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#60a5fa" />
      
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
        autoRotateSpeed={0.5}
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
        camera={{ position: [0, 0, 6], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
