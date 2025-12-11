import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, OrbitControls, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Building2, 
  Stethoscope, 
  FlaskConical, 
  Pill, 
  Users,
  Heart,
  type LucideIcon
} from 'lucide-react';

// Node data interface
interface NodeData {
  id: string;
  name: string;
  role: string;
  description: string;
  Icon: LucideIcon;
  color: string;
  position: THREE.Vector3;
  orbitRadius: number;
  orbitSpeed: number;
  orbitOffset: number;
  verticalOffset: number;
}

// Medical ecosystem nodes - 6 key nodes evenly spaced
const medicalNodes: Omit<NodeData, 'position'>[] = [
  { id: 'hospital', name: 'Hospital', role: 'Healthcare Center', description: 'Multi-specialty healthcare center', Icon: Building2, color: '#3b82f6', orbitRadius: 2.4, orbitSpeed: 0.08, orbitOffset: 0, verticalOffset: 0.6 },
  { id: 'clinic', name: 'Clinic', role: 'Primary Care', description: 'Primary care facility', Icon: Heart, color: '#ec4899', orbitRadius: 2.4, orbitSpeed: 0.08, orbitOffset: Math.PI / 3, verticalOffset: -0.5 },
  { id: 'lab', name: 'Laboratory', role: 'Diagnostics', description: 'Advanced diagnostic testing', Icon: FlaskConical, color: '#8b5cf6', orbitRadius: 2.4, orbitSpeed: 0.08, orbitOffset: Math.PI * 2 / 3, verticalOffset: 0.4 },
  { id: 'pharmacy', name: 'Pharmacy', role: 'Medications', description: '24/7 medication services', Icon: Pill, color: '#10b981', orbitRadius: 2.4, orbitSpeed: 0.08, orbitOffset: Math.PI, verticalOffset: -0.6 },
  { id: 'doctor', name: 'Doctors', role: 'Specialists', description: 'Medical specialists', Icon: Stethoscope, color: '#06b6d4', orbitRadius: 2.4, orbitSpeed: 0.08, orbitOffset: Math.PI * 4 / 3, verticalOffset: 0.5 },
  { id: 'patient', name: 'Patients', role: 'Care Recipients', description: 'Connected health monitoring', Icon: Users, color: '#f59e0b', orbitRadius: 2.4, orbitSpeed: 0.08, orbitOffset: Math.PI * 5 / 3, verticalOffset: -0.4 },
];

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

