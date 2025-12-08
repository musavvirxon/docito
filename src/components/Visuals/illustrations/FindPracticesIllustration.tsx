import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Building2, MapPin, Search, Star, Users } from "lucide-react";

interface FindPracticesIllustrationProps {
  className?: string;
}

export const FindPracticesIllustration = ({ className = "" }: FindPracticesIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  const practiceCards = [
    { x: 20, y: 40, delay: 0, Icon: Building2, color: "text-emerald-500", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
    { x: 100, y: 25, delay: 0.2, Icon: Star, color: "text-amber-500", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
    { x: 180, y: 45, delay: 0.4, Icon: Users, color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
    { x: 60, y: 100, delay: 0.6, Icon: MapPin, color: "text-rose-500", bgColor: "bg-rose-100 dark:bg-rose-900/30" },
    { x: 150, y: 110, delay: 0.8, Icon: Search, color: "text-purple-500", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Background gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Connecting lines */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 260 160">
        <motion.path
          d="M 45 55 Q 75 45 125 40"
          className="stroke-primary/20"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />
        <motion.path
          d="M 125 40 Q 160 50 205 60"
          className="stroke-accent/20"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        />
        <motion.path
          d="M 45 55 Q 55 80 85 115"
          className="stroke-primary/20"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        />
        <motion.path
          d="M 85 115 Q 120 120 175 125"
          className="stroke-accent/20"
          strokeWidth="2"
          fill="none"
          strokeDasharray="4 4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
        />
      </svg>

      {/* Practice icons */}
      <div className="relative w-full h-40">
        {practiceCards.map((practice, i) => (
          <motion.div
            key={i}
            className={`absolute flex items-center justify-center w-14 h-14 rounded-xl ${practice.bgColor} shadow-lg border border-border/50`}
            style={{ left: practice.x, top: practice.y }}
            initial={{ scale: 0, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ 
              duration: 0.4, 
              delay: practice.delay,
              type: "spring",
              stiffness: 200
            }}
            whileHover={!prefersReducedMotion ? { scale: 1.15, y: -5, rotate: 5 } : undefined}
          >
            <practice.Icon className={`w-7 h-7 ${practice.color}`} strokeWidth={1.5} />
          </motion.div>
        ))}
      </div>

      {/* Floating sparkles */}
      {!prefersReducedMotion && (
        <>
          <motion.div
            className="absolute w-2 h-2 rounded-full bg-accent"
            style={{ left: 10, top: 80 }}
            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="absolute w-1.5 h-1.5 rounded-full bg-primary"
            style={{ left: 220, top: 30 }}
            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
          />
          <motion.div
            className="absolute w-2 h-2 rounded-full bg-accent"
            style={{ left: 120, top: 145 }}
            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1.4 }}
          />
        </>
      )}
    </div>
  );
};

export default FindPracticesIllustration;
