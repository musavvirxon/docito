// src/components/home/premium/HeroOrb3D.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Sphere } from "@react-three/drei";
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

// Custom hook for scroll-based opacity
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
function FrameInvalidator({ shouldAnimate }: { shouldAnimate: boolean }) {
  const { invalidate } = useThree();
  useFrame(() => {
    if (shouldAnimate) invalidate();
  });
  return null;
}

// Connection line component (updates geometry each frame; no React state)
function ConnectionLine({ nodePosition, color, opacity }: ConnectionLineProps) {
  const lineRef = useRef<THREE.Line | null>(null);
  const matRef = useRef<THREE.LineBasicMaterial | null>(null);

  const positions = useMemo(() => new Float32Array(6), []);

  const lineObj = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const m = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    matRef.current = m;
    const l = new THREE.Line(g, m);
    l.frustumCulled = false;
    return l;
  }, [positions, color, opacity]);

  useEffect(() => {
    return () => {
      lineObj.geometry.dispose();
      (lineObj.material as THREE.Material).dispose();
    };
  }, [lineObj]);

  useFrame(() => {
    const g = lineObj.geometry as THREE.BufferGeometry;
    const attr = g.getAttribute("position") as THREE.BufferAttribute;

    // from center to node
    positions[0] = 0;
    positions[1] = 0;
    positions[2] = 0;
    positions[3] = nodePosition.x;
    positions[4] = nodePosition.y;
    positions[5] = nodePosition.z;

    attr.needsUpdate = true;

    if (matRef.current) {
      matRef.current.opacity = opacity;
      (matRef.current as any).color?.set?.(color);
      matRef.current.needsUpdate = true;
    }
  });

  return <primitive object={lineObj} ref={lineRef as any} />;
}

// --- Procedural earth texture generator (fast + cached) ---
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
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
  const { grid, gw, cell } = noise;
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

type GlobeTextures = {
  earth: THREE.Texture;
  clouds: THREE.Texture;
  roughness: THREE.Texture;
  bump: THREE.Texture;
};
const globeTextureCache: { mobile?: GlobeTextures; desktop?: GlobeTextures } = {};

function configureTex(tex: THREE.Texture) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 2;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
}

