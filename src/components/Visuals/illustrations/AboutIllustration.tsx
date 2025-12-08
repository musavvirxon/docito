import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface AboutIllustrationProps {
  className?: string;
}

export const AboutIllustration = ({ className = "" }: AboutIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 400 300" className="w-full h-full">
        {/* Background circles */}
        <motion.circle
          cx="200"
          cy="150"
          r="120"
          className="fill-primary/5"
          animate={prefersReducedMotion ? {} : { scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Team collaboration illustration */}
        {/* Central hub */}
        <motion.circle
          cx="200"
          cy="150"
          r="40"
          className="fill-primary/20 stroke-primary"
          strokeWidth="3"
          animate={prefersReducedMotion ? {} : { scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <text x="200" y="155" textAnchor="middle" className="fill-primary text-xs font-bold">
          Docito
        </text>
        
        {/* Connected nodes - team members */}
        {[
          { cx: 100, cy: 80, label: "Docs", delay: 0 },
          { cx: 300, cy: 80, label: "Pts", delay: 0.3 },
          { cx: 100, cy: 220, label: "Staff", delay: 0.6 },
          { cx: 300, cy: 220, label: "Admin", delay: 0.9 },
        ].map((node, i) => (
          <g key={i}>
            {/* Connection line */}
            <motion.line
              x1="200"
              y1="150"
              x2={node.cx}
              y2={node.cy}
              className="stroke-border"
              strokeWidth="2"
              strokeDasharray="6 4"
              initial={{ pathLength: 0 }}
              animate={prefersReducedMotion ? { pathLength: 1 } : { pathLength: [0, 1] }}
              transition={{ duration: 1, delay: node.delay }}
            />
            {/* Node circle */}
            <motion.circle
              cx={node.cx}
              cy={node.cy}
              r="30"
              className="fill-card stroke-primary"
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={prefersReducedMotion ? { scale: 1 } : { scale: 1, y: [0, -5, 0] }}
              transition={{ 
                scale: { duration: 0.4, delay: node.delay },
                y: { duration: 3, repeat: Infinity, delay: node.delay }
              }}
            />
            <text x={node.cx} y={node.cy + 4} textAnchor="middle" className="fill-foreground text-[10px] font-medium">
              {node.label}
            </text>
          </g>
        ))}
        
        {/* Floating particles */}
        {!prefersReducedMotion && [
          { cx: 150, cy: 100, delay: 0 },
          { cx: 250, cy: 100, delay: 0.5 },
          { cx: 150, cy: 200, delay: 1 },
          { cx: 250, cy: 200, delay: 1.5 },
        ].map((particle, i) => (
          <motion.circle
            key={i}
            cx={particle.cx}
            cy={particle.cy}
            r="4"
            className="fill-accent"
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
              x: [0, 10, 0],
              y: [0, -10, 0]
            }}
            transition={{ duration: 2.5, repeat: Infinity, delay: particle.delay }}
          />
        ))}
      </svg>
    </div>
  );
};

export default AboutIllustration;