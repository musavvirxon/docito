import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Heart, Brain, Baby, Bone, Eye, Stethoscope } from "lucide-react";

interface SpecialtiesIllustrationProps {
  className?: string;
}

export const SpecialtiesIllustration = ({ className = "" }: SpecialtiesIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  const specialtyIcons = [
    { x: 40, y: 30, Icon: Heart, color: "text-rose-500", bgColor: "bg-rose-100 dark:bg-rose-900/30", delay: 0 },
    { x: 120, y: 20, Icon: Brain, color: "text-purple-500", bgColor: "bg-purple-100 dark:bg-purple-900/30", delay: 0.15 },
    { x: 200, y: 35, Icon: Eye, color: "text-sky-500", bgColor: "bg-sky-100 dark:bg-sky-900/30", delay: 0.3 },
    { x: 60, y: 100, Icon: Baby, color: "text-pink-500", bgColor: "bg-pink-100 dark:bg-pink-900/30", delay: 0.45 },
    { x: 140, y: 110, Icon: Bone, color: "text-amber-500", bgColor: "bg-amber-100 dark:bg-amber-900/30", delay: 0.6 },
    { x: 220, y: 95, Icon: Stethoscope, color: "text-emerald-500", bgColor: "bg-emerald-100 dark:bg-emerald-900/30", delay: 0.75 },
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Background decoration */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Connecting lines SVG */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 160">
        <motion.path
          d="M 55 45 Q 90 50 135 35"
          className="stroke-primary/20"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />
        <motion.path
          d="M 135 35 Q 170 40 215 50"
          className="stroke-accent/20"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        />
        <motion.path
          d="M 55 45 Q 60 75 75 115"
          className="stroke-primary/20"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        />
        <motion.path
          d="M 75 115 Q 110 120 155 125"
          className="stroke-accent/20"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
        />
        <motion.path
          d="M 215 50 Q 220 75 235 110"
          className="stroke-primary/20"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 1.3 }}
        />
      </svg>

      {/* Specialty Icons */}
      <div className="relative w-full h-40">
        {specialtyIcons.map((specialty, i) => (
          <motion.div
            key={i}
            className={`absolute flex items-center justify-center w-12 h-12 rounded-full ${specialty.bgColor} shadow-lg`}
            style={{ left: specialty.x, top: specialty.y }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 0.4, 
              delay: specialty.delay,
              type: "spring",
              stiffness: 200
            }}
            whileHover={!prefersReducedMotion ? { scale: 1.15, y: -5 } : undefined}
          >
            <specialty.Icon className={`w-6 h-6 ${specialty.color}`} strokeWidth={1.5} />
          </motion.div>
        ))}
      </div>

      {/* Floating sparkles */}
      {!prefersReducedMotion && (
        <>
          <motion.div
            className="absolute w-2 h-2 rounded-full bg-accent"
            style={{ left: 20, top: 60 }}
            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="absolute w-1.5 h-1.5 rounded-full bg-primary"
            style={{ left: 180, top: 70 }}
            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
          />
          <motion.div
            className="absolute w-2 h-2 rounded-full bg-accent"
            style={{ left: 100, top: 140 }}
            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1.4 }}
          />
        </>
      )}
    </div>
  );
};

export default SpecialtiesIllustration;
