import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface ContactIllustrationProps {
  className?: string;
}

export const ContactIllustration = ({ className = "" }: ContactIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 300 250" className="w-full h-full">
        {/* Background */}
        <rect x="30" y="30" width="240" height="190" rx="20" className="fill-muted/30" />
        
        {/* Chat bubbles */}
        <motion.g
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Left bubble */}
          <rect x="50" y="60" width="100" height="40" rx="10" className="fill-primary" />
          <polygon points="70,100 80,115 90,100" className="fill-primary" />
          
          {/* Text lines in left bubble */}
          <rect x="60" y="72" width="60" height="4" rx="2" className="fill-primary-foreground/70" />
          <rect x="60" y="82" width="40" height="4" rx="2" className="fill-primary-foreground/50" />
        </motion.g>
        
        <motion.g
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Right bubble */}
          <rect x="150" y="120" width="100" height="50" rx="10" className="fill-card stroke-border" strokeWidth="2" />
          <polygon points="230,170 220,185 210,170" className="fill-card stroke-border" strokeWidth="2" />
          
          {/* Text lines in right bubble */}
          <rect x="160" y="132" width="70" height="4" rx="2" className="fill-muted-foreground/40" />
          <rect x="160" y="142" width="50" height="4" rx="2" className="fill-muted-foreground/30" />
          <rect x="160" y="152" width="60" height="4" rx="2" className="fill-muted-foreground/30" />
        </motion.g>
        
        {/* Typing indicator */}
        <motion.g
          animate={prefersReducedMotion ? {} : { opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={70 + i * 12}
              cy="200"
              r="5"
              className="fill-primary/60"
              animate={prefersReducedMotion ? {} : { y: [0, -5, 0] }}
              transition={{ 
                duration: 0.6, 
                repeat: Infinity, 
                delay: i * 0.15 
              }}
            />
          ))}
        </motion.g>
        
        {/* Envelope icon */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <rect x="200" y="50" width="60" height="40" rx="5" className="fill-accent/20 stroke-accent" strokeWidth="2" />
          <path d="M200 55 L230 75 L260 55" className="stroke-accent fill-none" strokeWidth="2" strokeLinecap="round" />
        </motion.g>
        
        {/* Floating elements */}
        {!prefersReducedMotion && (
          <>
            <motion.circle
              cx="40"
              cy="150"
              r="6"
              className="fill-primary/30"
              animate={{ y: [0, -15, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.circle
              cx="270"
              cy="100"
              r="8"
              className="fill-accent/30"
              animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}
      </svg>
    </div>
  );
};

export default ContactIllustration;