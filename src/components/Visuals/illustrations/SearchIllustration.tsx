import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface SearchIllustrationProps {
  variant?: "doctors" | "clinics";
  className?: string;
}

export const SearchIllustration = ({ variant = "doctors", className = "" }: SearchIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 200 150" className="w-full h-full">
        {/* Magnifying glass */}
        <motion.circle
          cx="80"
          cy="65"
          r="35"
          fill="none"
          className="stroke-primary"
          strokeWidth="5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1 }}
        />
        <motion.line
          x1="105"
          y1="90"
          x2="135"
          y2="120"
          className="stroke-primary"
          strokeWidth="8"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        />
        
        {/* Search pulse effect */}
        {!prefersReducedMotion && (
          <motion.circle
            cx="80"
            cy="65"
            r="35"
            fill="none"
            className="stroke-primary/30"
            strokeWidth="3"
            animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        
        {/* Result cards appearing */}
        {[
          { x: 130, y: 30, delay: 0.3, width: 55 },
          { x: 130, y: 55, delay: 0.5, width: 50 },
          { x: 130, y: 80, delay: 0.7, width: 45 },
        ].map((card, i) => (
          <motion.g key={i}>
            <motion.rect
              x={card.x}
              y={card.y}
              width={card.width}
              height="20"
              rx="4"
              className="fill-card stroke-border"
              strokeWidth="1"
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: card.x, opacity: 1 }}
              transition={{ duration: 0.4, delay: card.delay }}
            />
            {/* Avatar placeholder */}
            <motion.circle
              cx={card.x + 10}
              cy={card.y + 10}
              r="6"
              className="fill-primary/30"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: card.delay + 0.2 }}
            />
            {/* Text lines */}
            <motion.rect
              x={card.x + 20}
              y={card.y + 6}
              width="25"
              height="3"
              rx="1"
              className="fill-foreground/30"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3, delay: card.delay + 0.3 }}
            />
            <motion.rect
              x={card.x + 20}
              y={card.y + 12}
              width="18"
              height="2"
              rx="1"
              className="fill-muted-foreground/30"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3, delay: card.delay + 0.4 }}
            />
          </motion.g>
        ))}
        
        {/* Decorative dots */}
        {!prefersReducedMotion && [
          { cx: 20, cy: 30, delay: 0 },
          { cx: 45, cy: 120, delay: 0.5 },
          { cx: 180, cy: 130, delay: 1 },
        ].map((dot, i) => (
          <motion.circle
            key={i}
            cx={dot.cx}
            cy={dot.cy}
            r="4"
            className="fill-accent/60"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.4, 0.8, 0.4]
            }}
            transition={{ duration: 2, repeat: Infinity, delay: dot.delay }}
          />
        ))}
      </svg>
    </div>
  );
};

export default SearchIllustration;