function generateEarthTextures(width: number, height: number, seed: number): GlobeTextures {
  // --- Earth color texture + roughness + bump (all canvas generated; lightweight) ---
  const earthCanvas = document.createElement("canvas");
  earthCanvas.width = width;
  earthCanvas.height = height;

  const ectx = earthCanvas.getContext("2d");
  if (!ectx) {
    const fallback = new THREE.Texture();
    configureTex(fallback);
    return { earth: fallback, clouds: fallback, roughness: fallback, bump: fallback };
  }

  // Ocean base (slightly deeper, more Earth-like)
  const oceanGrad = ectx.createLinearGradient(0, 0, width, height);
  oceanGrad.addColorStop(0, "#071f52");
  oceanGrad.addColorStop(0.55, "#0b3a8a");
  oceanGrad.addColorStop(1, "#06163b");
  ectx.fillStyle = oceanGrad;
  ectx.fillRect(0, 0, width, height);

  // Fast 2-layer noise (seamless wrap)
  const n1 = makeGridNoise(width, height, Math.max(28, Math.floor(width / 10)), seed);
  const n2 = makeGridNoise(width, height, Math.max(14, Math.floor(width / 20)), seed + 1337);

  const img = ectx.getImageData(0, 0, width, height);
  const d = img.data;

  // Roughness map (black = glossy ocean, white = rough land)
  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rctx = roughCanvas.getContext("2d");
  const roughImg = ectx.createImageData(width, height);
  const rd = roughImg.data;

  // Bump map (grayscale elevation; subtle)
  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bctx = bumpCanvas.getContext("2d");
  const bumpImg = ectx.createImageData(width, height);
  const bd = bumpImg.data;

  for (let y = 0; y < height; y++) {
    const lat = Math.abs((y / (height - 1)) * 2 - 1); // 0 equator, 1 poles
    const latBias = (1 - lat) * 0.16;
    const nearPole = lat > 0.78;

    for (let x = 0; x < width; x++) {
      const base =
        sampleGridNoise(x, y, n1) * 0.72 +
        sampleGridNoise(x * 1.6 + 120, y * 1.6 + 40, n2) * 0.28;

      // Land threshold (more ocean overall)
      const land = base + latBias;
      const isLand = land > 0.585;

      const i = (y * width + x) * 4;

      // Coast proximity approximation: higher near coast
      const coastProx = THREE.MathUtils.clamp(1 - (0.585 - land) / 0.08, 0, 1);
      const shallow = smoothstep(coastProx);

      if (!isLand) {
        // Ocean variation + shallow turquoise near coasts
        const w = sampleGridNoise(x + 500, y + 900, n2);
        const oR = lerp(4, 14, w);
        const oG = lerp(24, 82, w);
        const oB = lerp(92, 178, w);

        const sR = 20;
        const sG = 170;
        const sB = 165;

        d[i + 0] = Math.round(lerp(oR, sR, shallow * 0.45));
        d[i + 1] = Math.round(lerp(oG, sG, shallow * 0.45));
        d[i + 2] = Math.round(lerp(oB, sB, shallow * 0.45));
        d[i + 3] = 255;

        // glossy oceans, slightly rougher near coast
        const rv = Math.round(lerp(34, 54, w) + shallow * 18);
        rd[i + 0] = rv;
        rd[i + 1] = rv;
        rd[i + 2] = rv;
        rd[i + 3] = 255;

        // bump: flat ocean
        bd[i + 0] = 0;
        bd[i + 1] = 0;
        bd[i + 2] = 0;
        bd[i + 3] = 255;
        continue;
      }

      // Elevation + dryness (cheap)
      const elev = sampleGridNoise(x * 2.2 + 210, y * 2.2 + 90, n2);
      const dry = sampleGridNoise(x + 900, y + 300, n1);
      const mountain = elev > 0.72;
      const desert = dry > 0.64 && lat < 0.55;

      // Land colors (slightly more natural)
      let r = 0;
      let g = 0;
      let b = 0;

      if (nearPole) {
        // snow / tundra
        r = 232;
        g = 242;
        b = 248;
      } else if (mountain) {
        // rocky
        const m = THREE.MathUtils.clamp((elev - 0.72) / 0.18, 0, 1);
        r = Math.round(lerp(120, 160, m));
        g = Math.round(lerp(112, 148, m));
        b = Math.round(lerp(104, 138, m));
      } else if (desert) {
        r = 214;
        g = 196;
        b = 138;
      } else {
        // vegetation
        const lush = (1 - lat) * 0.62 + (1 - dry) * 0.38;
        r = Math.round(lerp(22, 64, lush));
        g = Math.round(lerp(86, 168, lush));
        b = Math.round(lerp(30, 84, lush));
      }

      // Coast blending (fade land into ocean)
      const edge = THREE.MathUtils.clamp((land - 0.585) / 0.09, 0, 1);
      const coast = smoothstep(edge);

      const oceanR = d[i + 0];
      const oceanG = d[i + 1];
      const oceanB = d[i + 2];

      d[i + 0] = Math.round(lerp(oceanR, r, coast));
      d[i + 1] = Math.round(lerp(oceanG, g, coast));
      d[i + 2] = Math.round(lerp(oceanB, b, coast));
      d[i + 3] = 255;

      // Roughness: land is rougher; mountains roughest
      let rv = 165;
      if (nearPole) rv = 150;
      if (desert) rv = 172;
      if (mountain) rv = 205;

      // Slightly smoother near coasts (wet)
      rv = Math.round(lerp(rv, rv - 18, 1 - coast));
      rd[i + 0] = rv;
      rd[i + 1] = rv;
      rd[i + 2] = rv;
      rd[i + 3] = 255;

      // Bump: subtle elevation (mostly on land)
      let bv = Math.round(THREE.MathUtils.clamp(elev * 1.15, 0, 1) * 255);
      if (mountain) bv = Math.min(255, bv + 30);
      if (nearPole) bv = Math.round(bv * 0.65);
      // soften near coasts to avoid noisy shorelines
      bv = Math.round(lerp(0, bv, coast));
      bd[i + 0] = bv;
      bd[i + 1] = bv;
      bd[i + 2] = bv;
      bd[i + 3] = 255;
    }
  }

  ectx.putImageData(img, 0, 0);

  // Ice caps overlay (keeps a more realistic polar feel)
  ectx.save();
  const capTop = ectx.createLinearGradient(0, 0, 0, height * 0.2);
  capTop.addColorStop(0, "rgba(255,255,255,0.8)");
  capTop.addColorStop(1, "rgba(255,255,255,0)");
  ectx.fillStyle = capTop;
  ectx.fillRect(0, 0, width, height * 0.22);

  const capBottom = ectx.createLinearGradient(0, height, 0, height * 0.8);
  capBottom.addColorStop(0, "rgba(255,255,255,0.8)");
  capBottom.addColorStop(1, "rgba(255,255,255,0)");
  ectx.fillStyle = capBottom;
  ectx.fillRect(0, height * 0.78, width, height * 0.22);
  ectx.restore();

  // Final textures
  const earthTex = new THREE.CanvasTexture(earthCanvas);
  configureTex(earthTex);
  if ("colorSpace" in earthTex && (THREE as any).SRGBColorSpace) {
    (earthTex as any).colorSpace = (THREE as any).SRGBColorSpace;
  }

  if (rctx) rctx.putImageData(roughImg, 0, 0);
  const roughnessTex = new THREE.CanvasTexture(roughCanvas);
  configureTex(roughnessTex);
  if ("colorSpace" in roughnessTex && (THREE as any).NoColorSpace) {
    (roughnessTex as any).colorSpace = (THREE as any).NoColorSpace;
  }

  if (bctx) bctx.putImageData(bumpImg, 0, 0);
  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  configureTex(bumpTex);
  if ("colorSpace" in bumpTex && (THREE as any).NoColorSpace) {
    (bumpTex as any).colorSpace = (THREE as any).NoColorSpace;
  }

  // --- Clouds texture ---
  const cloudsCanvas = document.createElement("canvas");
  cloudsCanvas.width = width;
  cloudsCanvas.height = height;
  const cctx = cloudsCanvas.getContext("2d");
  if (!cctx) {
    const cloudsTex = new THREE.CanvasTexture(cloudsCanvas);
    configureTex(cloudsTex);
    return { earth: earthTex, clouds: cloudsTex, roughness: roughnessTex, bump: bumpTex };
  }

  const cn1 = makeGridNoise(width, height, Math.max(22, Math.floor(width / 12)), seed + 7777);
  const cn2 = makeGridNoise(width, height, Math.max(11, Math.floor(width / 24)), seed + 9999);

  const cimg = cctx.createImageData(width, height);
  const cd = cimg.data;

  for (let y = 0; y < height; y++) {
    const lat = Math.abs((y / (height - 1)) * 2 - 1);
    const latMask = THREE.MathUtils.clamp(1 - lat * 1.05, 0, 1);
    for (let x = 0; x < width; x++) {
      const n =
        sampleGridNoise(x, y, cn1) * 0.7 +
        sampleGridNoise(x * 1.9 + 80, y * 1.9 + 40, cn2) * 0.3;

      const puff = THREE.MathUtils.clamp((n - 0.56) / 0.22, 0, 1);
      const alpha = Math.round(255 * puff * latMask);

      const i = (y * width + x) * 4;
      cd[i + 0] = 255;
      cd[i + 1] = 255;
      cd[i + 2] = 255;
      cd[i + 3] = alpha;
    }
  }

  cctx.putImageData(cimg, 0, 0);
  const cloudsTex = new THREE.CanvasTexture(cloudsCanvas);
  configureTex(cloudsTex);
  if ("colorSpace" in cloudsTex && (THREE as any).SRGBColorSpace) {
    (cloudsTex as any).colorSpace = (THREE as any).SRGBColorSpace;
  }

  return { earth: earthTex, clouds: cloudsTex, roughness: roughnessTex, bump: bumpTex };
}

