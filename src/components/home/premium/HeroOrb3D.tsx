// src/components/home/premium/HeroOrb3D.tsx
// Path: src/components/home/premium/HeroOrb3D.tsx
import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree, invalidate } from '@react-three/fiber';
import { OrbitControls, Html, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Building2, 
  Stethoscope, 
  FlaskConical, 
  Pill, 
  Users,
  ScanLine,
  Heart,
  type LucideIcon
} from 'lucide-react';

// Types
type MedicalNode = {
  id: string;
  name: string;
  role: string;
  description: string;
  Icon: LucideIcon;
  color: string;
  orbitRadius: number;
  orbitSpeed: number;
  orbitOffset: number;
  verticalOffset: number;
};

type NodeData = MedicalNode & {
  position: THREE.Vector3;
};

type ConnectionLineProps = {
  nodePosition: THREE.Vector3;
  color: string;
  opacity: number;
};

// Medical ecosystem nodes - 7 nodes evenly spaced
const ORBIT_STEP = (Math.PI * 2) / 7;
const medicalNodes: Omit<NodeData, 'position'>[] = [
  {
    id: 'hospital',
    name: 'Hospital',
    role: 'Care Hub',
    description: 'Coordinate inpatient and emergency care with unified records',
    Icon: Building2,
    color: '#3b82f6', // blue
    orbitRadius: 2.8,
    orbitSpeed: 0.2,
    orbitOffset: 0,
    verticalOffset: 0.8,
  },
  {
    id: 'clinic',
    name: 'Clinic',
    role: 'Primary Care',
    description: 'Streamline appointments, records, and patient follow-ups',
    Icon: Heart,
    color: '#10b981', // emerald
    orbitRadius: 2.6,
    orbitSpeed: 0.25,
    orbitOffset: ORBIT_STEP,
    verticalOffset: -0.2,
  },
  {
    id: 'lab',
    name: 'Laboratory',
    role: 'Diagnostics',
    description: 'Fast test ordering and results sharing across providers',
    Icon: FlaskConical,
    color: '#8b5cf6', // purple
    orbitRadius: 2.4,
    orbitSpeed: 0.3,
    orbitOffset: ORBIT_STEP * 2,
    verticalOffset: 0.4,
  },
  {
    id: 'imaging',
    name: 'Imaging',
    role: 'Radiology',
    description: 'Orders, scheduling, and reports for MRI, CT, X-ray, and ultrasound',
    Icon: ScanLine,
    color: '#06b6d4', // cyan
    orbitRadius: 2.2,
    orbitSpeed: 0.28,
    orbitOffset: ORBIT_STEP * 3,
    verticalOffset: -0.75,
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    role: 'Medications',
    description: 'Digital prescriptions sent directly to the right pharmacy',
    Icon: Pill,
    color: '#f59e0b', // amber
    orbitRadius: 2.5,
    orbitSpeed: 0.22,
    orbitOffset: ORBIT_STEP * 4,
    verticalOffset: -0.6,
  },
  {
    id: 'doctor',
    name: 'Doctor',
    role: 'Specialist',
    description: 'Connect specialists for coordinated care and referrals',
    Icon: Stethoscope,
    color: '#ef4444', // red
    orbitRadius: 2.7,
    orbitSpeed: 0.18,
    orbitOffset: ORBIT_STEP * 5,
    verticalOffset: 0.1,
  },
  {
    id: 'patient',
    name: 'Patient',
    role: 'Care Recipient',
    description: 'Book appointments and access records in one place',
    Icon: Users,
    color: '#ec4899', // pink
    orbitRadius: 2.3,
    orbitSpeed: 0.35,
    orbitOffset: ORBIT_STEP * 6,
    verticalOffset: -1.0,
  },
];

// Custom hook for scroll-based opacity (prevents LCP issues by not animating initially)
function useScrollOpacity() {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const heroHeight = window.innerHeight;
      const fadeStart = heroHeight * 0.4;
      const fadeEnd = heroHeight * 0.8;

      if (scrollPosition < fadeStart) {
        setOpacity(1);
      } else if (scrollPosition > fadeEnd) {
        setOpacity(0);
      } else {
        const fadeProgress = (scrollPosition - fadeStart) / (fadeEnd - fadeStart);
        setOpacity(1 - fadeProgress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return opacity;
}

// Custom hook for page visibility
function useTabVisibility() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isVisible;
}

// Custom hook to detect mobile devices
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
}

