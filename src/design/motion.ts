// Motion presets for consistent animations across the app
// Uses Framer Motion transition specifications

export const motionPresets = {
  // Entrance animations for page elements
  entrance: {
    duration: 0.5,
    ease: [0.2, 0.8, 0.2, 1],
  },
  
  // Micro-interactions (hover, focus, etc.)
  micro: {
    duration: 0.2,
    ease: "easeOut",
  },
  
  // Slow, subtle animations for backgrounds
  subtle: {
    duration: 0.7,
    ease: [0.4, 0, 0.2, 1],
  },
  
  // Spring animation for bouncy effects
  spring: {
    type: "spring",
    stiffness: 300,
    damping: 20,
  },
  
  // Stagger children animations
  stagger: {
    staggerChildren: 0.1,
    delayChildren: 0.2,
  },
};

// Reusable animation variants
export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: motionPresets.entrance,
  },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: motionPresets.entrance,
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: motionPresets.entrance,
  },
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: motionPresets.entrance,
  },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: motionPresets.entrance,
  },
};

// Container variants with stagger
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      ...motionPresets.stagger,
      duration: 0.3,
    },
  },
};

// Hover effects
export const hoverScale = {
  scale: 1.02,
  transition: motionPresets.micro,
};

export const hoverLift = {
  y: -4,
  boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.2)",
  transition: motionPresets.micro,
};

// Pulse animation for CTAs
export const pulseAnimation = {
  scale: [1, 1.02, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

// Check for reduced motion preference
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Get animation props based on reduced motion preference
export const getMotionProps = (variants: object) => {
  if (prefersReducedMotion()) {
    return { animate: "visible" };
  }
  return {
    initial: "hidden",
    animate: "visible",
    variants,
  };
};
