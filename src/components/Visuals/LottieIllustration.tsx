import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { prefersReducedMotion } from "@/design/motion";

interface LottieIllustrationProps {
  name: string;
  mode?: "idle" | "play-once" | "hover" | "loop";
  className?: string;
  ariaLabel?: string;
  size?: "small" | "medium" | "large";
  fallbackComponent?: React.ReactNode;
}

// Size mappings
const sizeClasses = {
  small: "w-24 h-24",
  medium: "w-48 h-48",
  large: "w-72 h-72",
};

const LottieIllustration = ({
  name,
  mode = "play-once",
  className = "",
  ariaLabel,
  size = "medium",
  fallbackComponent,
}: LottieIllustrationProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    // If user prefers reduced motion, show static fallback
    if (reducedMotion) {
      setShowFallback(true);
      return;
    }

    // Simulate loading Lottie (in production, this would load actual JSON)
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [reducedMotion, name]);

  // Render SVG fallback component
  const renderFallback = () => {
    if (fallbackComponent) {
      return fallbackComponent;
    }

    // Default fallback based on name
    return <DefaultFallback name={name} />;
  };

  if (showFallback || reducedMotion) {
    return (
      <div
        ref={containerRef}
        className={`${sizeClasses[size]} ${className} flex items-center justify-center`}
        role="img"
        aria-label={ariaLabel || `${name} illustration`}
      >
        {renderFallback()}
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className={`${sizeClasses[size]} ${className} relative flex items-center justify-center`}
      role="img"
      aria-label={ariaLabel || `${name} illustration`}
      onMouseEnter={() => mode === "hover" && setIsHovered(true)}
      onMouseLeave={() => mode === "hover" && setIsHovered(false)}
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoaded ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Placeholder for actual Lottie - using animated SVG representations */}
      <AnimatedIllustration name={name} isPlaying={mode === "loop" || (mode === "hover" && isHovered)} />
    </motion.div>
  );
};

// Animated illustrations using Framer Motion (simulating Lottie behavior)
const AnimatedIllustration = ({ name, isPlaying }: { name: string; isPlaying: boolean }) => {
  switch (name) {
    case "hero-search":
      return <HeroSearchAnimation isPlaying={isPlaying} />;
    case "features-appointments":
      return <AppointmentsAnimation isPlaying={isPlaying} />;
    case "features-prescriptions":
      return <PrescriptionsAnimation isPlaying={isPlaying} />;
    case "dashboard-preview":
      return <DashboardAnimation isPlaying={isPlaying} />;
    case "collaboration":
      return <CollaborationAnimation isPlaying={isPlaying} />;
    case "mobile-ui":
      return <MobileUIAnimation isPlaying={isPlaying} />;
    case "success-confetti":
      return <ConfettiAnimation isPlaying={isPlaying} />;
    case "security-shield":
      return <SecurityAnimation isPlaying={isPlaying} />;
    default:
      return <DefaultAnimation />;
  }
};

// Hero Search Animation
const HeroSearchAnimation = ({ isPlaying }: { isPlaying: boolean }) => (
  <motion.svg
    viewBox="0 0 200 200"
    className="w-full h-full"
    initial={{ opacity: 0.8 }}
    animate={isPlaying ? { opacity: [0.8, 1, 0.8] } : {}}
    transition={{ duration: 3, repeat: Infinity }}
  >
    {/* Search magnifier */}
    <motion.circle
      cx="85"
      cy="85"
      r="35"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      className="text-primary"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
    />
    <motion.line
      x1="110"
      y1="110"
      x2="140"
      y2="140"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      className="text-primary"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    />
    
    {/* Floating dots */}
    {[
      { cx: 50, cy: 40, delay: 0 },
      { cx: 150, cy: 60, delay: 0.3 },
      { cx: 160, cy: 130, delay: 0.6 },
    ].map((dot, i) => (
      <motion.circle
        key={i}
        cx={dot.cx}
        cy={dot.cy}
        r="6"
        className="fill-accent"
        initial={{ scale: 0, opacity: 0 }}
        animate={isPlaying ? { 
          scale: [0, 1, 1, 0],
          opacity: [0, 1, 1, 0],
          y: [0, -10, -10, 0]
        } : { scale: 1, opacity: 0.7 }}
        transition={{ 
          duration: 2.5, 
          repeat: Infinity,
          delay: dot.delay,
          ease: "easeInOut"
        }}
      />
    ))}
  </motion.svg>
);

