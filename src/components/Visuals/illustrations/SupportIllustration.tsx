import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface SupportIllustrationProps {
  className?: string;
}

export const SupportIllustration = ({ className = "" }: SupportIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 300 200" className="w-full h-full">
        {/* Agent with headset */}
        <motion.g
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Head */}
          <circle cx="100" cy="80" r="40" className="fill-primary/20" />
          <circle cx="100" cy="80" r="35" className="fill-card stroke-primary" strokeWidth="2" />
          
          {/* Face */}
          <circle cx="88" cy="75" r="4" className="fill-foreground/70" />
          <circle cx="112" cy="75" r="4" className="fill-foreground/70" />
          <path d="M 90 92 Q 100 100 110 92" className="fill-none stroke-foreground/70" strokeWidth="2" strokeLinecap="round" />
          
          {/* Headset */}
          <motion.g
            animate={prefersReducedMotion ? {} : { y: [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <path 
              d="M 60 70 Q 60 40 100 40 Q 140 40 140 70" 
              className="fill-none stroke-primary" 
              strokeWidth="5" 
              strokeLinecap="round"
            />
            <ellipse cx="60" cy="80" rx="8" ry="15" className="fill-primary" />
            <ellipse cx="140" cy="80" rx="8" ry="15" className="fill-primary" />
            {/* Microphone */}
            <rect x="52" y="100" width="16" height="8" rx="4" className="fill-primary" />
            <rect x="58" y="108" width="4" height="15" className="fill-primary/80" />
            <ellipse cx="60" cy="128" rx="10" ry="6" className="fill-foreground/60" />
          </motion.g>
        </motion.g>

        {/* Chat bubbles */}
        {[
          { x: 180, y: 40, width: 90, delay: 0.3, fromUser: true },
          { x: 170, y: 85, width: 100, delay: 0.6, fromUser: false },
          { x: 185, y: 130, width: 80, delay: 0.9, fromUser: true },
        ].map((bubble, i) => (
          <motion.g
            key={i}
            initial={{ x: bubble.fromUser ? 30 : -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: bubble.delay }}
          >
            <rect 
              x={bubble.x} 
              y={bubble.y} 
              width={bubble.width} 
              height="30" 
              rx="12" 
              className={bubble.fromUser ? "fill-primary/20" : "fill-accent/20"}
            />
            {/* Typing indicator */}
            {i === 2 && !prefersReducedMotion && (
              <g>
                {[0, 1, 2].map((dot) => (
                  <motion.circle
                    key={dot}
                    cx={bubble.x + 25 + dot * 12}
                    cy={bubble.y + 15}
                    r="3"
                    className="fill-primary"
                    animate={{ 
                      y: [0, -5, 0],
                      opacity: [0.4, 1, 0.4]
                    }}
                    transition={{ 
                      duration: 0.6, 
                      repeat: Infinity, 
                      delay: dot * 0.15 
                    }}
                  />
                ))}
              </g>
            )}
            {i !== 2 && (
              <>
                <rect x={bubble.x + 12} y={bubble.y + 10} width={bubble.width - 24} height="4" rx="2" className="fill-foreground/20" />
                <rect x={bubble.x + 12} y={bubble.y + 18} width={bubble.width * 0.5} height="3" rx="1.5" className="fill-foreground/15" />
              </>
            )}
          </motion.g>
        ))}

        {/* Email envelope */}
        <motion.g
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <rect x="40" y="150" width="50" height="35" rx="4" className="fill-accent" />
          <path d="M 40 155 L 65 175 L 90 155" className="fill-none stroke-accent-foreground" strokeWidth="2" />
          
          {/* Envelope opening animation */}
          {!prefersReducedMotion && (
            <motion.path
              d="M 40 155 L 65 140 L 90 155"
              className="fill-accent stroke-accent-foreground"
              strokeWidth="1"
              animate={{ 
                d: [
                  "M 40 155 L 65 155 L 90 155",
                  "M 40 155 L 65 135 L 90 155",
                  "M 40 155 L 65 155 L 90 155"
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
            />
          )}
        </motion.g>

        {/* Pulse rings around agent */}
        {!prefersReducedMotion && (
          <>
            <motion.circle
              cx="100"
              cy="80"
              r="50"
              className="fill-none stroke-primary/20"
              strokeWidth="2"
              animate={{ 
                r: [50, 70],
                opacity: [0.4, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.circle
              cx="100"
              cy="80"
              r="50"
              className="fill-none stroke-primary/20"
              strokeWidth="2"
              animate={{ 
                r: [50, 70],
                opacity: [0.4, 0]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            />
          </>
        )}
      </svg>
    </div>
  );
};

export default SupportIllustration;
