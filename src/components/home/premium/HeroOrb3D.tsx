import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Float, Sphere, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Stethoscope, Building2, FlaskConical, Pill, FileText, Shield } from 'lucide-react';

function FloatingIconCard({ position, Icon, color, bgColor }: { 
  position: [number, number, number]; 
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  bgColor: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.8}>
      <group position={position} ref={groupRef}>
        <Html
          transform
          distanceFactor={8}
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            background: bgColor,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </Html>
      </group>
    </Float>
  );
}

function GlowingOrb() {
  const groupRef = useRef<THREE.Group>(null);
  
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
    { position: [2.2, 0.4, 0.4] as [number, number, number], Icon: Stethoscope, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
    { position: [-2, 0.7, 0.3] as [number, number, number], Icon: Building2, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)' },
    { position: [0.4, 2, 0.4] as [number, number, number], Icon: FlaskConical, color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)' },
    { position: [-0.7, -1.8, 0.4] as [number, number, number], Icon: Pill, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
    { position: [1.6, -1.2, 0.6] as [number, number, number], Icon: FileText, color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.15)' },
    { position: [-1.8, -0.5, 0.5] as [number, number, number], Icon: Shield, color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.15)' },
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
        <FloatingIconCard key={i} {...item} />
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
