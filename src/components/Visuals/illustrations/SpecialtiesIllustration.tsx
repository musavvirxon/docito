import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface SpecialtiesIllustrationProps {
  className?: string;
}

export const SpecialtiesIllustration = ({ className = "" }: SpecialtiesIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  const specialtyIcons = [
    { cx: 60, cy: 50, color: "fill-primary", delay: 0 },
    { cx: 120, cy: 35, color: "fill-accent", delay: 0.15 },
    { cx: 180, cy: 55, color: "fill-primary", delay: 0.3 },
    { cx: 80, cy: 100, color: "fill-accent", delay: 0.45 },
    { cx: 160, cy: 110, color: "fill-primary", delay: 0.6 },
  ];

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 240 160" className="w-full h-full">
        {/* Background grid */}
        <motion.rect
          x="20"
          y="20"
          width="200"
          height="120"
          rx="16"
          className="fill-muted/30 stroke-border"
          strokeWidth="2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* Specialty circles with icons */}
        {specialtyIcons.map((icon, i) => (
          <motion.g key={i}>
            {/* Outer ring */}
            <motion.circle
              cx={icon.cx}
              cy={icon.cy}
              r="22"
              className="fill-background stroke-border"
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, delay: icon.delay }}
            />
            
            {/* Inner colored circle */}
            <motion.circle
              cx={icon.cx}
              cy={icon.cy}
              r="15"
              className={icon.color}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: icon.delay + 0.2 }}
            />

            {/* Icon placeholder (cross/medical symbol) */}
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: icon.delay + 0.3 }}
            >
              <rect
                x={icon.cx - 6}
                y={icon.cy - 2}
                width="12"
                height="4"
                rx="1"
                className="fill-primary-foreground"
              />
              <rect
                x={icon.cx - 2}
                y={icon.cy - 6}
                width="4"
                height="12"
                rx="1"
                className="fill-primary-foreground"
              />
            </motion.g>
          </motion.g>
        ))}

        {/* Connecting lines */}
        <motion.path
          d="M 60 50 Q 90 70 120 35"
          className="stroke-primary/30"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />
        <motion.path
          d="M 120 35 Q 150 45 180 55"
          className="stroke-primary/30"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        />
        <motion.path
          d="M 60 50 Q 70 75 80 100"
          className="stroke-accent/30"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        />
        <motion.path
          d="M 180 55 Q 170 82 160 110"
          className="stroke-accent/30"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
        />

        {/* Floating sparkles */}
        {!prefersReducedMotion && (
          <>
            <motion.circle
              cx="40"
              cy="30"
              r="3"
              className="fill-accent"
              animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            />
            <motion.circle
              cx="200"
              cy="80"
              r="2"
              className="fill-primary"
              animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
            />
            <motion.circle
              cx="120"
              cy="130"
              r="2.5"
              className="fill-accent"
              animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1.4 }}
            />
          </>
        )}
      </svg>
    </div>
  );
};

export default SpecialtiesIllustration;