function requestIdle(cb: () => void) {
  const w = window as any;
  if (typeof w.requestIdleCallback === "function") {
    return w.requestIdleCallback(cb, { timeout: 1200 });
  }
  return window.setTimeout(cb, 60);
}

function cancelIdle(id: number) {
  const w = window as any;
  if (typeof w.cancelIdleCallback === "function") {
    w.cancelIdleCallback(id);
  } else {
    window.clearTimeout(id);
  }
}

// Earth globe component (progressive + cached textures)
function EarthGlobe({ opacity, isMobile }: { opacity: number; isMobile: boolean }) {
  const globeRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const cacheKey = isMobile ? "mobile" : "desktop";
  const [textures, setTextures] = useState<GlobeTextures | null>(() => {
    return cacheKey === "mobile"
      ? globeTextureCache.mobile ?? null
      : globeTextureCache.desktop ?? null;
  });

  useEffect(() => {
    let cancelled = false;
    let idleId: number | null = null;

    const current =
      cacheKey === "mobile" ? globeTextureCache.mobile : globeTextureCache.desktop;
    if (current) {
      setTextures(current);
      return () => {
        // keep cached textures for fast future navigations
      };
    }

    // Fast preview textures (immediate)
    const previewW = 256;
    const previewH = 128;
    const preview = generateEarthTextures(previewW, previewH, 1337);

    if (cacheKey === "mobile") globeTextureCache.mobile = preview;
    else globeTextureCache.desktop = preview;
    setTextures(preview);

    // Desktop: upgrade to higher-res textures when the browser is idle
    if (!isMobile) {
      idleId = requestIdle(() => {
        if (cancelled) return;
        const final = generateEarthTextures(512, 256, 1337);
        if (cancelled) {
          final.earth.dispose();
          final.clouds.dispose();
          final.roughness.dispose();
          final.bump.dispose();
          return;
        }
        const prev = globeTextureCache.desktop;
        globeTextureCache.desktop = final;
        setTextures(final);
        // dispose the old preview textures (keep only final in cache)
        prev?.earth.dispose();
        prev?.clouds.dispose();
        prev?.roughness.dispose();
        prev?.bump.dispose();
      });
    }

    return () => {
      cancelled = true;
      if (idleId !== null) cancelIdle(idleId);
    };
  }, [cacheKey, isMobile]);

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
    if (textures?.earth) {
      const textureSpeed = isMobile ? 0.00035 : 0.0007;
      const ox = state.clock.elapsedTime * textureSpeed;
      textures.earth.offset.x = ox;
      if (textures.roughness) textures.roughness.offset.x = ox;
      if (textures.bump) textures.bump.offset.x = ox;
    }
    if (textures?.clouds) {
      const textureSpeed = isMobile ? 0.0005 : 0.001;
      textures.clouds.offset.x = state.clock.elapsedTime * textureSpeed;
    }
  });

  const earthSegW = isMobile ? 40 : 64;
  const earthSegH = isMobile ? 20 : 32;

  return (
    <group>
      {/* Earth sphere */}
      <Sphere ref={globeRef} args={[GLOBE_RADIUS, earthSegW, earthSegH]}>
        <meshStandardMaterial
          map={textures?.earth || undefined}
          roughnessMap={textures?.roughness || undefined}
          bumpMap={textures?.bump || undefined}
          bumpScale={isMobile ? 0.04 : 0.06}
          color={textures?.earth ? undefined : "#1e40af"}
          transparent
          opacity={0.96 * opacity}
          roughness={0.62}
          metalness={0}
          emissive="#06163b"
          emissiveIntensity={0.08}
        />
      </Sphere>

      {/* Clouds layer */}
      <Sphere
        ref={cloudsRef}
        args={[GLOBE_RADIUS * 1.012, isMobile ? 36 : 56, isMobile ? 18 : 28]}
      >
        <meshStandardMaterial
          map={textures?.clouds || undefined}
          transparent
          opacity={0.55 * opacity}
          roughness={0.9}
          metalness={0}
          depthWrite={false}
        />
      </Sphere>

      {/* Atmosphere glow */}
      <Sphere args={[GLOBE_RADIUS * 1.06, isMobile ? 18 : 30, isMobile ? 9 : 15]}>
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.18 * opacity}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Mid glow */}
      <Sphere args={[GLOBE_RADIUS * 1.13, isMobile ? 18 : 30, isMobile ? 9 : 15]}>
        <meshBasicMaterial
          color="#818cf8"
          transparent
          opacity={0.11 * opacity}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Outer glow */}
      <Sphere args={[GLOBE_RADIUS * 1.23, isMobile ? 18 : 30, isMobile ? 9 : 15]}>
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.055 * opacity}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}