// Earth-like Globe
function EarthGlobe({ opacity }: { opacity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  
  // Create Earth texture with continents
  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Ocean base - vibrant blue
    const oceanGradient = ctx.createRadialGradient(512, 256, 0, 512, 256, 512);
    oceanGradient.addColorStop(0, '#1e88e5');
    oceanGradient.addColorStop(0.5, '#1565c0');
    oceanGradient.addColorStop(1, '#0d47a1');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, 1024, 512);
    
    // Add ocean depth variations
    ctx.fillStyle = 'rgba(13, 71, 161, 0.3)';
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.random() * 1024, Math.random() * 512, Math.random() * 80 + 40, Math.random() * 40 + 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Continent colors
    const landGreen = '#2e7d32';
    const landLight = '#4caf50';
    const desertColor = '#c9a227';
    const mountainColor = '#5d4037';
    
    // North America
    ctx.fillStyle = landGreen;
    ctx.beginPath();
    ctx.moveTo(120, 80);
    ctx.bezierCurveTo(180, 60, 260, 80, 280, 140);
    ctx.bezierCurveTo(290, 180, 260, 220, 200, 240);
    ctx.bezierCurveTo(140, 260, 100, 220, 90, 180);
    ctx.bezierCurveTo(80, 140, 100, 100, 120, 80);
    ctx.fill();
    
    ctx.fillStyle = landLight;
    ctx.beginPath();
    ctx.ellipse(200, 150, 50, 35, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Central America
    ctx.fillStyle = landGreen;
    ctx.beginPath();
    ctx.ellipse(230, 260, 25, 40, 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // South America
    ctx.beginPath();
    ctx.moveTo(260, 290);
    ctx.bezierCurveTo(300, 300, 320, 360, 300, 420);
    ctx.bezierCurveTo(280, 460, 240, 450, 230, 400);
    ctx.bezierCurveTo(220, 350, 240, 310, 260, 290);
    ctx.fill();
    
    ctx.fillStyle = landLight;
    ctx.beginPath();
    ctx.ellipse(270, 330, 25, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Europe
    ctx.fillStyle = landGreen;
    ctx.beginPath();
    ctx.ellipse(520, 120, 60, 40, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(560, 140, 40, 25, 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Africa
    ctx.beginPath();
    ctx.moveTo(480, 180);
    ctx.bezierCurveTo(540, 170, 580, 200, 580, 280);
    ctx.bezierCurveTo(580, 360, 540, 400, 500, 400);
    ctx.bezierCurveTo(460, 400, 440, 340, 450, 280);
    ctx.bezierCurveTo(455, 220, 470, 190, 480, 180);
    ctx.fill();
    
    // Sahara desert
    ctx.fillStyle = desertColor;
    ctx.beginPath();
    ctx.ellipse(520, 220, 50, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Asia
    ctx.fillStyle = landGreen;
    ctx.beginPath();
    ctx.moveTo(600, 80);
    ctx.bezierCurveTo(700, 60, 820, 80, 860, 140);
    ctx.bezierCurveTo(880, 180, 860, 240, 780, 260);
    ctx.bezierCurveTo(700, 280, 640, 260, 620, 220);
    ctx.bezierCurveTo(590, 160, 580, 100, 600, 80);
    ctx.fill();
    
    // India
    ctx.beginPath();
    ctx.ellipse(700, 280, 35, 50, 0.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Southeast Asia
    ctx.beginPath();
    ctx.ellipse(780, 290, 40, 35, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Middle East desert
    ctx.fillStyle = desertColor;
    ctx.beginPath();
    ctx.ellipse(620, 200, 35, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Siberia mountains
    ctx.fillStyle = mountainColor;
    ctx.beginPath();
    ctx.ellipse(740, 100, 60, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Australia
    ctx.fillStyle = desertColor;
    ctx.beginPath();
    ctx.ellipse(820, 360, 55, 40, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = landGreen;
    ctx.beginPath();
    ctx.ellipse(800, 380, 20, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(850, 350, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Antarctica
    ctx.fillStyle = '#eceff1';
    ctx.beginPath();
    ctx.ellipse(512, 490, 300, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Arctic ice
    ctx.beginPath();
    ctx.ellipse(512, 20, 200, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  // Create cloud texture
  const cloudTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, 512, 256);
    
    // Cloud patterns - more realistic wispy clouds
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.random() * 30 + 15);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(x, y, Math.random() * 40 + 20, Math.random() * 20 + 10, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y = time * 0.08;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = time * 0.1;
    }
    if (atmosphereRef.current) {
      const pulse = 1 + Math.sin(time * 2) * 0.015;
      atmosphereRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      {/* Earth core */}
      <Sphere ref={meshRef} args={[1, 64, 64]}>
        <meshPhongMaterial
          map={earthTexture}
          shininess={15}
          specular={new THREE.Color('#4fc3f7')}
          transparent
          opacity={opacity}
        />
      </Sphere>
      
      {/* Cloud layer */}
      <Sphere ref={cloudsRef} args={[1.015, 48, 48]}>
        <meshBasicMaterial
          map={cloudTexture}
          transparent
          opacity={0.4 * opacity}
          depthWrite={false}
        />
      </Sphere>
      
      {/* Inner atmosphere glow - cyan tint */}
      <Sphere ref={atmosphereRef} args={[1.05, 32, 32]}>
        <meshBasicMaterial
          color="#4fc3f7"
          transparent
          opacity={0.12 * opacity}
          side={THREE.BackSide}
        />
      </Sphere>
      
      {/* Outer atmosphere - blue glow */}
      <Sphere args={[1.12, 32, 32]}>
        <meshBasicMaterial
          color="#29b6f6"
          transparent
          opacity={0.08 * opacity}
          side={THREE.BackSide}
        />
      </Sphere>
      
      {/* Far atmosphere haze */}
      <Sphere args={[1.25, 32, 32]}>
        <meshBasicMaterial
          color="#03a9f4"
          transparent
          opacity={0.04 * opacity}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}

// Connection line from node to center
function ConnectionLine({ nodePosition, color, opacity }: { nodePosition: THREE.Vector3; color: string; opacity: number }) {
  const points = useMemo(() => {
    return [new THREE.Vector3(0, 0, 0), nodePosition];
  }, [nodePosition]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={1}
      transparent
      opacity={opacity}
    />
  );
}

// Floating Node Component
function FloatingNode({ 
  node, 
  opacity,
  onHover,
  onUnhover,
  onClick,
  isHovered,
  globeRef
}: { 
  node: NodeData;
  opacity: number;
  onHover: () => void;
  onUnhover: () => void;
  onClick: () => void;
  isHovered: boolean;
  globeRef: React.RefObject<THREE.Mesh>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [localHover, setLocalHover] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(new THREE.Vector3(node.orbitRadius, node.verticalOffset, 0));
  const [isVisible, setIsVisible] = useState(true);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (groupRef.current) {
      // Orbit animation
      const angle = time * node.orbitSpeed + node.orbitOffset;
      const x = Math.cos(angle) * node.orbitRadius;
      const z = Math.sin(angle) * node.orbitRadius;
      const y = node.verticalOffset + Math.sin(time * 0.5 + node.orbitOffset) * 0.15;
      
      groupRef.current.position.x = x;
      groupRef.current.position.z = z;
      groupRef.current.position.y = y;
      
      setCurrentPosition(new THREE.Vector3(x, y, z));
      
      // Check if node is behind the globe (z < 0 means behind from default camera view)
      // We check relative to camera position
      const cameraPos = state.camera.position;
      const nodeWorldPos = new THREE.Vector3(x, y, z);
      const toCamera = cameraPos.clone().sub(nodeWorldPos).normalize();
      const toCenter = new THREE.Vector3(0, 0, 0).sub(nodeWorldPos).normalize();
      const dot = toCamera.dot(toCenter);
      
      // If dot product is positive and node is close to center line, it's behind
      const distToCenter = Math.sqrt(x * x + z * z);
      const isBehind = z < -0.3 && distToCenter < 2;
      setIsVisible(!isBehind);
      
      // Scale on hover
      const targetScale = isHovered || localHover ? 1.2 : 1;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
    if (glowRef.current) {
      // Pulse glow
      const pulseScale = 1 + Math.sin(time * 3) * 0.1;
      glowRef.current.scale.setScalar(pulseScale);
    }
  });

  const handlePointerEnter = useCallback(() => {
    if (!isVisible) return;
    setLocalHover(true);
    onHover();
    document.body.style.cursor = 'pointer';
  }, [onHover, isVisible]);

  const handlePointerLeave = useCallback(() => {
    setLocalHover(false);
    onUnhover();
    document.body.style.cursor = 'auto';
  }, [onUnhover]);

  const IconComponent = node.Icon;

  return (
    <>
      {/* Connection line - only show when visible */}
      {isVisible && (
        <ConnectionLine nodePosition={currentPosition} color={node.color} opacity={opacity * 0.2} />
      )}
      
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
        <group 
          ref={groupRef} 
          position={[node.orbitRadius, node.verticalOffset, 0]}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onClick={() => isVisible && onClick()}
        >
          {/* Glow effect - fade when behind */}
          <Sphere ref={glowRef} args={[0.35, 16, 16]}>
            <meshBasicMaterial
              color={node.color}
              transparent
              opacity={(isHovered || localHover ? 0.5 : 0.25) * opacity * (isVisible ? 1 : 0.1)}
            />
          </Sphere>
          
          {/* Node sphere - fade when behind */}
          <Sphere args={[0.24, 24, 24]}>
            <meshPhysicalMaterial
              color={node.color}
              metalness={0.3}
              roughness={0.2}
              transparent
              opacity={0.9 * opacity * (isVisible ? 1 : 0.1)}
              emissive={node.color}
              emissiveIntensity={isHovered || localHover ? 0.5 : 0.2}
            />
          </Sphere>
          
          {/* Icon - only show when in front */}
          {isVisible && (
            <Html
              transform
              distanceFactor={4.5}
              style={{
                pointerEvents: 'none',
              }}
            >
              <div 
                className="flex items-center justify-center w-11 h-11 rounded-full"
                style={{ 
                  backgroundColor: `${node.color}30`,
                  border: `2px solid ${node.color}60`,
                  boxShadow: `0 0 20px ${node.color}80`
                }}
              >
                <IconComponent size={20} style={{ color: node.color }} />
              </div>
            </Html>
          )}
          
          {/* Tooltip on hover - only when visible */}
          {isVisible && (isHovered || localHover) && (
            <Html
              position={[0, 0.5, 0]}
              center
              style={{
                pointerEvents: 'none',
              }}
            >
              <div 
                className="px-3 py-2 rounded-lg backdrop-blur-md animate-fade-in"
                style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: `1px solid ${node.color}40`,
                  boxShadow: `0 4px 20px ${node.color}30`,
                  minWidth: '120px',
                }}
              >
                <div className="text-xs font-semibold text-white">{node.name}</div>
                <div className="text-[10px] opacity-70 text-slate-300">{node.role}</div>
              </div>
            </Html>
          )}
        </group>
      </Float>
    </>
  );
}

// Particle system for holographic effect
function HolographicParticles({ opacity }: { opacity: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 100;
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.9 + Math.random() * 0.2;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial 
        size={0.02} 
        color="#60a5fa" 
        transparent 
        opacity={0.5 * opacity} 
        sizeAttenuation 
      />
    </points>
  );
}

// Orbiting rings
function OrbitRings({ opacity }: { opacity: number }) {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = Math.PI / 2 + Math.sin(time * 0.3) * 0.1;
      ring1Ref.current.rotation.z = time * 0.1;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = Math.PI / 3;
      ring2Ref.current.rotation.z = -time * 0.08;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x = Math.PI / 4;
      ring3Ref.current.rotation.y = time * 0.12;
    }
  });

  return (
    <group>
      <mesh ref={ring1Ref}>
        <ringGeometry args={[1.8, 1.82, 64]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.2 * opacity} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2Ref}>
        <ringGeometry args={[2.1, 2.12, 64]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.15 * opacity} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring3Ref}>
        <ringGeometry args={[2.5, 2.52, 64]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.1 * opacity} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Main Scene
function Scene({ 
  opacity,
  hoveredNode,
  setHoveredNode,
  setSelectedNode
}: { 
  opacity: number;
  hoveredNode: string | null;
  setHoveredNode: (id: string | null) => void;
  setSelectedNode: (node: NodeData | null) => void;
}) {
  // Create nodes with initial positions
  const nodes = useMemo<NodeData[]>(() => {
    return medicalNodes.map(node => ({
      ...node,
      position: new THREE.Vector3(node.orbitRadius, node.verticalOffset, 0)
    }));
  }, []);

  return (
    <>
      {/* Lighting - Sun-like directional light */}
      <ambientLight intensity={0.3} color="#e3f2fd" />
      <directionalLight 
        position={[5, 3, 4]} 
        intensity={1.5} 
        color="#fff8e1"
        castShadow
      />
      <directionalLight 
        position={[-3, -1, -2]} 
        intensity={0.2} 
        color="#1565c0"
      />
      <pointLight position={[0, 0, 3]} intensity={0.3} color="#ffffff" />
      <hemisphereLight args={['#87ceeb', '#1565c0', 0.3]} />
      
      {/* Earth Globe */}
      <EarthGlobe opacity={opacity} />
      
      {/* Orbit rings */}
      <OrbitRings opacity={opacity} />
      
      {/* Particles inside orb */}
      <HolographicParticles opacity={opacity} />
      
      {/* Medical nodes */}
      {nodes.map((node) => (
        <FloatingNode
          key={node.id}
          node={node}
          opacity={opacity}
          onHover={() => setHoveredNode(node.id)}
          onUnhover={() => setHoveredNode(null)}
          onClick={() => setSelectedNode(node)}
          isHovered={hoveredNode === node.id}
          globeRef={null as any}
        />
      ))}
      
      {/* Orbit controls for drag/rotate */}
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={5}
        maxDistance={10}
        autoRotate
        autoRotateSpeed={0.3}
        enableDamping
        dampingFactor={0.05}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI * 3 / 4}
      />
    </>
  );
}

// Modal for selected node
function NodeModal({ 
  node, 
  onClose 
}: { 
  node: NodeData | null; 
  onClose: () => void;
}) {
  if (!node) return null;
  
  const IconComponent = node.Icon;
  
  return (
    <div 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="p-6 rounded-2xl backdrop-blur-xl min-w-[280px]"
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: `2px solid ${node.color}40`,
          boxShadow: `0 0 40px ${node.color}30, 0 20px 60px rgba(0,0,0,0.5)`,
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ 
              background: `${node.color}20`,
              border: `1px solid ${node.color}40`
            }}
          >
            <IconComponent size={24} style={{ color: node.color }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{node.name}</h3>
            <p className="text-sm opacity-70 text-slate-300">{node.role}</p>
          </div>
        </div>
        
        <p className="text-sm text-slate-400 mb-4">{node.description}</p>
        
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: `${node.color}20`,
              border: `1px solid ${node.color}40`,
              color: node.color,
            }}
          >
            Close
          </button>
          <button
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
            style={{
              background: node.color,
            }}
          >
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}

// Main component
export default function HeroOrb3D() {
  const opacity = useScrollOpacity();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

  return (
    <div 
      className="relative w-full h-[500px] lg:h-[600px]" 
      style={{ opacity }}
      onClick={() => setSelectedNode(null)}
    >
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <Scene 
          opacity={opacity}
          hoveredNode={hoveredNode}
          setHoveredNode={setHoveredNode}
          setSelectedNode={setSelectedNode}
        />
      </Canvas>
      
      {/* Node detail modal */}
      <NodeModal node={selectedNode} onClose={() => setSelectedNode(null)} />
      
      {/* Instructions hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <p className="text-xs text-slate-400 opacity-60">
          Drag to rotate • Scroll to zoom • Click nodes for details
        </p>
      </div>
    </div>
  );
}