// Appointments Animation
const AppointmentsAnimation = ({ isPlaying }: { isPlaying: boolean }) => (
  <motion.svg viewBox="0 0 100 100" className="w-full h-full">
    {/* Calendar base */}
    <rect x="15" y="20" width="70" height="65" rx="8" className="fill-card stroke-border" strokeWidth="2" />
    <rect x="15" y="20" width="70" height="15" rx="8" className="fill-primary" />
    
    {/* Calendar rings */}
    <circle cx="30" cy="20" r="3" className="fill-muted" />
    <circle cx="70" cy="20" r="3" className="fill-muted" />
    
    {/* Animated date numbers */}
    {[1, 2, 3, 4, 5, 6].map((num, i) => (
      <motion.text
        key={i}
        x={25 + (i % 3) * 20}
        y={55 + Math.floor(i / 3) * 18}
        className="fill-foreground text-[10px] font-medium"
        initial={{ opacity: 0 }}
        animate={isPlaying ? { opacity: [0, 1] } : { opacity: 1 }}
        transition={{ delay: i * 0.1, duration: 0.3 }}
      >
        {num + 10}
      </motion.text>
    ))}
    
    {/* Highlight current day */}
    <motion.circle
      cx="45"
      cy="52"
      r="8"
      className="fill-primary/20"
      animate={isPlaying ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  </motion.svg>
);

// Prescriptions Animation
const PrescriptionsAnimation = ({ isPlaying }: { isPlaying: boolean }) => (
  <motion.svg viewBox="0 0 100 100" className="w-full h-full">
    {/* Prescription paper */}
    <rect x="20" y="10" width="60" height="80" rx="4" className="fill-card stroke-border" strokeWidth="2" />
    
    {/* Rx symbol */}
    <text x="28" y="32" className="fill-primary text-lg font-bold">℞</text>
    
    {/* Animated lines */}
    {[0, 1, 2, 3].map((line) => (
      <motion.rect
        key={line}
        x="28"
        y={42 + line * 12}
        width={40 - line * 5}
        height="4"
        rx="2"
        className="fill-muted-foreground/30"
        initial={{ scaleX: 0 }}
        animate={isPlaying ? { scaleX: 1 } : { scaleX: 1 }}
        transition={{ delay: 0.5 + line * 0.15, duration: 0.4 }}
        style={{ originX: 0 }}
      />
    ))}
    
    {/* Animated pen */}
    <motion.g
      initial={{ x: 0, y: 0 }}
      animate={isPlaying ? { x: [0, 30, 30, 0], y: [0, 0, 12, 0] } : {}}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <path
        d="M70 35 L78 27 L82 31 L74 39 L70 40 Z"
        className="fill-primary"
      />
      <line x1="74" y1="39" x2="82" y2="31" className="stroke-primary-foreground" strokeWidth="1" />
    </motion.g>
  </motion.svg>
);

// Dashboard Animation
const DashboardAnimation = ({ isPlaying }: { isPlaying: boolean }) => (
  <motion.svg viewBox="0 0 120 80" className="w-full h-full">
    {/* Dashboard frame */}
    <rect x="5" y="5" width="110" height="70" rx="8" className="fill-card stroke-border" strokeWidth="2" />
    
    {/* Header bar */}
    <rect x="5" y="5" width="110" height="12" rx="8" className="fill-muted" />
    <circle cx="15" cy="11" r="3" className="fill-destructive" />
    <circle cx="24" cy="11" r="3" className="fill-yellow-500" />
    <circle cx="33" cy="11" r="3" className="fill-green-500" />
    
    {/* Animated bar chart */}
    {[0, 1, 2, 3, 4].map((bar, i) => (
      <motion.rect
        key={i}
        x={15 + i * 12}
        y={65 - (20 + i * 8)}
        width="8"
        height={20 + i * 8}
        rx="2"
        className="fill-primary"
        initial={{ scaleY: 0 }}
        animate={isPlaying ? { scaleY: [0, 1] } : { scaleY: 1 }}
        transition={{ delay: i * 0.1, duration: 0.5 }}
        style={{ originY: 1 }}
      />
    ))}
    
    {/* Side panel */}
    <rect x="75" y="22" width="35" height="8" rx="2" className="fill-muted" />
    <rect x="75" y="34" width="28" height="6" rx="2" className="fill-muted-foreground/30" />
    <rect x="75" y="44" width="32" height="6" rx="2" className="fill-muted-foreground/30" />
    <rect x="75" y="54" width="25" height="6" rx="2" className="fill-muted-foreground/30" />
  </motion.svg>
);

// Collaboration Animation
const CollaborationAnimation = ({ isPlaying }: { isPlaying: boolean }) => (
  <motion.svg viewBox="0 0 120 100" className="w-full h-full">
    {/* Center file */}
    <motion.rect
      x="45"
      y="35"
      width="30"
      height="35"
      rx="4"
      className="fill-card stroke-primary"
      strokeWidth="2"
      animate={isPlaying ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    />
    <rect x="50" y="45" width="20" height="3" rx="1" className="fill-muted-foreground/40" />
    <rect x="50" y="52" width="15" height="3" rx="1" className="fill-muted-foreground/40" />
    <rect x="50" y="59" width="18" height="3" rx="1" className="fill-muted-foreground/40" />
    
    {/* Avatars with connecting lines */}
    {[
      { cx: 20, cy: 25, color: "fill-primary" },
      { cx: 100, cy: 25, color: "fill-accent" },
      { cx: 20, cy: 75, color: "fill-secondary" },
      { cx: 100, cy: 75, color: "fill-green-500" },
    ].map((avatar, i) => (
      <g key={i}>
        <motion.line
          x1={avatar.cx}
          y1={avatar.cy}
          x2="60"
          y2="52"
          className="stroke-border"
          strokeWidth="2"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={isPlaying ? { pathLength: [0, 1] } : { pathLength: 1 }}
          transition={{ delay: i * 0.2, duration: 0.8 }}
        />
        <motion.circle
          cx={avatar.cx}
          cy={avatar.cy}
          r="12"
          className={avatar.color}
          animate={isPlaying ? { y: [0, -3, 0] } : {}}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
        />
        <circle cx={avatar.cx} cy={avatar.cy - 3} r="4" className="fill-white/50" />
      </g>
    ))}
  </motion.svg>
);

// Mobile UI Animation
const MobileUIAnimation = ({ isPlaying }: { isPlaying: boolean }) => (
  <motion.svg viewBox="0 0 60 100" className="w-full h-full">
    {/* Phone frame */}
    <rect x="5" y="5" width="50" height="90" rx="8" className="fill-card stroke-border" strokeWidth="2" />
    <rect x="20" y="8" width="20" height="4" rx="2" className="fill-muted" />
    
    {/* Screen content */}
    <rect x="10" y="18" width="40" height="25" rx="4" className="fill-primary/10" />
    
    {/* Animated cards */}
    {[0, 1, 2].map((card, i) => (
      <motion.g
        key={i}
        initial={{ x: 60, opacity: 0 }}
        animate={isPlaying ? { x: 0, opacity: 1 } : { x: 0, opacity: 1 }}
        transition={{ delay: i * 0.2, duration: 0.5 }}
      >
        <rect x="10" y={48 + i * 14} width="40" height="12" rx="3" className="fill-muted" />
        <circle cx="18" cy={54 + i * 14} r="4" className="fill-primary/50" />
        <rect x="26" y={51 + i * 14} width="20" height="3" rx="1" className="fill-muted-foreground/40" />
        <rect x="26" y={56 + i * 14} width="14" height="2" rx="1" className="fill-muted-foreground/20" />
      </motion.g>
    ))}
    
    {/* Bottom nav */}
    <rect x="10" y="85" width="40" height="6" rx="3" className="fill-muted" />
  </motion.svg>
);

// Confetti Animation
const ConfettiAnimation = ({ isPlaying }: { isPlaying: boolean }) => (
  <motion.svg viewBox="0 0 100 100" className="w-full h-full">
    {[...Array(12)].map((_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const x = 50 + Math.cos(angle) * 30;
      const y = 50 + Math.sin(angle) * 30;
      const colors = ["fill-primary", "fill-accent", "fill-yellow-400", "fill-green-400"];
      
      return (
        <motion.circle
          key={i}
          cx={50}
          cy={50}
          r="4"
          className={colors[i % 4]}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={isPlaying ? {
            x: [0, x - 50],
            y: [0, y - 50],
            opacity: [0, 1, 0],
            scale: [0, 1, 0.5],
          } : {}}
          transition={{
            duration: 1,
            delay: i * 0.05,
            repeat: isPlaying ? 2 : 0,
          }}
        />
      );
    })}
    
    {/* Check mark */}
    <motion.path
      d="M35 50 L45 60 L65 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-green-500"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    />
  </motion.svg>
);

// Security Animation
const SecurityAnimation = ({ isPlaying }: { isPlaying: boolean }) => (
  <motion.svg viewBox="0 0 80 100" className="w-full h-full">
    {/* Shield */}
    <motion.path
      d="M40 10 L70 25 L70 50 C70 70 55 85 40 95 C25 85 10 70 10 50 L10 25 Z"
      className="fill-primary/20 stroke-primary"
      strokeWidth="3"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    />
    
    {/* Lock */}
    <rect x="28" y="45" width="24" height="20" rx="4" className="fill-primary" />
    <motion.path
      d="M32 45 L32 38 C32 32 36 28 40 28 C44 28 48 32 48 38 L48 45"
      fill="none"
      className="stroke-primary"
      strokeWidth="4"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={isPlaying ? { pathLength: 1 } : { pathLength: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    />
    
    {/* Keyhole */}
    <circle cx="40" cy="52" r="3" className="fill-primary-foreground" />
    <rect x="38" y="52" width="4" height="6" rx="1" className="fill-primary-foreground" />
    
    {/* Pulse effect */}
    <motion.circle
      cx="40"
      cy="52"
      r="30"
      fill="none"
      className="stroke-primary/30"
      strokeWidth="2"
      animate={isPlaying ? { scale: [1, 1.2], opacity: [0.5, 0] } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  </motion.svg>
);

// Default Animation
const DefaultAnimation = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <circle cx="50" cy="50" r="30" className="fill-muted stroke-border" strokeWidth="2" />
    <circle cx="50" cy="45" r="10" className="fill-muted-foreground/50" />
    <path d="M30 70 Q50 55 70 70" className="fill-muted-foreground/30" />
  </svg>
);

// Default Fallback Component
const DefaultFallback = ({ name }: { name: string }) => (
  <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
    <span className="text-muted-foreground text-sm">{name}</span>
  </div>
);

export default LottieIllustration;
