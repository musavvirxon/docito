// File: src/components/home/premium/HeroOrb3D.tsx
import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Sphere } from "@react-three/drei";
import * as THREE from "three";
import {
  Building2,
  Stethoscope,
  FlaskConical,
  Pill,
  Users,
  ScanLine,
  Heart,
  type LucideIcon,
} from "lucide-react";

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

// --- Tuning constants (globe + camera + orbits) ---
const GLOBE_RADIUS = 1.4;

// More distant camera (was too close)
const CAMERA_POS: [number, number, number] = [0, 0.2, 8.2];
const CAMERA_FOV = 42;

// Spread nodes further away from globe (was crowded)
const ORBIT_BASE = 3.25;
const ORBIT_VARIANCE = 0.35;

// Medical ecosystem nodes - 7 nodes evenly spaced
const ORBIT_STEP = (Math.PI * 2) / 7;

const medicalNodes: Omit<NodeData, "position">[] = [
  {
    id: "hospital",
    name: "Hospital",
    role: "Care Hub",
    description: "Coordinate inpatient and emergency care with unified records",
    Icon: Building2,
    color: "#3b82f6", // blue
    orbitRadius: ORBIT_BASE + 0.25,
    orbitSpeed: 0.18,
    orbitOffset: 0,
    verticalOffset: 1.15,
  },
  {
    id: "clinic",
    name: "Clinic",
    role: "Primary Care",
    description: "Streamline appointments, records, and patient follow-ups",
    Icon: Heart,
    color: "#10b981", // emerald
    orbitRadius: ORBIT_BASE - 0.05,
    orbitSpeed: 0.22,
    orbitOffset: ORBIT_STEP,
    verticalOffset: 0.35,
  },
  {
    id: "lab",
    name: "Laboratory",
    role: "Diagnostics",
    description: "Fast test ordering and results sharing across providers",
    Icon: FlaskConical,
    color: "#8b5cf6", // purple
    orbitRadius: ORBIT_BASE - 0.15,
    orbitSpeed: 0.26,
    orbitOffset: ORBIT_STEP * 2,
    verticalOffset: 0.85,
  },
  {
    id: "imaging",
    name: "Imaging",
    role: "Radiology",
    description: "Orders, scheduling, and reports for MRI, CT, X-ray, and ultrasound",
    Icon: ScanLine,
    color: "#06b6d4", // cyan
    orbitRadius: ORBIT_BASE - 0.25,
    orbitSpeed: 0.24,
    orbitOffset: ORBIT_STEP * 3,
    verticalOffset: -0.95,
  },
  {
    id: "pharmacy",
    name: "Pharmacy",
    role: "Medications",
    description: "Digital prescriptions sent directly to the right pharmacy",
    Icon: Pill,
    color: "#f59e0b", // amber
    orbitRadius: ORBIT_BASE + 0.05,
    orbitSpeed: 0.2,
    orbitOffset: ORBIT_STEP * 4,
    verticalOffset: -0.35,
  },
  {
    id: "doctor",
    name: "Doctor",
    role: "Specialist",
    description: "Connect specialists for coordinated care and referrals",
    Icon: Stethoscope,
    color: "#ef4444", // red
    orbitRadius: ORBIT_BASE + 0.35,
    orbitSpeed: 0.16,
    orbitOffset: ORBIT_STEP * 5,
    verticalOffset: 0.05,
  },
  {
    id: "patient",
    name: "Patient",
    role: "Care Recipient",
    description: "Book appointments and access records in one place",
    Icon: Users,
    color: "#ec4899", // pink
    orbitRadius: ORBIT_BASE - 0.1,
    orbitSpeed: 0.3,
    orbitOffset: ORBIT_STEP * 6,
    verticalOffset: -1.2,
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

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
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
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
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
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

// Frame invalidator component for performance
function FrameInvalidator({ isTabVisible }: { isTabVisible: boolean }) {
  const { invalidate } = useThree();

  useFrame(() => {
    if (isTabVisible) invalidate();
  });

  return null;
}

// Connection line component
function ConnectionLine({ nodePosition, color, opacity }: ConnectionLineProps) {
  const points = useMemo(() => [new THREE.Vector3(0, 0, 0), nodePosition.clone()], [nodePosition]);

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  const material = useMemo(
    () => new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
    [color, opacity],
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <primitive object={new THREE.Line(geometry, material)} />;
}

// --- Simple deterministic value-noise helpers (for "earth-like" procedural textures) ---
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function makeGridNoise(width: number, height: number, cell: number, seed: number) {
  const rand = mulberry32(seed);
  const gw = Math.ceil(width / cell) + 2;
  const gh = Math.ceil(height / cell) + 2;
  const grid = new Float32Array(gw * gh);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  return { grid, gw, gh, cell };
}

function sampleGridNoise(
  x: number,
  y: number,
  noise: { grid: Float32Array; gw: number; gh: number; cell: number },
) {
  const { grid, gw, gh, cell } = noise;
  const fx = x / cell;
  const fy = y / cell;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = smoothstep(fx - x0);
  const ty = smoothstep(fy - y0);

  const idx = (ix: number, iy: number) => grid[(iy * gw + ix) % grid.length];

  const v00 = idx(x0, y0);
  const v10 = idx(x0 + 1, y0);
  const v01 = idx(x0, y0 + 1);
  const v11 = idx(x0 + 1, y0 + 1);

  const vx0 = lerp(v00, v10, tx);
  const vx1 = lerp(v01, v11, tx);
  return lerp(vx0, vx1, ty);
}

function fbm(x: number, y: number, layers: Array<{ n: any; amp: number; freq: number }>) {
  let v = 0;
  let total = 0;
  for (const l of layers) {
    v += sampleGridNoise(x * l.freq, y * l.freq, l.n) * l.amp;
    total += l.amp;
  }
  return total > 0 ? v / total : v;
}

// Earth globe component
function EarthGlobe({ opacity, isMobile }: { opacity: number; isMobile: boolean }) {
  const globeRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const textures = useMemo(() => {
    // Higher-res on desktop; keep light on mobile
    const W = isMobile ? 768 : 1024;
    const H = isMobile ? 384 : 512;

    // --- Earth texture ---
    const earthCanvas = document.createElement("canvas");
    earthCanvas.width = W;
    earthCanvas.height = H;
    const ectx = earthCanvas.getContext("2d");
    if (!ectx) return { earth: null as THREE.Texture | null, clouds: null as THREE.Texture | null };

    // Ocean base
    const oceanGrad = ectx.createLinearGradient(0, 0, W, H);
    oceanGrad.addColorStop(0, "#0b2a6d");
    oceanGrad.addColorStop(0.5, "#1e40af");
    oceanGrad.addColorStop(1, "#06224f");
    ectx.fillStyle = oceanGrad;
    ectx.fillRect(0, 0, W, H);

    // Noise layers for continents + elevation
    const n1 = makeGridNoise(W, H, 96, 1337);
    const n2 = makeGridNoise(W, H, 48, 4242);
    const n3 = makeGridNoise(W, H, 24, 9001);

    // Create image data for land mask
    const img = ectx.getImageData(0, 0, W, H);
    const d = img.data;

    // Latitude factor (ice caps + climate)
    for (let y = 0; y < H; y++) {
      const lat = Math.abs((y / (H - 1)) * 2 - 1); // 0 at equator, 1 at poles
      for (let x = 0; x < W; x++) {
        // Wrap horizontally for seamless globe texture
        const wx = x;
        const wy = y;

        // "Earth-like" land distribution from fbm noise with lat bias
        const base = fbm(wx, wy, [
          { n: n1, amp: 0.55, freq: 1.0 },
          { n: n2, amp: 0.3, freq: 1.8 },
          { n: n3, amp: 0.15, freq: 3.2 },
        ]);

        // Add a subtle lat banding to avoid "all-random" look
        const latBias = (1 - lat) * 0.18;

        // Land threshold (more ocean overall)
        const land = base + latBias;
        const isLand = land > 0.56;

        const i = (y * W + x) * 4;

        if (isLand) {
          // Elevation detail
          const elev = fbm(wx + 200, wy + 100, [
            { n: n2, amp: 0.6, freq: 2.2 },
            { n: n3, amp: 0.4, freq: 4.4 },
          ]);

          // Biome by latitude + elevation
          const dryness = fbm(wx + 500, wy + 300, [
            { n: n1, amp: 0.7, freq: 1.1 },
            { n: n2, amp: 0.3, freq: 2.0 },
          ]);

          // Base colors (greens/browns/deserts/snow)
          let r = 0;
          let g = 0;
          let b = 0;

          const nearPole = lat > 0.78;
          const mountain = elev > 0.72;
          const desert = dryness > 0.62 && lat < 0.55;

          if (nearPole) {
            // tundra / snow
            r = 220;
            g = 232;
            b = 240;
          } else if (mountain) {
            // mountains
            r = 120;
            g = 116;
            b = 106;
          } else if (desert) {
            // desert
            r = 206;
            g = 188;
            b = 132;
          } else {
            // vegetation gradient
            const lush = (1 - lat) * 0.6 + (1 - dryness) * 0.4;
            r = Math.round(lerp(34, 56, lush));
            g = Math.round(lerp(112, 160, lush));
            b = Math.round(lerp(52, 70, lush));
          }

          // Add coastline blend (anti-aliased edge)
          const edge = THREE.MathUtils.clamp((land - 0.56) / 0.08, 0, 1);
          const coast = smoothstep(edge);
          const oceanR = d[i + 0];
          const oceanG = d[i + 1];
          const oceanB = d[i + 2];

          d[i + 0] = Math.round(lerp(oceanR, r, coast));
          d[i + 1] = Math.round(lerp(oceanG, g, coast));
          d[i + 2] = Math.round(lerp(oceanB, b, coast));
          d[i + 3] = 255;
        } else {
          // Add subtle ocean variation
          const oceanNoise = fbm(wx + 1000, wy + 1000, [
            { n: n1, amp: 0.7, freq: 1.0 },
            { n: n2, amp: 0.3, freq: 2.2 },
          ]);
          const deep = THREE.MathUtils.clamp(oceanNoise, 0, 1);
          const r = Math.round(lerp(6, 18, deep));
          const g = Math.round(lerp(28, 80, deep));
          const b = Math.round(lerp(90, 170, deep));
          d[i + 0] = r;
          d[i + 1] = g;
          d[i + 2] = b;
          d[i + 3] = 255;
        }
      }
    }

    ectx.putImageData(img, 0, 0);

    // Add faint latitude/longitude lines (subtle)
    ectx.save();
    ectx.globalAlpha = 0.12;
    ectx.strokeStyle = "#93c5fd";
    ectx.lineWidth = 1;

    for (let i = 1; i < 7; i++) {
      const y = (H / 7) * i;
      ectx.beginPath();
      ectx.moveTo(0, y);
      ectx.lineTo(W, y);
      ectx.stroke();
    }
    for (let i = 1; i < 13; i++) {
      const x = (W / 13) * i;
      ectx.beginPath();
      ectx.moveTo(x, 0);
      ectx.lineTo(x, H);
      ectx.stroke();
    }
    ectx.restore();

    // Ice caps overlay
    ectx.save();
    const capGradTop = ectx.createLinearGradient(0, 0, 0, H * 0.2);
    capGradTop.addColorStop(0, "rgba(255,255,255,0.85)");
    capGradTop.addColorStop(1, "rgba(255,255,255,0)");
    ectx.fillStyle = capGradTop;
    ectx.fillRect(0, 0, W, H * 0.22);

    const capGradBottom = ectx.createLinearGradient(0, H, 0, H * 0.8);
    capGradBottom.addColorStop(0, "rgba(255,255,255,0.85)");
    capGradBottom.addColorStop(1, "rgba(255,255,255,0)");
    ectx.fillStyle = capGradBottom;
    ectx.fillRect(0, H * 0.78, W, H * 0.22);
    ectx.restore();

    const earthTex = new THREE.CanvasTexture(earthCanvas);
    earthTex.wrapS = THREE.RepeatWrapping;
    earthTex.wrapT = THREE.ClampToEdgeWrapping;
    earthTex.anisotropy = 4;

    // --- Clouds texture ---
    const cloudsCanvas = document.createElement("canvas");
    cloudsCanvas.width = W;
    cloudsCanvas.height = H;
    const cctx = cloudsCanvas.getContext("2d");
    if (!cctx) return { earth: earthTex, clouds: null as THREE.Texture | null };

    const cn1 = makeGridNoise(W, H, 64, 7777);
    const cn2 = makeGridNoise(W, H, 32, 8888);
    const cn3 = makeGridNoise(W, H, 16, 9999);

    const cimg = cctx.createImageData(W, H);
    const cd = cimg.data;

    for (let y = 0; y < H; y++) {
      const lat = Math.abs((y / (H - 1)) * 2 - 1);
      const latMask = THREE.MathUtils.clamp(1 - lat * 1.1, 0, 1); // fewer clouds near poles
      for (let x = 0; x < W; x++) {
        const n = fbm(x, y, [
          { n: cn1, amp: 0.55, freq: 1.0 },
          { n: cn2, amp: 0.3, freq: 2.0 },
          { n: cn3, amp: 0.15, freq: 4.0 },
        ]);

        // Threshold to "puffy" clouds
        const puff = THREE.MathUtils.clamp((n - 0.52) / 0.22, 0, 1);
        const alpha = Math.round(255 * puff * latMask);

        const i = (y * W + x) * 4;
        cd[i + 0] = 255;
        cd[i + 1] = 255;
        cd[i + 2] = 255;
        cd[i + 3] = alpha;
      }
    }

    cctx.putImageData(cimg, 0, 0);

    const cloudsTex = new THREE.CanvasTexture(cloudsCanvas);
    cloudsTex.wrapS = THREE.RepeatWrapping;
    cloudsTex.wrapT = THREE.ClampToEdgeWrapping;
    cloudsTex.anisotropy = 4;

    return { earth: earthTex, clouds: cloudsTex };
  }, [isMobile]);

  useEffect(() => {
    return () => {
      textures.earth?.dispose();
      textures.clouds?.dispose();
    };
  }, [textures.earth, textures.clouds]);

  useFrame((state) => {
    if (globeRef.current) {
      const rotationSpeed = isMobile ? 0.008 : 0.02;
      globeRef.current.rotation.y = state.clock.elapsedTime * rotationSpeed;
      globeRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.03;
    }

    if (cloudsRef.current) {
      const cloudSpeed = isMobile ? 0.012 : 0.03;
      cloudsRef.current.rotation.y = state.clock.elapsedTime * cloudSpeed;
      cloudsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.02;
    }

    // Animate texture offset slightly for parallax feel
    if (textures.earth) {
      const textureSpeed = isMobile ? 0.00035 : 0.0007;
      textures.earth.offset.x = state.clock.elapsedTime * textureSpeed;
    }
    if (textures.clouds) {
      const textureSpeed = isMobile ? 0.0005 : 0.001;
      textures.clouds.offset.x = state.clock.elapsedTime * textureSpeed;
    }
  });

  return (
    <group>
      {/* Earth sphere */}
      <Sphere ref={globeRef} args={[GLOBE_RADIUS, isMobile ? 40 : 80, isMobile ? 20 : 40]}>
        <meshStandardMaterial
          map={textures.earth || undefined}
          transparent
          opacity={0.95 * opacity}
          roughness={0.55}
          metalness={0.05}
          emissive="#0b2a6d"
          emissiveIntensity={0.12}
        />
      </Sphere>

      {/* Clouds layer */}
      <Sphere ref={cloudsRef} args={[GLOBE_RADIUS * 1.012, isMobile ? 36 : 72, isMobile ? 18 : 36]}>
        <meshStandardMaterial
          map={textures.clouds || undefined}
          transparent
          opacity={0.55 * opacity}
          roughness={0.9}
          metalness={0}
          depthWrite={false}
        />
      </Sphere>

      {/* Atmosphere glow - enhanced */}
      <Sphere args={[GLOBE_RADIUS * 1.06, isMobile ? 18 : 36, isMobile ? 9 : 18]}>
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.18 * opacity} side={THREE.BackSide} />
      </Sphere>

      {/* Mid glow */}
      <Sphere args={[GLOBE_RADIUS * 1.13, isMobile ? 18 : 36, isMobile ? 9 : 18]}>
        <meshBasicMaterial color="#818cf8" transparent opacity={0.11 * opacity} side={THREE.BackSide} />
      </Sphere>

      {/* Outer glow */}
      <Sphere args={[GLOBE_RADIUS * 1.23, isMobile ? 18 : 36, isMobile ? 9 : 18]}>
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.055 * opacity} side={THREE.BackSide} />
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
}: {
  node: NodeData;
  opacity: number;
  onHover: () => void;
  onUnhover: () => void;
  onClick: () => void;
  isHovered: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [localHover, setLocalHover] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const { camera } = useThree();

  // Calculate actual opacity based on visibility and global opacity
  const actualOpacity = isVisible ? opacity : opacity * 0.1;

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const angle = time * node.orbitSpeed + node.orbitOffset;

    // Orbit path
    const x = Math.cos(angle) * node.orbitRadius;
    const z = Math.sin(angle) * node.orbitRadius;

    // Slight vertical bobbing (reduced to avoid overlaps)
    const y = node.verticalOffset + Math.sin(time * 0.42 + node.orbitOffset) * 0.14;

    groupRef.current.position.set(x, y, z);

    // Billboard effect - always face camera
    groupRef.current.lookAt(camera.position);

    // Update node position for connection lines
    node.position.set(x, y, z);

    // Visibility: hide when passing "behind" globe in camera-facing projection
    // Camera is generally +Z; globe centered at origin.
    const behind = z < 0;
    const inFrontOfGlobeDisk =
      Math.abs(x) < GLOBE_RADIUS * 1.1 && Math.abs(y) < GLOBE_RADIUS * 1.1;
    setIsVisible(!(behind && inFrontOfGlobeDisk));
  });

  const handlePointerEnter = useCallback(() => {
    if (!isVisible) return;
    setLocalHover(true);
    onHover();
    document.body.style.cursor = "pointer";
  }, [onHover, isVisible]);

  const handlePointerLeave = useCallback(() => {
    setLocalHover(false);
    onUnhover();
    document.body.style.cursor = "auto";
  }, [onUnhover]);

  const IconComponent = node.Icon;

  return (
    <>
      {/* Connection line - only show when visible */}
      {isVisible && (
        <ConnectionLine nodePosition={node.position} color={node.color} opacity={opacity * 0.18} />
      )}

      <group
        ref={groupRef}
        position={[node.orbitRadius, node.verticalOffset, 0]}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={() => isVisible && onClick()}
      >
        <Html
          center
          style={{
            pointerEvents: isVisible ? "auto" : "none",
            opacity: isVisible ? actualOpacity : actualOpacity * 0.2,
            transition: "opacity 0.25s ease",
          }}
        >
          <div
            className="relative flex flex-col items-center"
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
          >
            {/* Tooltip */}
            <div
              className="absolute -top-14 px-3 py-2 rounded-lg backdrop-blur-md transition-all duration-200 whitespace-nowrap"
              style={{
                background: "rgba(15, 23, 42, 0.95)",
                border: `1px solid ${node.color}60`,
                boxShadow: `0 4px 20px ${node.color}40`,
                opacity: localHover ? 1 : 0,
                transform: localHover ? "translateY(0)" : "translateY(8px)",
                pointerEvents: "none",
              }}
            >
              <div className="text-xs font-semibold text-white">{node.name}</div>
              <div className="text-[10px] opacity-70 text-slate-300">{node.role}</div>
            </div>

            {/* Node */}
            <div
              className="flex items-center justify-center rounded-full cursor-pointer"
              style={{
                width: "52px",
                height: "52px",
                backgroundColor: `${node.color}40`,
                border: `2px solid ${node.color}80`,
                boxShadow: localHover
                  ? `0 0 30px ${node.color}, 0 0 60px ${node.color}60`
                  : `0 0 20px ${node.color}80`,
                transform: localHover ? "scale(1.18)" : "scale(1)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                animation: localHover ? "none" : "pulse-node 2.2s ease-in-out infinite",
              }}
            >
              <IconComponent size={24} style={{ color: node.color, filter: "brightness(1.2)" }} />
            </div>
          </div>

          <style>{`
            @keyframes pulse-node {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.08); }
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
  const count = 200;

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
    if (isMobile) return;
    if (!particlesRef.current) return;
    particlesRef.current.rotation.y = state.clock.elapsedTime * 0.04;
    particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.08;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#60a5fa"
        transparent
        opacity={0.45 * opacity}
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
    if (isMobile) return;
    const time = state.clock.elapsedTime;
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = Math.PI / 2 + Math.sin(time * 0.25) * 0.08;
      ring1Ref.current.rotation.z = time * 0.08;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = Math.PI / 3;
      ring2Ref.current.rotation.z = -time * 0.065;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x = Math.PI / 4;
      ring3Ref.current.rotation.y = time * 0.095;
    }
  });

  // Slightly larger rings to match increased node orbit radii
  return (
    <group>
      <mesh ref={ring1Ref}>
        <ringGeometry args={[GLOBE_RADIUS * 1.35, GLOBE_RADIUS * 1.365, 72]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.18 * opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={ring2Ref}>
        <ringGeometry args={[GLOBE_RADIUS * 1.55, GLOBE_RADIUS * 1.565, 72]} />
        <meshBasicMaterial
          color="#8b5cf6"
          transparent
          opacity={0.14 * opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={ring3Ref}>
        <ringGeometry args={[GLOBE_RADIUS * 1.85, GLOBE_RADIUS * 1.865, 72]} />
        <meshBasicMaterial
          color="#06b6d4"
          transparent
          opacity={0.1 * opacity}
          side={THREE.DoubleSide}
        />
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
  isMobile,
}: {
  opacity: number;
  hoveredNode: string | null;
  setHoveredNode: (id: string | null) => void;
  setSelectedNode: (node: NodeData | null) => void;
  isMobile: boolean;
}) {
  const nodes = useMemo<NodeData[]>(() => {
    return medicalNodes.map((node) => ({
      ...node,
      orbitRadius: THREE.MathUtils.clamp(node.orbitRadius, ORBIT_BASE - ORBIT_VARIANCE, ORBIT_BASE + ORBIT_VARIANCE + 0.4),
      position: new THREE.Vector3(node.orbitRadius, node.verticalOffset, 0),
    }));
  }, []);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.25} color="#e3f2fd" />
      <directionalLight position={[6, 3.5, 5]} intensity={1.7} color="#fff8e1" />
      <directionalLight position={[-4, -1.5, -3]} intensity={0.25} color="#1565c0" />
      <pointLight position={[0, 0, 5]} intensity={0.35} color="#ffffff" />
      <hemisphereLight args={["#87ceeb", "#0b2a6d", 0.28]} />

      {/* Earth Globe */}
      <EarthGlobe opacity={opacity} isMobile={isMobile} />

      {/* Orbit rings */}
      <OrbitRings opacity={opacity} isMobile={isMobile} />

      {/* Particles */}
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
        />
      ))}

      {/* Orbit controls */}
      <OrbitControls
        enableZoom={!isMobile}
        enableRotate={!isMobile}
        enablePan={false}
        minDistance={7.2}
        maxDistance={12.5}
        autoRotate
        autoRotateSpeed={isMobile ? 0.12 : 0.22}
        enableDamping={!isMobile}
        dampingFactor={0.06}
        minPolarAngle={Math.PI / 4.2}
        maxPolarAngle={Math.PI * 3 / 4.2}
      />
    </>
  );
}

// Modal for selected node
function NodeModal({ node, onClose }: { node: NodeData | null; onClose: () => void }) {
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
          background: "rgba(15, 23, 42, 0.95)",
          border: `2px solid ${node.color}40`,
          boxShadow: `0 0 40px ${node.color}30, 0 20px 60px rgba(0,0,0,0.5)`,
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{
              background: `${node.color}20`,
              border: `1px solid ${node.color}40`,
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
        camera={{ position: CAMERA_POS, fov: CAMERA_FOV }}
        style={{ background: "transparent", touchAction: isMobile ? "auto" : "none" }}
        frameloop="demand"
        gl={{
          alpha: true,
          antialias: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        dpr={isMobile ? [1, 1] : [1, 1.2]}
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

      <NodeModal node={selectedNode} onClose={() => setSelectedNode(null)} />

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