// Frame invalidator component for performance
function FrameInvalidator({ isTabVisible }: { isTabVisible: boolean }) {
  const { invalidate: invalidateFrame } = useThree();
  
  useFrame(() => {
    if (isTabVisible) {
      invalidateFrame();
    }
  });
  
  return null;
}

// Connection line component
function ConnectionLine({ nodePosition, color, opacity }: ConnectionLineProps) {
  const points = useMemo(() => {
    return [
      new THREE.Vector3(0, 0, 0),
      nodePosition.clone()
    ];
  }, [nodePosition]);

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </line>
  );
}

// Earth globe component
function EarthGlobe({ opacity, isMobile }: { opacity: number; isMobile: boolean }) {
  const globeRef = useRef<THREE.Mesh>(null);
  
  // Create earth texture with canvas
  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background - ocean
    ctx.fillStyle = '#1e40af';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add gradient for depth
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1e3a8a');
    gradient.addColorStop(0.5, '#2563eb');
    gradient.addColorStop(1, '#1e40af');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw simplified continents
    ctx.fillStyle = '#10b981';
    ctx.globalAlpha = 0.7;

    // North America
    ctx.beginPath();
    ctx.ellipse(120, 80, 60, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    // South America
    ctx.beginPath();
    ctx.ellipse(140, 150, 30, 50, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Europe/Africa
    ctx.beginPath();
    ctx.ellipse(280, 90, 50, 60, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Asia
    ctx.beginPath();
    ctx.ellipse(380, 70, 80, 50, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // India
    ctx.beginPath();
    ctx.ellipse(340, 130, 25, 35, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Australia
    ctx.beginPath();
    ctx.ellipse(420, 180, 40, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Add grid lines
    ctx.strokeStyle = '#60a5fa';
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;

    // Latitude lines
    for (let i = 1; i < 6; i++) {
      const y = (canvas.height / 6) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Longitude lines
    for (let i = 1; i < 12; i++) {
      const x = (canvas.width / 12) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  useFrame((state) => {
    // Reduce animation on mobile for better performance
    if (globeRef.current) {
      const rotationSpeed = isMobile ? 0.01 : 0.03;
      globeRef.current.rotation.y = state.clock.elapsedTime * rotationSpeed;
      globeRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
    }
    
    // Update texture offset for rotation effect
    if (earthTexture) {
      const textureSpeed = isMobile ? 0.0005 : 0.001;
      earthTexture.offset.x = state.clock.elapsedTime * textureSpeed;
    }
  });

  return (
    <group>
      {/* Earth sphere */}
      <Sphere ref={globeRef} args={[1.5, isMobile ? 32 : 64, isMobile ? 16 : 32]}>
        <meshStandardMaterial
          map={earthTexture || undefined}
          transparent
          opacity={0.9 * opacity}
          roughness={0.7}
          metalness={0.1}
          emissive="#1e40af"
          emissiveIntensity={0.2}
        />
      </Sphere>

      {/* Atmosphere glow */}
      <Sphere args={[1.55, isMobile ? 16 : 32, isMobile ? 8 : 16]}>
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.1 * opacity}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Outer glow */}
      <Sphere args={[1.7, isMobile ? 16 : 32, isMobile ? 8 : 16]}>
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.05 * opacity}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}

// Floating node component
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
  const [localHover, setLocalHover] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const { camera } = useThree();
  
  // Calculate actual opacity based on visibility and global opacity
  const actualOpacity = isVisible ? opacity : opacity * 0.1;

  // Animate node position
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      const angle = time * node.orbitSpeed + node.orbitOffset;
      
      // Calculate position in orbit
      const x = Math.cos(angle) * node.orbitRadius;
      const z = Math.sin(angle) * node.orbitRadius;
      const y = node.verticalOffset + Math.sin(time * 0.5 + node.orbitOffset) * 0.2;
      
      // Update group position
      groupRef.current.position.set(x, y, z);
      
      // Billboard effect - always face camera
      groupRef.current.lookAt(camera.position);
      
      // Update node position for connection lines
      node.position.set(x, y, z);
      
      // Check if node is behind globe (simple check)
      const distToCenter = Math.sqrt(x * x + z * z);
      const isBehind = z < -0.3 && distToCenter < 2;
      setIsVisible(!isBehind);
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
      
      <group 
        ref={groupRef} 
        position={[node.orbitRadius, node.verticalOffset, 0]}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={() => isVisible && onClick()}
      >
        {/* Combined Node with Icon - single Html element for perfect alignment */}
        <Html
          center
          style={{
            pointerEvents: isVisible ? 'auto' : 'none',
            opacity: isVisible ? 1 : 0.1,
            transition: 'opacity 0.3s ease',
          }}
        >
          <div 
            className="relative flex flex-col items-center"
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
          >
            {/* Tooltip - always rendered but visibility controlled */}
            <div 
              className="absolute -top-14 px-3 py-2 rounded-lg backdrop-blur-md transition-all duration-200 whitespace-nowrap"
              style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: `1px solid ${node.color}60`,
                boxShadow: `0 4px 20px ${node.color}40`,
                opacity: localHover ? 1 : 0,
                transform: localHover ? 'translateY(0)' : 'translateY(8px)',
                pointerEvents: 'none',
              }}
            >
              <div className="text-xs font-semibold text-white">{node.name}</div>
              <div className="text-[10px] opacity-70 text-slate-300">{node.role}</div>
            </div>
            
            {/* Node with pulsing animation */}
            <div 
              className="flex items-center justify-center rounded-full cursor-pointer"
              style={{ 
                width: '52px',
                height: '52px',
                backgroundColor: `${node.color}40`,
                border: `2px solid ${node.color}80`,
                boxShadow: localHover 
                  ? `0 0 30px ${node.color}, 0 0 60px ${node.color}60`
                  : `0 0 20px ${node.color}80`,
                transform: localHover ? 'scale(1.2)' : 'scale(1)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                animation: localHover ? 'none' : 'pulse-node 2s ease-in-out infinite',
              }}
            >
              <IconComponent size={24} style={{ color: node.color, filter: 'brightness(1.2)' }} />
            </div>
          </div>
          
          <style>{`
            @keyframes pulse-node {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.1); }
            }
          `}</style>
        </Html>
      </group>
    </>
  );
}

// Particle system for holographic effect
function HolographicParticles({ opacity, isMobile }: { opacity: number; isMobile: boolean }) {
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
    // Skip animations on mobile
    if (isMobile) return;
    
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
function OrbitRings({ opacity, isMobile }: { opacity: number; isMobile: boolean }) {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    // Skip animations on mobile
    if (isMobile) return;
    
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
  setSelectedNode,
  isMobile
}: { 
  opacity: number;
  hoveredNode: string | null;
  setHoveredNode: (id: string | null) => void;
  setSelectedNode: (node: NodeData | null) => void;
  isMobile: boolean;
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
      <EarthGlobe opacity={opacity} isMobile={isMobile} />
      
      {/* Orbit rings */}
      <OrbitRings opacity={opacity} isMobile={isMobile} />
      
      {/* Particles inside orb */}
      <HolographicParticles opacity={opacity} isMobile={isMobile} />
      
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
      
      {/* Orbit controls - disable interactions on mobile for better performance */}
      <OrbitControls
        enableZoom={!isMobile}
        enableRotate={!isMobile}
        enablePan={false}
        minDistance={5}
        maxDistance={10}
        autoRotate
        autoRotateSpeed={isMobile ? 0.15 : 0.3}
        enableDamping={!isMobile}
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
  const isTabVisible = useTabVisibility();
  const isMobile = useIsMobile();
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
        style={{ background: 'transparent', touchAction: isMobile ? 'auto' : 'none' }}
        frameloop="demand"
        gl={{ 
          alpha: true, 
          antialias: false, // Disable for perf
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
        }}
        dpr={isMobile ? [1, 1] : [1, 1.2]} // Lower DPR on mobile for better performance
      >
        <FrameInvalidator isTabVisible={isTabVisible} />
        <Scene 
          opacity={opacity}
          hoveredNode={hoveredNode}
          setHoveredNode={setHoveredNode}
          setSelectedNode={setSelectedNode}
          isMobile={isMobile}
        />
      </Canvas>
      
      {/* Node detail modal */}
      <NodeModal node={selectedNode} onClose={() => setSelectedNode(null)} />
      
      {/* Instructions hint - hide on mobile since interactions are disabled */}
      {!isMobile && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <p className="text-xs text-slate-400 opacity-60">
            Drag to rotate • Scroll to zoom • Click nodes for details
          </p>
        </div>
      )}
    </div>
  );
}
