import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Shield, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { prefersReducedMotion } from "@/design/motion";

interface SearchBarAnimationProps {
  isTyping?: boolean;
  showSuggestions?: boolean;
}

const SearchBarAnimation = ({ isTyping = false, showSuggestions = false }: SearchBarAnimationProps) => {
  const reducedMotion = prefersReducedMotion();
  const [pulseActive, setPulseActive] = useState(true);

  useEffect(() => {
    if (isTyping) {
      setPulseActive(false);
    }
  }, [isTyping]);

  if (reducedMotion) {
    return (
      <div className="relative w-full max-w-2xl mx-auto">
        <div className="absolute -inset-4 bg-primary/5 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="relative w-full pointer-events-none">
      {/* Ambient glow behind search bar */}
      <motion.div
        className="absolute -inset-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-[40px] blur-2xl"
        animate={pulseActive ? {
          scale: [1, 1.02, 1],
          opacity: [0.5, 0.7, 0.5],
        } : {}}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Floating particles around search */}
      <div className="absolute inset-0 overflow-visible">
        {[
          { Icon: Search, x: -60, y: -40, delay: 0, size: 16 },
          { Icon: MapPin, x: 380, y: -30, delay: 0.5, size: 14 },
          { Icon: Shield, x: 420, y: 50, delay: 1, size: 12 },
          { Icon: Sparkles, x: -40, y: 60, delay: 1.5, size: 14 },
        ].map((particle, index) => (
          <motion.div
            key={index}
            className="absolute hidden lg:flex items-center justify-center"
            style={{ left: `calc(50% + ${particle.x}px)`, top: `calc(50% + ${particle.y}px)` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.6, 0.6, 0],
              scale: [0, 1, 1, 0],
              y: [0, -15, -15, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          >
            <div className="p-2 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20">
              <particle.Icon size={particle.size} className="text-primary" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Typing indicator animation */}
      <AnimatePresence>
        {isTyping && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 -top-12"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-full shadow-lg border border-border">
              <motion.div
                className="flex gap-1"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{ y: [0, -4, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: dot * 0.15,
                    }}
                  />
                ))}
              </motion.div>
              <span className="text-xs text-muted-foreground">Searching...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestion chips animation */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 -bottom-16 flex gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {["Dentist", "Cardiologist", "Dermatologist"].map((suggestion, index) => (
              <motion.div
                key={suggestion}
                className="px-3 py-1.5 bg-muted rounded-full text-xs font-medium text-muted-foreground border border-border"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {suggestion}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Corner accent decorations */}
      <motion.div
        className="absolute -left-16 -top-8 w-24 h-24 hidden lg:block"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full opacity-20">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="8 12"
            className="text-primary"
          />
        </svg>
      </motion.div>

      <motion.div
        className="absolute -right-16 -bottom-8 w-20 h-20 hidden lg:block"
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full opacity-15">
          <circle
            cx="50"
            cy="50"
            r="35"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="5 10"
            className="text-accent"
          />
        </svg>
      </motion.div>
    </div>
  );
};

export default SearchBarAnimation;
