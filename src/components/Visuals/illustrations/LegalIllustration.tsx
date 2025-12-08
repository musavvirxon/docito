import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface LegalIllustrationProps {
  className?: string;
}

export const LegalIllustration = ({ className = "" }: LegalIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 300 200" className="w-full h-full">
        {/* Scales of Justice */}
        <motion.g
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Center pillar */}
          <rect x="145" y="60" width="10" height="120" className="fill-primary" />
          <rect x="135" y="175" width="30" height="10" rx="2" className="fill-primary" />
          
          {/* Top ornament */}
          <circle cx="150" cy="55" r="10" className="fill-primary" />
          
          {/* Balance beam */}
          <motion.g
            animate={prefersReducedMotion ? {} : { rotate: [-3, 3, -3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "150px 55px" }}
          >
            <rect x="60" y="52" width="180" height="6" rx="3" className="fill-muted-foreground" />
            
            {/* Left chain */}
            <line x1="80" y1="58" x2="80" y2="95" className="stroke-muted-foreground" strokeWidth="2" />
            
            {/* Left scale pan */}
            <motion.g>
              <ellipse cx="80" cy="100" rx="35" ry="10" className="fill-primary/20 stroke-primary" strokeWidth="2" />
              {/* Document on left scale */}
              <rect x="65" y="85" width="30" height="12" rx="2" className="fill-card stroke-border" strokeWidth="1" />
            </motion.g>
            
            {/* Right chain */}
            <line x1="220" y1="58" x2="220" y2="95" className="stroke-muted-foreground" strokeWidth="2" />
            
            {/* Right scale pan */}
            <motion.g>
              <ellipse cx="220" cy="100" rx="35" ry="10" className="fill-primary/20 stroke-primary" strokeWidth="2" />
              {/* Shield on right scale */}
              <path d="M 210 75 L 210 90 Q 220 100 230 90 L 230 75 L 220 70 Z" className="fill-accent" />
            </motion.g>
          </motion.g>
        </motion.g>

        {/* Document scroll */}
        <motion.g
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <rect x="20" y="130" width="50" height="60" rx="3" className="fill-card stroke-border" strokeWidth="1" />
          {/* Scroll top curl */}
          <ellipse cx="45" cy="130" rx="25" ry="8" className="fill-card stroke-border" strokeWidth="1" />
          {/* Text lines */}
          {[0, 1, 2, 3].map((i) => (
            <motion.rect
              key={i}
              x="28"
              y={145 + i * 12}
              width={35 - (i % 2) * 10}
              height="4"
              rx="2"
              className="fill-muted-foreground/30"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}
            />
          ))}
        </motion.g>

        {/* Gavel */}
        <motion.g
          initial={{ rotate: -20, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <motion.g
            animate={prefersReducedMotion ? {} : { rotate: [0, -15, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            style={{ transformOrigin: "260px 150px" }}
          >
            {/* Handle */}
            <rect x="255" y="150" width="8" height="40" rx="2" className="fill-muted-foreground" />
            {/* Head */}
            <rect x="240" y="140" width="40" height="18" rx="4" className="fill-primary" />
          </motion.g>
          {/* Sound block */}
          <ellipse cx="260" y="185" rx="30" ry="8" className="fill-primary/30" />
        </motion.g>

        {/* Privacy shield */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.8, type: "spring" }}
        >
          <motion.path
            d="M 150 15 L 130 25 L 130 45 Q 140 55 150 55 Q 160 55 170 45 L 170 25 Z"
            className="fill-accent stroke-accent"
            strokeWidth="2"
            animate={prefersReducedMotion ? {} : { scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {/* Checkmark */}
          <motion.path
            d="M 140 35 L 147 42 L 160 28"
            className="fill-none stroke-accent-foreground"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
          />
        </motion.g>

        {/* Floating particles */}
        {!prefersReducedMotion && [
          { cx: 100, cy: 40, delay: 0 },
          { cx: 200, cy: 35, delay: 0.3 },
          { cx: 280, cy: 120, delay: 0.6 },
        ].map((p, i) => (
          <motion.circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r="3"
            className="fill-primary/40"
            animate={{ 
              y: [0, -8, 0],
              opacity: [0.3, 0.8, 0.3]
            }}
            transition={{ duration: 2.5, repeat: Infinity, delay: p.delay }}
          />
        ))}
      </svg>
    </div>
  );
};

export default LegalIllustration;