// Floating node component (no per-frame React state; icons never disappear)
function FloatingNode({
  node,
  opacity,
  onHover,
  onUnhover,
  onClick,
}: {
  node: NodeData;
  opacity: number;
  onHover: () => void;
  onUnhover: () => void;
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [localHover, setLocalHover] = useState(false);
  const { camera } = useThree();

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const angle = time * node.orbitSpeed + node.orbitOffset;

    const x = Math.cos(angle) * node.orbitRadius;
    const z = Math.sin(angle) * node.orbitRadius;
    const y = node.verticalOffset + Math.sin(time * 0.42 + node.orbitOffset) * 0.14;

    groupRef.current.position.set(x, y, z);
    groupRef.current.lookAt(camera.position);
    node.position.set(x, y, z);
  });

  const handlePointerEnter = useCallback(() => {
    setLocalHover(true);
    onHover();
    document.body.style.cursor = "pointer";
  }, [onHover]);

  const handlePointerLeave = useCallback(() => {
    setLocalHover(false);
    onUnhover();
    document.body.style.cursor = "auto";
  }, [onUnhover]);

  const IconComponent = node.Icon;

  return (
    <>
      <ConnectionLine nodePosition={node.position} color={node.color} opacity={opacity * 0.18} />

      <group
        ref={groupRef}
        position={[node.orbitRadius, node.verticalOffset, 0]}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={onClick}
      >
        <Html
          center
          style={{
            pointerEvents: "auto",
            opacity,
            transition: "opacity 0.25s ease",
          }}
        >
          <div
            className="relative flex flex-col items-center"
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg"
              style={{
                background: `${node.color}18`,
                border: `1.5px solid ${node.color}45`,
                boxShadow: localHover
                  ? `0 0 28px ${node.color}55, 0 12px 30px rgba(0,0,0,0.35)`
                  : `0 0 18px ${node.color}35, 0 8px 22px rgba(0,0,0,0.25)`,
                transform: localHover ? "translateY(-2px) scale(1.05)" : "translateY(0) scale(1)",
                transition: "all 220ms ease",
              }}
            >
              <IconComponent
                className="w-7 h-7"
                style={{
                  color: node.color,
                  filter: "drop-shadow(0 0 10px rgba(255,255,255,0.25))",
                }}
              />
            </div>

            {/* Label */}
            <div
              className="mt-2 text-center px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: "rgba(15, 23, 42, 0.65)",
                border: `1px solid ${node.color}35`,
                color: "rgba(226, 232, 240, 0.95)",
                backdropFilter: "blur(10px)",
              }}
            >
              <span className="block leading-tight">{node.name}</span>
              <span className="block text-[10px] opacity-70 leading-tight">{node.role}</span>
            </div>
          </div>
        </Html>
      </group>
    </>
  );
}

