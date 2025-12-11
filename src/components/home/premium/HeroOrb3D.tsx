import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Stethoscope, Building2, FlaskConical, Pill, FileText, Shield } from 'lucide-react';

// Mouse parallax hook
function useMouseParallax() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  return mouse;
}

// Scroll opacity hook
function useScrollOpacity() {
  const [opacity, setOpacity] = useState(1);
  
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const newOpacity = Math.max(0.3, 1 - scrollY / 600);
      setOpacity(newOpacity);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return opacity;
}

function FloatingIconCard({ 
  position, 
  Icon, 
  color, 
  bgColor,
  rotationOffset,
  orbitSpeed 
}: { 
  position: [number, number, number]; 
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  bgColor: string;
  rotationOffset: number;
  orbitSpeed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const borderRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Orbit around the center
      const time = state.clock.elapsedTime * orbitSpeed + rotationOffset;
      const radius = Math.sqrt(position[0] ** 2 + position[2] ** 2);
      groupRef.current.position.x = Math.cos(time) * radius;
      groupRef.current.position.z = Math.sin(time) * radius;
      groupRef.current.position.y = position[1] + Math.sin(time * 2) * 0.15;
    }
    if (borderRef.current) {
      // Rotate the border
      borderRef.current.rotation.z = state.clock.elapsedTime * 0.5 + rotationOffset;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.5}>
      <group position={position} ref={groupRef}>
        {/* Rotating rectangular border */}
        <mesh ref={borderRef} rotation={[0, 0, 0]}>
          <ringGeometry args={[0.42, 0.48, 4]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
        
        {/* Icon container */}
        <Html
          transform
          distanceFactor={8}
          style={{
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            background: bgColor,
            backdropFilter: 'blur(8px)',
            boxShadow: `0 4px 20px ${color}40`,
            border: `1px solid ${color}30`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </Html>
      </group>
    </Float>
  );
}

function EarthSphere({ mouse, opacity }: { mouse: { x: number; y: number }; opacity: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const earthRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  
  // Create Earth-like texture with continents
  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Ocean base - deep blue
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, 256);
    oceanGradient.addColorStop(0, '#1e3a5f');
    oceanGradient.addColorStop(0.5, '#0c4a6e');
    oceanGradient.addColorStop(1, '#164e63');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, 512, 256);
    
    // Draw continents with subtle green/brown tones
    ctx.fillStyle = '#2d5a3d';
    
    // North America
    ctx.beginPath();
    ctx.ellipse(100, 70, 50, 35, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // South America
    ctx.beginPath();
    ctx.ellipse(130, 160, 25, 45, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Europe/Africa
    ctx.beginPath();
    ctx.ellipse(270, 90, 30, 40, 0, 0, Math.PI * 2);
    ctx.ellipse(270, 150, 35, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Asia
    ctx.beginPath();
    ctx.ellipse(370, 80, 60, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Australia
    ctx.beginPath();
    ctx.ellipse(420, 170, 25, 20, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Add some variation
    ctx.fillStyle = '#3d6b4d';
    ctx.beginPath();
    ctx.ellipse(95, 65, 30, 20, 0, 0, Math.PI * 2);
    ctx.ellipse(365, 75, 35, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Ice caps
    ctx.fillStyle = '#e8f4f8';
    ctx.fillRect(0, 0, 512, 15);
    ctx.fillRect(0, 241, 512, 15);
    
    // Cloud wisps
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * 512,
        Math.random() * 256,
        Math.random() * 40 + 20,
        Math.random() * 10 + 5,
        Math.random() * Math.PI,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      // Soft rotation
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.08;
      
      // Parallax effect
      groupRef.current.rotation.x = mouse.y * 0.1;
      groupRef.current.position.x = mouse.x * 0.2;
      groupRef.current.position.y = -mouse.y * 0.1;
    }
    if (earthRef.current) {
      earthRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y = -state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Earth core */}
      <Sphere ref={earthRef} args={[1, 64, 64]}>
        <meshStandardMaterial
          map={earthTexture}
          metalness={0.1}
          roughness={0.8}
          transparent
          opacity={opacity}
        />
      </Sphere>
      
      {/* Atmosphere glow */}
      <Sphere ref={atmosphereRef} args={[1.05, 48, 48]}>
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.15 * opacity}
          side={THREE.BackSide}
        />
      </Sphere>
      
      {/* Outer glow */}
      <Sphere args={[1.15, 32, 32]}>
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.08 * opacity}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}

function LightBeams({ opacity }: { opacity: number }) {
  const beamsRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (beamsRef.current) {
      beamsRef.current.rotation.z = state.clock.elapsedTime * 0.1;
      beamsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  const beams = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      rotation: (i / 6) * Math.PI * 2,
      length: 2 + Math.random() * 0.5,
      opacity: 0.1 + Math.random() * 0.1
    }));
  }, []);

  return (
    <group ref={beamsRef}>
      {beams.map((beam, i) => (
        <mesh key={i} rotation={[0, 0, beam.rotation]} position={[0, 0, 0]}>
          <planeGeometry args={[0.02, beam.length]} />
          <meshBasicMaterial
            color="#60a5fa"
            transparent
            opacity={beam.opacity * opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function Particles({ opacity }: { opacity: number }) {
  const count = 50;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + Math.random() * 1;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
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
      <pointsMaterial 
        size={0.03} 
        color="#60a5fa" 
        transparent 
        opacity={0.6 * opacity} 
        sizeAttenuation 
      />
    </points>
  );
}

function Scene({ mouse, opacity }: { mouse: { x: number; y: number }; opacity: number }) {
  const icons = [
    { position: [2.2, 0.3, 0.3] as [number, number, number], Icon: Stethoscope, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)', rotationOffset: 0, orbitSpeed: 0.3 },
    { position: [-2, 0.5, 0.2] as [number, number, number], Icon: Building2, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)', rotationOffset: Math.PI / 3, orbitSpeed: 0.25 },
    { position: [0.3, 2, 0.3] as [number, number, number], Icon: FlaskConical, color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)', rotationOffset: Math.PI * 2 / 3, orbitSpeed: 0.35 },
    { position: [-0.5, -1.8, 0.3] as [number, number, number], Icon: Pill, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)', rotationOffset: Math.PI, orbitSpeed: 0.28 },
    { position: [1.5, -1.1, 0.5] as [number, number, number], Icon: FileText, color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.15)', rotationOffset: Math.PI * 4 / 3, orbitSpeed: 0.32 },
    { position: [-1.7, -0.4, 0.4] as [number, number, number], Icon: Shield, color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.15)', rotationOffset: Math.PI * 5 / 3, orbitSpeed: 0.27 },
  ];

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.7} />
      <pointLight position={[-5, -5, -3]} intensity={0.3} color="#60a5fa" />
      <pointLight position={[3, 3, 3]} intensity={0.2} color="#ffffff" />
      
      <EarthSphere mouse={mouse} opacity={opacity} />
      <LightBeams opacity={opacity} />
      <Particles opacity={opacity} />
      
      {icons.map((item, i) => (
        <FloatingIconCard key={i} {...item} />
      ))}
    </>
  );
}

export default function HeroOrb3D() {
  const mouse = useMouseParallax();
  const opacity = useScrollOpacity();

  return (
    <div className="w-full h-[500px] lg:h-[600px]" style={{ opacity }}>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <Scene mouse={mouse} opacity={opacity} />
      </Canvas>
    </div>
  );
}
