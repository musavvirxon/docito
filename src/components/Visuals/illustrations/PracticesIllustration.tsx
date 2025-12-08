import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface PracticesIllustrationProps {
  className?: string;
}

export const PracticesIllustration = ({ className = "" }: PracticesIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 400 300" className="w-full h-full">
        {/* Background */}
        <defs>
          <linearGradient id="practiceBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        {/* Ground */}
        <rect x="0" y="250" width="400" height="50" className="fill-muted/50" />

        {/* Main Building */}
        <motion.g
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Building body */}
          <rect x="120" y="100" width="160" height="150" rx="4" className="fill-card stroke-border" strokeWidth="2" />
          
          {/* Roof */}
          <polygon points="100,100 200,40 300,100" className="fill-primary" />
          
          {/* Cross symbol */}
          <motion.g
            animate={prefersReducedMotion ? {} : { scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <rect x="185" y="55" width="30" height="10" rx="2" className="fill-primary-foreground" />
            <rect x="195" y="45" width="10" height="30" rx="2" className="fill-primary-foreground" />
          </motion.g>
          
          {/* Windows */}
          {[
            { x: 135, y: 120 },
            { x: 175, y: 120 },
            { x: 215, y: 120 },
            { x: 135, y: 170 },
            { x: 175, y: 170 },
            { x: 215, y: 170 },
          ].map((win, i) => (
            <motion.rect
              key={i}
              x={win.x}
              y={win.y}
              width="30"
              height="35"
              rx="3"
              className="fill-primary/20 stroke-primary/40"
              strokeWidth="1"
              animate={prefersReducedMotion ? {} : { 
                fill: ["hsl(var(--primary) / 0.2)", "hsl(var(--primary) / 0.4)", "hsl(var(--primary) / 0.2)"]
              }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
          
          {/* Door */}
          <rect x="180" y="210" width="40" height="40" rx="3" className="fill-primary" />
          <circle cx="212" cy="230" r="3" className="fill-primary-foreground" />
        </motion.g>

        {/* Signboard */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <rect x="290" y="180" width="80" height="40" rx="6" className="fill-accent" />
          <rect x="300" y="190" width="60" height="6" rx="3" className="fill-accent-foreground/80" />
          <rect x="305" y="202" width="50" height="4" rx="2" className="fill-accent-foreground/60" />
          {/* Sign post */}
          <rect x="325" y="220" width="6" height="30" className="fill-muted-foreground" />
        </motion.g>

        {/* Calendar appearing */}
        <motion.g
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <rect x="30" y="140" width="70" height="60" rx="6" className="fill-card stroke-border" strokeWidth="1" />
          <rect x="30" y="140" width="70" height="15" rx="6" className="fill-primary" />
          {/* Calendar dots */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <motion.circle
              key={i}
              cx={45 + (i % 3) * 20}
              cy={165 + Math.floor(i / 3) * 15}
              r="4"
              className={i === 2 ? "fill-accent" : "fill-muted-foreground/30"}
              animate={prefersReducedMotion ? {} : i === 2 ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            />
          ))}
        </motion.g>

        {/* Doctor avatars inside building */}
        {!prefersReducedMotion && [
          { x: 150, y: 195, delay: 1 },
          { x: 180, y: 195, delay: 1.2 },
          { x: 210, y: 195, delay: 1.4 },
        ].map((doc, i) => (
          <motion.circle
            key={i}
            cx={doc.x}
            cy={doc.y}
            r="8"
            className="fill-primary/40"
            initial={{ y: 220, opacity: 0 }}
            animate={{ y: doc.y, opacity: 1 }}
            transition={{ duration: 0.4, delay: doc.delay }}
          />
        ))}

        {/* Floating particles */}
        {!prefersReducedMotion && [
          { cx: 50, cy: 80 },
          { cx: 350, cy: 100 },
          { cx: 320, cy: 60 },
        ].map((p, i) => (
          <motion.circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r="4"
            className="fill-accent/60"
            animate={{ 
              y: [0, -10, 0],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
      </svg>
    </div>
  );
};

export default PracticesIllustration;