// Particles (GPU-light, few points)
function HolographicParticles({ opacity, isMobile }: { opacity: number; isMobile: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);

  const count = isMobile ? 220 : 420;

  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const rand = mulberry32(424242);

    for (let i = 0; i < count; i++) {
      const r = lerp(2.1, 5.8, rand());
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(lerp(-1, 1, rand()));
      pos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      siz[i] = lerp(0.8, 2.4, rand());
    }

    return { positions: pos, sizes: siz };
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = state.clock.elapsedTime * (isMobile ? 0.02 : 0.05);
    pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.08;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          array={sizes}
          count={sizes.length}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#93c5fd"
        transparent
        opacity={0.25 * opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Orbit rings
function OrbitRings({ opacity, isMobile }: { opacity: number; isMobile: boolean }) {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * (isMobile ? 0.06 : 0.12);
      ring1Ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.25) * 0.05;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * (isMobile ? 0.045 : 0.09);
      ring2Ref.current.rotation.y = Math.PI / 3 + Math.sin(t * 0.18) * 0.04;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z = t * (isMobile ? 0.03 : 0.06);
      ring3Ref.current.rotation.y = -Math.PI / 4 + Math.sin(t * 0.16) * 0.04;
    }
  });

  return (
    <group>
      <mesh ref={ring1Ref} frustumCulled={false}>
        <ringGeometry args={[GLOBE_RADIUS * 1.25, GLOBE_RADIUS * 1.265, 72]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.18 * opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={ring2Ref} frustumCulled={false}>
        <ringGeometry args={[GLOBE_RADIUS * 1.55, GLOBE_RADIUS * 1.565, 72]} />
        <meshBasicMaterial
          color="#8b5cf6"
          transparent
          opacity={0.14 * opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={ring3Ref} frustumCulled={false}>
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
  setSelectedNode,
  isMobile,
}: {
  opacity: number;
  setSelectedNode: (node: NodeData | null) => void;
  isMobile: boolean;
}) {
  const nodes = useMemo<NodeData[]>(() => {
    return medicalNodes.map((node) => ({
      ...node,
      orbitRadius: THREE.MathUtils.clamp(
        node.orbitRadius,
        ORBIT_BASE - ORBIT_VARIANCE,
        ORBIT_BASE + ORBIT_VARIANCE + 0.4,
      ),
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
          onHover={() => {}}
          onUnhover={() => {}}
          onClick={() => setSelectedNode(node)}
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
        maxPolarAngle={(Math.PI * 3) / 4.2}
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
              background: `${node.color}25`,
              border: `1px solid ${node.color}55`,
            }}
          >
            <IconComponent className="w-6 h-6" style={{ color: node.color }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{node.name}</h3>
            <p className="text-sm text-slate-300">{node.role}</p>
          </div>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed mb-5">{node.description}</p>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition"
          style={{
            background: `${node.color}22`,
            border: `1px solid ${node.color}50`,
            color: "white",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function HeroOrb3D() {
  const opacity = useScrollOpacity();
  const isVisible = useTabVisibility();
  const isMobile = useIsMobile();
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);

  const shouldAnimate = opacity > 0.01 && isVisible;

  return (
    <div className="relative w-full h-full" onClick={() => selectedNode && setSelectedNode(null)}>
      <Canvas
        dpr={isMobile ? 1 : [1, 1.6]}
        camera={{ position: CAMERA_POS, fov: CAMERA_FOV }}
        gl={{ antialias: !isMobile, alpha: true, powerPreference: "high-performance" }}
        frameloop="demand"
      >
        <FrameInvalidator shouldAnimate={shouldAnimate} />
        <Scene opacity={opacity} setSelectedNode={setSelectedNode} isMobile={isMobile} />
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
