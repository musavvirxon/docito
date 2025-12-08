import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface FAQsIllustrationProps {
  className?: string;
}

export const FAQsIllustration = ({ className = "" }: FAQsIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  const questions = [
    { y: 30, width: 140, delay: 0 },
    { y: 60, width: 120, delay: 0.15 },
    { y: 90, width: 130, delay: 0.3 },
  ];

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 240 160" className="w-full h-full">
        {/* Main card background */}
        <motion.rect
          x="30"
          y="15"
          width="180"
          height="130"
          rx="12"
          className="fill-card stroke-border"
          strokeWidth="2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        />

        {/* Question mark circle */}
        <motion.circle
          cx="60"
          cy="45"
          r="18"
          className="fill-primary"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2, type: "spring" }}
        />
        <motion.text
          x="60"
          y="52"
          textAnchor="middle"
          className="fill-primary-foreground text-xl font-bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          ?
        </motion.text>

        {/* Question lines (accordion style) */}
        {questions.map((q, i) => (
          <motion.g key={i}>
            {/* Question bar */}
            <motion.rect
              x="45"
              y={q.y + 35}
              width={q.width}
              height="20"
              rx="4"
              className="fill-muted"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: q.delay + 0.3 }}
              style={{ originX: 0 }}
            />
            
            {/* Chevron indicator */}
            <motion.path
              d={`M ${190} ${q.y + 42} l 6 5 l 6 -5`}
              className="stroke-muted-foreground"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: q.delay + 0.5 }}
            />
          </motion.g>
        ))}

        {/* Answer bubble popping out */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8, type: "spring" }}
        >
          <rect
            x="55"
            y="80"
            width="100"
            height="8"
            rx="2"
            className="fill-accent/50"
          />
          <rect
            x="55"
            y="92"
            width="80"
            height="6"
            rx="2"
            className="fill-accent/30"
          />
        </motion.g>

        {/* Light bulb / idea indicator */}
        <motion.g
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <circle cx="185" cy="35" r="14" className="fill-accent/20" />
          <motion.circle
            cx="185"
            cy="35"
            r="8"
            className="fill-accent"
            animate={!prefersReducedMotion ? { 
              scale: [1, 1.1, 1],
              opacity: [0.8, 1, 0.8]
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {/* Bulb rays */}
          {!prefersReducedMotion && [0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <motion.line
              key={i}
              x1={185 + Math.cos(angle * Math.PI / 180) * 12}
              y1={35 + Math.sin(angle * Math.PI / 180) * 12}
              x2={185 + Math.cos(angle * Math.PI / 180) * 16}
              y2={35 + Math.sin(angle * Math.PI / 180) * 16}
              className="stroke-accent"
              strokeWidth="2"
              strokeLinecap="round"
              animate={{ 
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1, 0.8]
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                delay: i * 0.1 
              }}
            />
          ))}
        </motion.g>

        {/* Floating question marks */}
        {!prefersReducedMotion && (
          <>
            <motion.text
              x="25"
              y="80"
              className="fill-primary/20 text-lg font-bold"
              animate={{ y: [0, -5, 0], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              ?
            </motion.text>
            <motion.text
              x="215"
              y="100"
              className="fill-accent/30 text-sm font-bold"
              animate={{ y: [0, -8, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            >
              ?
            </motion.text>
          </>
        )}
      </svg>
    </div>
  );
};

export default FAQsIllustration;
