import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface DoctorSearchIllustrationProps {
  className?: string;
}

export const DoctorSearchIllustration = ({ className = "" }: DoctorSearchIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 300 200" className="w-full h-full">
        {/* Background gradient */}
        <defs>
          <linearGradient id="searchBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="300" height="200" fill="url(#searchBg)" rx="12" />

        {/* Magnifying glass */}
        <motion.g
          animate={prefersReducedMotion ? {} : { 
            x: [0, 15, 0, -15, 0],
            y: [0, -5, 0, -5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <circle 
            cx="80" 
            cy="70" 
            r="30" 
            className="fill-none stroke-primary" 
            strokeWidth="4"
          />
          <line 
            x1="102" 
            y1="92" 
            x2="120" 
            y2="110" 
            className="stroke-primary" 
            strokeWidth="4" 
            strokeLinecap="round"
          />
          {/* Lens shine */}
          <motion.circle
            cx="70"
            cy="60"
            r="8"
            className="fill-primary/20"
            animate={prefersReducedMotion ? {} : { opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.g>

        {/* Doctor cards */}
        {[
          { x: 150, y: 40, delay: 0 },
          { x: 180, y: 80, delay: 0.2 },
          { x: 160, y: 120, delay: 0.4 },
        ].map((card, i) => (
          <motion.g
            key={i}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: card.delay }}
          >
            <motion.rect
              x={card.x}
              y={card.y}
              width="100"
              height="35"
              rx="8"
              className="fill-card stroke-border"
              strokeWidth="1"
              animate={prefersReducedMotion ? {} : { 
                y: [card.y, card.y - 3, card.y]
              }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: card.delay }}
            />
            {/* Avatar circle */}
            <circle cx={card.x + 20} cy={card.y + 17} r="10" className="fill-primary/20" />
            {/* Text lines */}
            <rect x={card.x + 35} y={card.y + 10} width="50" height="4" rx="2" className="fill-foreground/20" />
            <rect x={card.x + 35} y={card.y + 20} width="35" height="3" rx="1.5" className="fill-muted-foreground/30" />
          </motion.g>
        ))}

        {/* Location pins */}
        {!prefersReducedMotion && [
          { cx: 40, cy: 150 },
          { cx: 100, cy: 170 },
          { cx: 70, cy: 130 },
        ].map((pin, i) => (
          <motion.g
            key={i}
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
          >
            <circle cx={pin.cx} cy={pin.cy} r="6" className="fill-accent" />
            <circle cx={pin.cx} cy={pin.cy} r="3" className="fill-accent-foreground" />
          </motion.g>
        ))}

        {/* Radar pulse effect */}
        {!prefersReducedMotion && (
          <motion.circle
            cx="80"
            cy="70"
            r="35"
            className="fill-none stroke-primary/30"
            strokeWidth="2"
            animate={{ 
              r: [35, 60, 35],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </svg>
    </div>
  );
};

export default DoctorSearchIllustration;
