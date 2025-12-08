import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface NotFoundIllustrationProps {
  className?: string;
}

export const NotFoundIllustration = ({ className = "" }: NotFoundIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 400 250" className="w-full h-full">
        {/* Background elements */}
        <motion.circle
          cx="200"
          cy="125"
          r="100"
          className="fill-muted/30"
          animate={prefersReducedMotion ? {} : { scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        
        {/* 4 - Left */}
        <motion.g
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.text
            x="80"
            y="160"
            className="fill-primary text-[80px] font-bold"
            animate={prefersReducedMotion ? {} : { y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            4
          </motion.text>
        </motion.g>
        
        {/* 0 - Center with face */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
        >
          <motion.circle
            cx="200"
            cy="120"
            r="50"
            className="fill-destructive/20 stroke-destructive"
            strokeWidth="6"
            animate={prefersReducedMotion ? {} : { 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.02, 0.98, 1]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          
          {/* Eyes */}
          <motion.g
            animate={prefersReducedMotion ? {} : { y: [0, 2, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <circle cx="180" cy="110" r="6" className="fill-destructive" />
            <circle cx="220" cy="110" r="6" className="fill-destructive" />
          </motion.g>
          
          {/* Sad mouth */}
          <motion.path
            d="M175 140 Q200 130 225 140"
            fill="none"
            className="stroke-destructive"
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          />
        </motion.g>
        
        {/* 4 - Right */}
        <motion.g
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <motion.text
            x="270"
            y="160"
            className="fill-primary text-[80px] font-bold"
            animate={prefersReducedMotion ? {} : { y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            4
          </motion.text>
        </motion.g>
        
        {/* Page not found text placeholder */}
        <motion.rect
          x="120"
          y="200"
          width="160"
          height="12"
          rx="6"
          className="fill-muted-foreground/30"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        />
        
        {/* Floating question marks */}
        {!prefersReducedMotion && [
          { x: 50, y: 80, delay: 0 },
          { x: 350, y: 100, delay: 0.5 },
          { x: 70, y: 180, delay: 1 },
          { x: 330, y: 170, delay: 1.5 },
        ].map((q, i) => (
          <motion.text
            key={i}
            x={q.x}
            y={q.y}
            className="fill-muted-foreground/40 text-2xl font-bold"
            animate={{ 
              y: [0, -15, 0],
              opacity: [0.3, 0.7, 0.3]
            }}
            transition={{ duration: 3, repeat: Infinity, delay: q.delay }}
          >
            ?
          </motion.text>
        ))}
        
        {/* Decorative dots */}
        {!prefersReducedMotion && (
          <>
            <motion.circle
              cx="100"
              cy="50"
              r="5"
              className="fill-accent/50"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.circle
              cx="300"
              cy="60"
              r="4"
              className="fill-primary/50"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}
      </svg>
    </div>
  );
};

export default NotFoundIllustration;