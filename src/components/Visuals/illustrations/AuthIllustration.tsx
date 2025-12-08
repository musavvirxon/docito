import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface AuthIllustrationProps {
  variant?: "signin" | "signup" | "forgot" | "verify";
  className?: string;
}

export const AuthIllustration = ({ variant = "signin", className = "" }: AuthIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  const renderShield = () => (
    <g>
      {/* Shield shape */}
      <motion.path
        d="M150 30 L230 60 L230 130 C230 180 190 220 150 240 C110 220 70 180 70 130 L70 60 Z"
        className="fill-primary/10 stroke-primary"
        strokeWidth="3"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      
      {/* Lock body */}
      <motion.rect
        x="120"
        y="110"
        width="60"
        height="50"
        rx="8"
        className="fill-primary"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />
      
      {/* Lock shackle */}
      <motion.path
        d="M130 110 L130 90 C130 70 170 70 170 90 L170 110"
        fill="none"
        className="stroke-primary"
        strokeWidth="8"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
      
      {/* Keyhole */}
      <circle cx="150" cy="130" r="8" className="fill-primary-foreground" />
      <rect x="146" y="130" width="8" height="15" rx="2" className="fill-primary-foreground" />
      
      {/* Pulse effect */}
      {!prefersReducedMotion && (
        <motion.circle
          cx="150"
          cy="135"
          r="60"
          fill="none"
          className="stroke-primary/20"
          strokeWidth="2"
          animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </g>
  );

  const renderEnvelope = () => (
    <g>
      {/* Envelope body */}
      <motion.rect
        x="80"
        y="90"
        width="140"
        height="100"
        rx="10"
        className="fill-card stroke-primary"
        strokeWidth="3"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Envelope flap */}
      <motion.path
        d="M80 95 L150 150 L220 95"
        fill="none"
        className="stroke-primary"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />
      
      {/* Check mark inside */}
      <motion.path
        d="M120 140 L140 160 L180 120"
        fill="none"
        className="stroke-accent"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      />
      
      {/* Floating sparkles */}
      {!prefersReducedMotion && [
        { cx: 60, cy: 80, delay: 0 },
        { cx: 240, cy: 100, delay: 0.3 },
        { cx: 70, cy: 200, delay: 0.6 },
        { cx: 230, cy: 180, delay: 0.9 },
      ].map((spark, i) => (
        <motion.circle
          key={i}
          cx={spark.cx}
          cy={spark.cy}
          r="4"
          className="fill-accent"
          animate={{ 
            scale: [0, 1, 0],
            opacity: [0, 1, 0]
          }}
          transition={{ duration: 2, repeat: Infinity, delay: spark.delay }}
        />
      ))}
    </g>
  );

  const renderKey = () => (
    <g>
      {/* Key body */}
      <motion.g
        initial={{ rotate: -30, x: -20 }}
        animate={{ rotate: 0, x: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
      >
        {/* Key head */}
        <circle cx="120" cy="140" r="35" className="fill-primary/20 stroke-primary" strokeWidth="4" />
        <circle cx="120" cy="140" r="15" className="fill-background stroke-primary" strokeWidth="3" />
        
        {/* Key shaft */}
        <rect x="150" y="132" width="80" height="16" rx="4" className="fill-primary" />
        
        {/* Key teeth */}
        <rect x="195" y="148" width="10" height="15" rx="2" className="fill-primary" />
        <rect x="210" y="148" width="10" height="20" rx="2" className="fill-primary" />
        <rect x="225" y="148" width="10" height="12" rx="2" className="fill-primary" />
      </motion.g>
      
      {/* Sparkle effects */}
      {!prefersReducedMotion && (
        <motion.g
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <circle cx="100" cy="100" r="3" className="fill-accent" />
          <circle cx="180" cy="110" r="4" className="fill-accent" />
          <circle cx="240" cy="160" r="3" className="fill-accent" />
        </motion.g>
      )}
    </g>
  );

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 300 280" className="w-full h-full">
        {/* Background glow */}
        <circle cx="150" cy="140" r="100" className="fill-primary/5" />
        
        {variant === "signin" && renderShield()}
        {variant === "signup" && renderShield()}
        {variant === "verify" && renderEnvelope()}
        {variant === "forgot" && renderKey()}
      </svg>
    </div>
  );
};

export default AuthIllustration;