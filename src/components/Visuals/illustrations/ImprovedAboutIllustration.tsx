import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface ImprovedAboutIllustrationProps {
  className?: string;
}

export const ImprovedAboutIllustration = ({ className = "" }: ImprovedAboutIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 400 300" className="w-full h-full">
        {/* Background glow */}
        <defs>
          <radialGradient id="aboutGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="150" r="140" fill="url(#aboutGlow)" />

        {/* Central Docito hub */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          <motion.circle
            cx="200"
            cy="150"
            r="50"
            className="fill-primary"
            animate={prefersReducedMotion ? {} : { scale: [1, 1.02, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.circle
            cx="200"
            cy="150"
            r="42"
            className="fill-primary-foreground/10"
          />
          {/* Cross symbol */}
          <rect x="190" y="130" width="20" height="8" rx="2" className="fill-primary-foreground" />
          <rect x="196" y="124" width="8" height="20" rx="2" className="fill-primary-foreground" />
          <text x="200" y="170" textAnchor="middle" className="fill-primary-foreground text-[10px] font-bold">
            DOCITO
          </text>
        </motion.g>

        {/* Team members orbiting */}
        {[
          { angle: 0, label: "Doctors", icon: "👨‍⚕️", color: "fill-accent" },
          { angle: 72, label: "Patients", icon: "👤", color: "fill-primary/60" },
          { angle: 144, label: "Clinics", icon: "🏥", color: "fill-accent/80" },
          { angle: 216, label: "Staff", icon: "👩‍💼", color: "fill-primary/70" },
          { angle: 288, label: "Admin", icon: "⚙️", color: "fill-muted-foreground" },
        ].map((member, i) => {
          const radius = 100;
          const x = 200 + Math.cos((member.angle - 90) * Math.PI / 180) * radius;
          const y = 150 + Math.sin((member.angle - 90) * Math.PI / 180) * radius;
          
          return (
            <motion.g
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
            >
              {/* Connection line */}
              <motion.line
                x1="200"
                y1="150"
                x2={x}
                y2={y}
                className="stroke-border"
                strokeWidth="2"
                strokeDasharray="4 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
              />
              
              {/* Node */}
              <motion.circle
                cx={x}
                cy={y}
                r="28"
                className={`${member.color} stroke-border`}
                strokeWidth="2"
                animate={prefersReducedMotion ? {} : { 
                  y: [y, y - 5, y],
                }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
              />
              <circle cx={x} cy={y} r="22" className="fill-card" />
              <text x={x} y={y + 5} textAnchor="middle" className="text-lg">
                {member.icon}
              </text>
              <text x={x} y={y + 45} textAnchor="middle" className="fill-foreground text-[9px] font-medium">
                {member.label}
              </text>
            </motion.g>
          );
        })}

        {/* Data flow particles */}
        {!prefersReducedMotion && [0, 1, 2, 3, 4].map((i) => {
          const angle = i * 72;
          return (
            <motion.circle
              key={i}
              r="4"
              className="fill-accent"
              animate={{
                cx: [200, 200 + Math.cos((angle - 90) * Math.PI / 180) * 80],
                cy: [150, 150 + Math.sin((angle - 90) * Math.PI / 180) * 80],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.4,
              }}
            />
          );
        })}

        {/* Mission badge */}
        <motion.g
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          <rect x="30" y="230" width="100" height="35" rx="8" className="fill-card stroke-primary/30" strokeWidth="1" />
          <rect x="40" y="240" width="15" height="15" rx="3" className="fill-primary" />
          <text x="60" y="252" className="fill-foreground text-[10px] font-medium">Mission</text>
          <rect x="40" y="258" width="80" height="3" rx="1" className="fill-muted-foreground/20" />
        </motion.g>

        {/* Vision badge */}
        <motion.g
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <rect x="270" y="230" width="100" height="35" rx="8" className="fill-card stroke-accent/30" strokeWidth="1" />
          <rect x="280" y="240" width="15" height="15" rx="3" className="fill-accent" />
          <text x="300" y="252" className="fill-foreground text-[10px] font-medium">Vision</text>
          <rect x="280" y="258" width="80" height="3" rx="1" className="fill-muted-foreground/20" />
        </motion.g>

        {/* Ambient particles */}
        {!prefersReducedMotion && [
          { cx: 50, cy: 60 },
          { cx: 350, cy: 80 },
          { cx: 320, cy: 200 },
          { cx: 80, cy: 180 },
        ].map((p, i) => (
          <motion.circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r="5"
            className="fill-primary/30"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.7, 0.3]
            }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
      </svg>
    </div>
  );
};

export default ImprovedAboutIllustration;
