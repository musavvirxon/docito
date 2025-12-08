import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface HelpCenterIllustrationProps {
  className?: string;
}

export const HelpCenterIllustration = ({ className = "" }: HelpCenterIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 300 200" className="w-full h-full">
        {/* Book / Knowledge base */}
        <motion.g
          initial={{ rotateY: -20 }}
          animate={{ rotateY: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Book cover back */}
          <rect x="60" y="50" width="120" height="140" rx="4" className="fill-primary" />
          
          {/* Pages */}
          {[0, 1, 2, 3].map((i) => (
            <motion.rect
              key={i}
              x={65 + i * 2}
              y={55 + i}
              width="110"
              height="130"
              rx="2"
              className="fill-card"
              initial={{ x: 0 }}
              animate={prefersReducedMotion ? {} : { x: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
          
          {/* Current page content */}
          <rect x="75" y="70" width="90" height="100" rx="2" className="fill-card stroke-border" strokeWidth="1" />
          
          {/* Text lines */}
          {[0, 1, 2, 3, 4].map((line) => (
            <motion.rect
              key={line}
              x="85"
              y={85 + line * 15}
              width={70 - (line % 2) * 15}
              height="5"
              rx="2"
              className="fill-muted-foreground/30"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3, delay: 0.5 + line * 0.1 }}
            />
          ))}
          
          {/* Book spine */}
          <rect x="60" y="50" width="8" height="140" rx="2" className="fill-primary" />
        </motion.g>

        {/* Question mark floating */}
        <motion.g
          animate={prefersReducedMotion ? {} : { 
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <circle cx="220" cy="60" r="30" className="fill-accent/20" />
          <text 
            x="220" 
            y="72" 
            textAnchor="middle" 
            className="fill-accent text-3xl font-bold"
            style={{ fontFamily: 'system-ui' }}
          >
            ?
          </text>
        </motion.g>

        {/* Light bulb (idea) */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <motion.g
            animate={prefersReducedMotion ? {} : { scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {/* Bulb glow */}
            <circle cx="230" cy="140" r="25" className="fill-accent/20" />
            
            {/* Bulb shape */}
            <ellipse cx="230" cy="135" rx="18" ry="22" className="fill-accent/80" />
            <rect x="222" y="155" width="16" height="10" rx="2" className="fill-muted-foreground" />
            
            {/* Light rays */}
            {!prefersReducedMotion && [0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <motion.line
                key={i}
                x1={230 + Math.cos(angle * Math.PI / 180) * 25}
                y1={135 + Math.sin(angle * Math.PI / 180) * 25}
                x2={230 + Math.cos(angle * Math.PI / 180) * 35}
                y2={135 + Math.sin(angle * Math.PI / 180) * 35}
                className="stroke-accent"
                strokeWidth="2"
                strokeLinecap="round"
                animate={{ 
                  opacity: [0.3, 1, 0.3],
                  strokeWidth: [1, 3, 1]
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </motion.g>
        </motion.g>

        {/* Search magnifier */}
        <motion.g
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <circle cx="35" cy="100" r="20" className="fill-none stroke-primary" strokeWidth="3" />
          <line x1="50" y1="115" x2="65" y2="130" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
        </motion.g>

        {/* Floating documents */}
        {[
          { x: 200, y: 180, delay: 0.6 },
          { x: 240, y: 175, delay: 0.8 },
        ].map((doc, i) => (
          <motion.g
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: doc.delay }}
          >
            <motion.rect
              x={doc.x}
              y={doc.y}
              width="25"
              height="30"
              rx="3"
              className="fill-card stroke-border"
              strokeWidth="1"
              animate={prefersReducedMotion ? {} : { y: [doc.y, doc.y - 5, doc.y] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            />
            <rect x={doc.x + 4} y={doc.y + 6} width="17" height="2" rx="1" className="fill-muted-foreground/30" />
            <rect x={doc.x + 4} y={doc.y + 12} width="12" height="2" rx="1" className="fill-muted-foreground/20" />
          </motion.g>
        ))}

        {/* Connection dots */}
        {!prefersReducedMotion && (
          <motion.g>
            <motion.circle
              cx="180"
              cy="100"
              r="4"
              className="fill-primary"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.circle
              cx="195"
              cy="80"
              r="3"
              className="fill-accent"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
          </motion.g>
        )}
      </svg>
    </div>
  );
};

export default HelpCenterIllustration;
