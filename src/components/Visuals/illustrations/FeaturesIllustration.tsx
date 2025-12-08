import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface FeaturesIllustrationProps {
  feature?: "appointments" | "prescriptions" | "files" | "notes" | "telemedicine" | "analytics";
  className?: string;
}

export const FeaturesIllustration = ({ feature = "appointments", className = "" }: FeaturesIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  const renderAppointments = () => (
    <g>
      {/* Calendar base */}
      <motion.rect
        x="50"
        y="40"
        width="100"
        height="90"
        rx="10"
        className="fill-card stroke-border"
        strokeWidth="2"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Calendar header */}
      <rect x="50" y="40" width="100" height="25" rx="10" className="fill-primary" />
      
      {/* Calendar rings */}
      <circle cx="70" cy="40" r="4" className="fill-muted-foreground" />
      <circle cx="130" cy="40" r="4" className="fill-muted-foreground" />
      
      {/* Date cells */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.rect
          key={i}
          x={60 + (i % 3) * 28}
          y={75 + Math.floor(i / 3) * 22}
          width="20"
          height="16"
          rx="4"
          className={i === 2 ? "fill-accent" : "fill-muted/50"}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
        />
      ))}
      
      {/* Animated selection */}
      {!prefersReducedMotion && (
        <motion.rect
          x="116"
          y="75"
          width="20"
          height="16"
          rx="4"
          fill="none"
          className="stroke-primary"
          strokeWidth="2"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </g>
  );

  const renderPrescriptions = () => (
    <g>
      {/* Prescription paper */}
      <motion.rect
        x="55"
        y="25"
        width="90"
        height="120"
        rx="6"
        className="fill-card stroke-border"
        strokeWidth="2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Rx symbol */}
      <text x="65" y="55" className="fill-primary text-xl font-bold">℞</text>
      
      {/* Text lines */}
      {[0, 1, 2, 3].map((i) => (
        <motion.rect
          key={i}
          x="65"
          y={70 + i * 18}
          width={60 - i * 10}
          height="6"
          rx="3"
          className="fill-muted-foreground/30"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
          style={{ originX: 0 }}
        />
      ))}
      
      {/* Animated pen */}
      {!prefersReducedMotion && (
        <motion.g
          animate={{ x: [0, 30, 0], y: [0, 5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <path d="M120 50 L135 35 L140 40 L125 55 L118 57 Z" className="fill-primary" />
        </motion.g>
      )}
    </g>
  );

  const renderFiles = () => (
    <g>
      {/* Folder back */}
      <rect x="40" y="50" width="120" height="85" rx="6" className="fill-muted stroke-border" strokeWidth="2" />
      
      {/* Folder tab */}
      <path d="M40 50 L40 40 L80 40 L90 50" className="fill-muted stroke-border" strokeWidth="2" />
      
      {/* Files inside */}
      {[0, 1, 2].map((i) => (
        <motion.rect
          key={i}
          x={55 + i * 8}
          y={60 + i * 5}
          width="70"
          height="50"
          rx="4"
          className="fill-card stroke-border"
          strokeWidth="1"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 + i * 0.15, type: "spring" }}
        />
      ))}
      
      {/* Animated file moving */}
      {!prefersReducedMotion && (
        <motion.rect
          x="90"
          y="70"
          width="50"
          height="35"
          rx="3"
          className="fill-accent/30 stroke-accent"
          strokeWidth="1"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </g>
  );

  const renderNotes = () => (
    <g>
      {/* Notepad */}
      <motion.rect
        x="50"
        y="30"
        width="100"
        height="110"
        rx="6"
        className="fill-card stroke-border"
        strokeWidth="2"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Notepad lines */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={i}
          x1="60"
          y1={50 + i * 16}
          x2="140"
          y2={50 + i * 16}
          className="stroke-muted-foreground/20"
          strokeWidth="1"
        />
      ))}
      
      {/* Written text lines */}
      {[0, 1, 2].map((i) => (
        <motion.rect
          key={i}
          x="60"
          y={45 + i * 16}
          width={50 + Math.random() * 30}
          height="4"
          rx="2"
          className="fill-foreground/40"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
          style={{ originX: 0 }}
        />
      ))}
      
      {/* Animated cursor */}
      {!prefersReducedMotion && (
        <motion.rect
          x="60"
          y="93"
          width="2"
          height="12"
          className="fill-primary"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </g>
  );

  const renderTelemedicine = () => (
    <g>
      {/* Video screen */}
      <motion.rect
        x="40"
        y="35"
        width="120"
        height="80"
        rx="8"
        className="fill-card stroke-border"
        strokeWidth="2"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Doctor avatar */}
      <circle cx="100" cy="70" r="25" className="fill-primary/20" />
      <circle cx="100" cy="62" r="12" className="fill-primary/40" />
      <path d="M75 95 Q100 80 125 95" className="fill-primary/40" />
      
      {/* Video controls */}
      <rect x="60" y="120" width="80" height="15" rx="7" className="fill-muted" />
      <circle cx="80" cy="127" r="5" className="fill-destructive" />
      <circle cx="100" cy="127" r="5" className="fill-accent" />
      <circle cx="120" cy="127" r="5" className="fill-primary" />
      
      {/* Connection waves */}
      {!prefersReducedMotion && [0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx="160"
          cy="50"
          r={8 + i * 6}
          fill="none"
          className="stroke-accent/50"
          strokeWidth="2"
          animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
    </g>
  );

  const renderAnalytics = () => (
    <g>
      {/* Chart background */}
      <rect x="40" y="30" width="120" height="100" rx="8" className="fill-card stroke-border" strokeWidth="2" />
      
      {/* Grid lines */}
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1="50"
          y1={50 + i * 20}
          x2="150"
          y2={50 + i * 20}
          className="stroke-muted-foreground/10"
          strokeWidth="1"
        />
      ))}
      
      {/* Bar chart */}
      {[
        { x: 55, h: 50, color: "fill-primary" },
        { x: 75, h: 70, color: "fill-primary" },
        { x: 95, h: 35, color: "fill-primary" },
        { x: 115, h: 55, color: "fill-accent" },
        { x: 135, h: 80, color: "fill-accent" },
      ].map((bar, i) => (
        <motion.rect
          key={i}
          x={bar.x}
          y={120 - bar.h}
          width="15"
          height={bar.h}
          rx="3"
          className={bar.color}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
          style={{ originY: 1 }}
        />
      ))}
      
      {/* Trend line */}
      {!prefersReducedMotion && (
        <motion.path
          d="M55 90 Q85 50 115 70 T155 40"
          fill="none"
          className="stroke-accent"
          strokeWidth="2"
          strokeDasharray="5 3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 0.8 }}
        />
      )}
    </g>
  );

  const renderFeature = () => {
    switch (feature) {
      case "appointments": return renderAppointments();
      case "prescriptions": return renderPrescriptions();
      case "files": return renderFiles();
      case "notes": return renderNotes();
      case "telemedicine": return renderTelemedicine();
      case "analytics": return renderAnalytics();
      default: return renderAppointments();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 200 170" className="w-full h-full">
        {renderFeature()}
      </svg>
    </div>
  );
};

export default FeaturesIllustration;