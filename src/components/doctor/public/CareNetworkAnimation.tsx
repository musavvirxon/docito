import { motion, type Easing } from "framer-motion";

/**
 * A lightweight SVG animation showing the care network:
 * Patient → Doctor → Lab/Pharmacy/Imaging
 * Runs once on load for performance.
 */
export default function CareNetworkAnimation() {
  const easeInOut: Easing = [0.4, 0, 0.2, 1];
  const easeOut: Easing = [0, 0, 0.2, 1];

  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 1,
      transition: { duration: 2, ease: easeInOut }
    }
  };

  const nodeVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: 1,
      opacity: 1,
      transition: { delay: 0.3 + i * 0.2, duration: 0.5, ease: easeOut }
    })
  };

  const dotVariants = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
      opacity: [0, 1, 0],
      transition: { 
        delay: 1.5 + i * 0.3, 
        duration: 1.5, 
        repeat: 0,
        ease: easeInOut
      }
    })
  };

  return (
    <motion.svg
      viewBox="0 0 400 200"
      className="w-full max-w-md h-auto"
      initial="hidden"
      animate="visible"
    >
      {/* Connection Lines */}
      <motion.path
        d="M60 100 L140 100"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        variants={pathVariants}
      />
      <motion.path
        d="M200 100 L280 50"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        variants={pathVariants}
      />
      <motion.path
        d="M200 100 L280 100"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        variants={pathVariants}
      />
      <motion.path
        d="M200 100 L280 150"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        variants={pathVariants}
      />

      {/* Floating Dots on Paths */}
      {[
        { cx: 100, cy: 100 },
        { cx: 240, cy: 75 },
        { cx: 240, cy: 100 },
        { cx: 240, cy: 125 },
      ].map((dot, i) => (
        <motion.circle
          key={i}
          cx={dot.cx}
          cy={dot.cy}
          r="4"
          fill="hsl(var(--accent))"
          custom={i}
          variants={dotVariants}
        />
      ))}

      {/* Patient Node */}
      <motion.g custom={0} variants={nodeVariants}>
        <circle
          cx="40"
          cy="100"
          r="24"
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        <circle cx="40" cy="93" r="6" fill="hsl(var(--primary))" />
        <path
          d="M30 110 Q40 102 50 110"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </motion.g>

      {/* Doctor Node (Center) */}
      <motion.g custom={1} variants={nodeVariants}>
        <circle
          cx="170"
          cy="100"
          r="30"
          fill="hsl(var(--primary))"
        />
        <circle cx="170" cy="92" r="8" fill="hsl(var(--primary-foreground))" />
        <path
          d="M156 106 Q170 96 184 106"
          fill="none"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Stethoscope */}
        <circle
          cx="170"
          cy="115"
          r="4"
          fill="none"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth="2"
        />
      </motion.g>

      {/* Lab Node */}
      <motion.g custom={2} variants={nodeVariants}>
        <circle
          cx="320"
          cy="50"
          r="22"
          fill="hsl(var(--secondary))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        {/* Flask icon */}
        <path
          d="M314 42 L314 50 L308 60 L332 60 L326 50 L326 42 Z"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </motion.g>

      {/* Pharmacy Node */}
      <motion.g custom={3} variants={nodeVariants}>
        <circle
          cx="320"
          cy="100"
          r="22"
          fill="hsl(var(--secondary))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        {/* Rx symbol */}
        <text
          x="320"
          y="106"
          textAnchor="middle"
          fill="hsl(var(--primary))"
          fontSize="14"
          fontWeight="bold"
        >
          Rx
        </text>
      </motion.g>

      {/* Imaging Node */}
      <motion.g custom={4} variants={nodeVariants}>
        <circle
          cx="320"
          cy="150"
          r="22"
          fill="hsl(var(--secondary))"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        {/* X-ray icon */}
        <rect
          x="309"
          y="140"
          width="22"
          height="18"
          rx="2"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
        />
        <circle cx="320" cy="149" r="4" fill="hsl(var(--primary))" />
      </motion.g>

      {/* Labels */}
      <motion.text
        x="40"
        y="140"
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize="10"
        custom={5}
        variants={nodeVariants}
      >
        Patient
      </motion.text>
      <motion.text
        x="170"
        y="145"
        textAnchor="middle"
        fill="hsl(var(--foreground))"
        fontSize="11"
        fontWeight="600"
        custom={5}
        variants={nodeVariants}
      >
        Doctor
      </motion.text>
      <motion.text
        x="320"
        y="80"
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize="10"
        custom={6}
        variants={nodeVariants}
      >
        Lab
      </motion.text>
      <motion.text
        x="360"
        y="105"
        textAnchor="start"
        fill="hsl(var(--muted-foreground))"
        fontSize="10"
        custom={6}
        variants={nodeVariants}
      >
        Pharmacy
      </motion.text>
      <motion.text
        x="320"
        y="182"
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize="10"
        custom={6}
        variants={nodeVariants}
      >
        Imaging
      </motion.text>
    </motion.svg>
  );
}
