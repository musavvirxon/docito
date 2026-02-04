import { useRef, useMemo, lazy, Suspense, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Stethoscope,
  Calendar,
  FileText,
  Shield,
  Users,
  ArrowRight,
  ChevronRight,
  XCircle,
  Zap,
  BarChart3,
  MessageSquare,
  Video,
  Pill,
  FlaskConical,
  Scan,
  Activity,
  ClipboardList,
  DollarSign,
  FolderOpen,
  Send,
  Sparkles,
} from 'lucide-react';

// Lazy load below-fold sections
const TrustSection = lazy(() => import('./landing/DoctorTrustSection'));
const TestimonialsSection = lazy(() => import('./landing/DoctorTestimonialsSection'));

const SectionSkeleton = () => (
  <div className="py-16">
    <div className="container mx-auto px-4">
      <Skeleton className="h-8 w-64 mx-auto mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
      </div>
    </div>
  </div>
);

// Premium spring configuration
const springConfig = { stiffness: 100, damping: 15, mass: 0.5 };
const smoothSpring = { stiffness: 50, damping: 20, mass: 1 };

// Floating particles background
const FloatingParticles = () => {
  const particles = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 5,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-primary/20"
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [-20, 20, -20],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Animated gradient orb
const GradientOrb = ({ className }: { className?: string }) => (
  <motion.div
    className={cn(
      "absolute rounded-full blur-3xl opacity-30",
      className
    )}
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.2, 0.3, 0.2],
    }}
    transition={{
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// Animated section wrapper with enhanced effects
const AnimatedSection = ({ 
  children, 
  className = '',
  delay = 0 
}: { 
  children: React.ReactNode; 
  className?: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ 
        duration: 0.8, 
        delay,
        ease: [0.25, 0.46, 0.45, 0.94] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Premium Care Network with pulsing nodes and glowing connections
const CareNetworkIllustration = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated]);

  return (
    <div ref={ref} className="relative w-full max-w-lg mx-auto">
      {/* Glow effect behind */}
      <motion.div
        className="absolute inset-0 blur-3xl bg-primary/10 rounded-full"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={hasAnimated ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 1.5 }}
      />
      
      <svg viewBox="0 0 400 220" className="w-full h-auto relative z-10">
        <defs>
          {/* Glowing line gradient */}
          <linearGradient id="lineGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
          </linearGradient>
          
          {/* Pulse filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connection lines with flowing animation */}
        <motion.path
          d="M 90 110 C 140 110, 160 110, 200 110"
          stroke="url(#lineGlow)"
          strokeWidth="3"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={hasAnimated ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
        />
        
        {/* Data flow particles on main line */}
        {hasAnimated && (
          <motion.circle
            r="4"
            fill="hsl(var(--primary))"
            filter="url(#glow)"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              cx: [90, 140, 180, 200],
              cy: [110, 110, 110, 110],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Branching lines to facilities */}
        {[
          { path: "M 200 110 C 230 110, 250 80, 290 70", delay: 1.4 },
          { path: "M 200 110 C 230 110, 260 110, 290 110", delay: 1.6 },
          { path: "M 200 110 C 230 110, 250 140, 290 150", delay: 1.8 },
        ].map((line, i) => (
          <motion.path
            key={i}
            d={line.path}
            stroke="url(#lineGlow)"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={hasAnimated ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: line.delay, ease: "easeOut" }}
          />
        ))}

        {/* Patient node with pulse */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={hasAnimated ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2, type: "spring", ...springConfig }}
        >
          <motion.circle
            cx="90" cy="110" r="32"
            className="fill-muted/80 stroke-border"
            strokeWidth="2"
            animate={hasAnimated ? { 
              boxShadow: ["0 0 0 0 rgba(var(--primary), 0)", "0 0 20px 5px rgba(var(--primary), 0.1)", "0 0 0 0 rgba(var(--primary), 0)"]
            } : {}}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          />
          <foreignObject x="66" y="86" width="48" height="48">
            <div className="flex items-center justify-center h-full">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
          </foreignObject>
        </motion.g>

        {/* Doctor node (center) with pulsing glow */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={hasAnimated ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 1, type: "spring", ...springConfig }}
        >
          {/* Outer glow ring */}
          <motion.circle
            cx="200" cy="110" r="44"
            fill="none"
            className="stroke-primary/30"
            strokeWidth="2"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={hasAnimated ? { 
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.5, 0.3],
            } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <circle cx="200" cy="110" r="38" className="fill-primary/15 stroke-primary" strokeWidth="3" />
          <foreignObject x="176" y="86" width="48" height="48">
            <div className="flex items-center justify-center h-full">
              <motion.div
                animate={hasAnimated ? { rotate: [0, 5, -5, 0] } : {}}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Stethoscope className="w-9 h-9 text-primary" />
              </motion.div>
            </div>
          </foreignObject>
        </motion.g>

        {/* Facility nodes with stagger */}
        {[
          { cx: 290, cy: 70, icon: FlaskConical, label: "Lab", delay: 2.2 },
          { cx: 290, cy: 110, icon: Pill, label: "Pharmacy", delay: 2.4 },
          { cx: 290, cy: 150, icon: Scan, label: "Imaging", delay: 2.6 },
        ].map((node, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0, x: -20 }}
            animate={hasAnimated ? { opacity: 1, scale: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: node.delay, type: "spring", ...springConfig }}
          >
            <motion.circle
              cx={node.cx} cy={node.cy} r="24"
              className="fill-muted/80 stroke-border"
              strokeWidth="2"
              whileHover={{ scale: 1.1 }}
            />
            <foreignObject x={node.cx - 12} y={node.cy - 12} width="24" height="24">
              <div className="flex items-center justify-center h-full">
                <node.icon className="w-5 h-5 text-muted-foreground" />
              </div>
            </foreignObject>
          </motion.g>
        ))}

        {/* Labels with fade */}
        {[
          { x: 90, y: 160, text: "Patient", anchor: "middle", delay: 2.8 },
          { x: 200, y: 170, text: "You", anchor: "middle", primary: true, delay: 2.8 },
          { x: 330, y: 75, text: "Lab", anchor: "start", delay: 3 },
          { x: 330, y: 115, text: "Pharmacy", anchor: "start", delay: 3.1 },
          { x: 330, y: 155, text: "Imaging", anchor: "start", delay: 3.2 },
        ].map((label, i) => (
          <motion.text
            key={i}
            x={label.x}
            y={label.y}
            textAnchor={label.anchor as any}
            className={cn(
              "text-xs font-medium",
              label.primary ? "fill-primary" : "fill-muted-foreground"
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={hasAnimated ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: label.delay }}
          >
            {label.text}
          </motion.text>
        ))}
      </svg>
    </div>
  );
};

// Enhanced workflow chips with cascade animation
const WorkflowChips = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });
  
  const steps = [
    { icon: Stethoscope, label: 'Diagnosis', color: 'from-blue-500/20 to-blue-600/20' },
    { icon: ClipboardList, label: 'Treatment', color: 'from-emerald-500/20 to-emerald-600/20' },
    { icon: Pill, label: 'Prescriptions', color: 'from-violet-500/20 to-violet-600/20' },
    { icon: FolderOpen, label: 'Files', color: 'from-amber-500/20 to-amber-600/20' },
    { icon: FileText, label: 'Notes', color: 'from-rose-500/20 to-rose-600/20' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
        mass: 0.5,
      },
    },
  };

  const arrowVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.3 }
    },
  };

  return (
    <motion.div 
      ref={ref} 
      className="flex flex-wrap items-center justify-center gap-2 md:gap-4"
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {steps.map((step, index) => (
        <motion.div
          key={step.label}
          className="flex items-center gap-2 md:gap-3"
          variants={itemVariants}
        >
          <motion.div 
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full",
              "bg-gradient-to-r border border-primary/20",
              "backdrop-blur-sm shadow-sm",
              step.color
            )}
            whileHover={{ 
              scale: 1.05, 
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
            >
              <step.icon className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm font-medium text-foreground">{step.label}</span>
          </motion.div>
          
          {index < steps.length - 1 && (
            <motion.div variants={arrowVariants} className="hidden md:block">
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronRight className="w-5 h-5 text-primary/60" />
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
};

// Problem → Solution card with enhanced hover
const ProblemSolutionCard = ({
  icon: Icon,
  problem,
  solution,
  index = 0,
}: {
  icon: any;
  problem: string;
  solution: string;
  index?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-100, 100], [5, -5]), smoothSpring);
  const rotateY = useSpring(useTransform(x, [-100, 100], [-5, 5]), smoothSpring);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Cache mouse position to avoid closure issues
    const clientX = e.clientX;
    const clientY = e.clientY;
    const target = e.currentTarget;
    
    // Wrap getBoundingClientRect in rAF to avoid forced reflow
    requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      x.set(clientX - centerX);
      y.set(clientY - centerY);
    });
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="perspective-1000"
    >
      <Card className="group relative overflow-hidden border-border/50 bg-card/60 backdrop-blur-xl p-6 h-full transition-all duration-500 hover:border-primary/40 hover:shadow-2xl">
        {/* Animated gradient background */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full"
          animate={isHovered ? { translateX: "200%" } : {}}
          transition={{ duration: 0.8 }}
        />

        <div className="relative z-10 space-y-4">
          {/* Problem row */}
          <motion.div 
            className="flex items-center gap-3 text-destructive/70"
            initial={{ x: -10, opacity: 0 }}
            animate={isInView ? { x: 0, opacity: 1 } : {}}
            transition={{ delay: index * 0.1 + 0.2 }}
          >
            <motion.div 
              className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0"
              whileHover={{ scale: 1.1, rotate: 10 }}
            >
              <XCircle className="w-4 h-4" />
            </motion.div>
            <span className="text-sm line-through opacity-70">{problem}</span>
          </motion.div>
          
          {/* Solution row */}
          <motion.div 
            className="flex items-center gap-3 text-primary"
            initial={{ x: -10, opacity: 0 }}
            animate={isInView ? { x: 0, opacity: 1 } : {}}
            transition={{ delay: index * 0.1 + 0.35 }}
          >
            <motion.div 
              className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"
              whileHover={{ scale: 1.1, rotate: -10 }}
              animate={isHovered ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              <Icon className="w-4 h-4" />
            </motion.div>
            <span className="text-sm font-medium">{solution}</span>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
};

// Feature card with magnetic hover effect
const FeatureCard = ({
  icon: Icon,
  title,
  description,
  index = 0,
}: {
  icon: any;
  title: string;
  description: string;
  index?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.95 }}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className="group relative overflow-hidden border-border/50 bg-card/60 backdrop-blur-xl p-8 h-full transition-all duration-500 hover:border-primary/40 hover:shadow-2xl hover:-translate-y-2">
        {/* Animated background gradient */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/8"
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        />
        
        {/* Corner glow */}
        <motion.div
          className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl"
          animate={{ opacity: isHovered ? 0.6 : 0, scale: isHovered ? 1.2 : 1 }}
          transition={{ duration: 0.4 }}
        />

        <div className="relative z-10">
          {/* Icon container with animation */}
          <motion.div 
            className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 overflow-hidden"
            animate={{ 
              backgroundColor: isHovered ? "hsl(var(--primary) / 0.2)" : "hsl(var(--primary) / 0.1)",
            }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              animate={isHovered ? { 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              } : {}}
              transition={{ duration: 0.5 }}
            >
              <Icon className="w-8 h-8 text-primary" />
            </motion.div>
          </motion.div>
          
          <motion.h3 
            className="text-xl font-semibold mb-3 text-foreground"
            animate={{ x: isHovered ? 5 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {title}
          </motion.h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </Card>
    </motion.div>
  );
};

// Integration card with hover lift
const IntegrationCard = ({
  icon: Icon,
  title,
  description,
  index = 0,
}: {
  icon: any;
  title: string;
  description: string;
  index?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        type: "spring",
        ...springConfig
      }}
    >
      <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Card className="p-6 border-border/50 bg-card/60 backdrop-blur-xl text-center hover:border-primary/40 hover:shadow-xl transition-all duration-300">
          <motion.div 
            className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
          >
            <Icon className="w-7 h-7 text-primary" />
          </motion.div>
          <h3 className="font-semibold text-lg mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default function DoctorLandingPage() {
  const { i18n } = useTranslation(['doctors', 'common']);
  const isRTL = i18n.language === 'ar';

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const problems = useMemo(() => [
    { icon: Calendar, problem: 'Missed appointments and no-shows', solution: 'Automated reminders reduce no-shows by 70%' },
    { icon: FileText, problem: 'Hours of paperwork after each visit', solution: 'Smart documentation in minutes, not hours' },
    { icon: Zap, problem: 'Scattered tools for messaging, notes, files', solution: 'One unified platform for everything' },
    { icon: Send, problem: 'Manual referrals and lost follow-ups', solution: 'Automatic referrals to labs, imaging, pharmacies' },
    { icon: FolderOpen, problem: 'Lost files and missing patient records', solution: 'Secure cloud storage for all records' },
    { icon: DollarSign, problem: 'Slow billing and insurance claims', solution: 'Streamlined billing and instant claims' },
  ], []);

  const features = useMemo(() => [
    { icon: Calendar, title: 'Smart Scheduling', description: 'Patients book instantly. You control availability. Automated reminders do the rest.' },
    { icon: Video, title: 'Video Consultations', description: 'See patients remotely with built-in HD video. No extra apps needed.' },
    { icon: MessageSquare, title: 'Secure Messaging', description: 'HIPAA-compliant chat with patients, staff, and other providers.' },
    { icon: ClipboardList, title: 'Visit Documentation', description: 'Diagnosis, treatment plans, prescriptions, and notes—all in one flow.' },
    { icon: Send, title: 'Automated Referrals', description: 'Send referrals to labs, imaging, and pharmacies with one click.' },
    { icon: BarChart3, title: 'Practice Analytics', description: 'Track appointments, revenue, and patient outcomes in real-time.' },
  ], []);

  const integrations = useMemo(() => [
    { icon: FlaskConical, title: 'Laboratories', description: 'Order tests and receive results digitally' },
    { icon: Pill, title: 'Pharmacies', description: 'Send prescriptions directly to patient\'s pharmacy' },
    { icon: Scan, title: 'Imaging Centers', description: 'Request scans and view results in your dashboard' },
    { icon: Users, title: 'Other Providers', description: 'Seamless referrals and care coordination' },
  ], []);

  return (
    <div className={cn("min-h-screen bg-background overflow-hidden", isRTL && "rtl")}>
      <Helmet>
        <title>Join Docito® as a Doctor — Automate Your Practice | Less Admin, More Care</title>
        <meta name="description" content="Docito automates scheduling, reminders, visit notes, prescriptions, referrals, billing, and files for doctors. Join thousands of providers delivering better care with less admin." />
        <link rel="canonical" href="https://docito.lovable.app/doctor" />
        <meta property="og:title" content="Join Docito® as a Doctor — Automate Your Practice" />
        <meta property="og:description" content="Less admin, more care. Docito handles scheduling, documentation, referrals, and billing so you can focus on patients." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://docito.lovable.app/doctor" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Join Docito® as a Doctor" />
        <meta name="twitter:description" content="Automate your practice. Focus on patients." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Docito for Doctors",
            description: "Healthcare practice automation platform for doctors",
            url: "https://docito.lovable.app/doctor",
            publisher: { "@type": "Organization", name: "Docito", url: "https://docito.lovable.app" },
          })}
        </script>
      </Helmet>

      {/* Hero Section with parallax and particles */}
      <section ref={heroRef} className="relative pt-24 pb-20 overflow-hidden min-h-[90vh] flex items-center">
        {/* Animated background */}
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/8" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.12),transparent_50%)]" />
          <FloatingParticles />
          <GradientOrb className="w-[600px] h-[600px] bg-primary/20 -top-48 -left-48" />
          <GradientOrb className="w-[400px] h-[400px] bg-accent/20 -bottom-32 -right-32" />
        </motion.div>

        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Content with stagger */}
            <div className="max-w-xl">
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, type: "spring", ...springConfig }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-6"
              >
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
                  <Sparkles className="w-4 h-4" />
                </motion.div>
                For Healthcare Providers
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6"
              >
                Less admin.{' '}
                <motion.span 
                  className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent bg-[length:200%_auto]"
                  animate={{ backgroundPosition: ["0% center", "200% center"] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                >
                  More care.
                </motion.span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8"
              >
                Docito automates scheduling, reminders, visit documentation, prescriptions, 
                referrals, billing, and file management—so you can focus on what matters: your patients.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex flex-col sm:flex-row gap-4 mb-6"
              >
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <Button size="lg" className="rounded-full px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow" asChild>
                    <Link to="/auth?mode=register&role=doctor">
                      Join as Doctor
                      <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </motion.div>
                    </Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
                    <Link to="/contact">
                      Schedule Demo
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-sm text-muted-foreground flex items-center gap-2"
              >
                <Shield className="w-4 h-4 text-primary" />
                HIPAA-compliant • Free to get started • No credit card required
              </motion.p>
            </div>

            {/* Right: Care Network Illustration */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="hidden lg:block"
            >
              <CareNetworkIllustration />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Workflow Automation Chips */}
      <section className="py-14 border-y border-border/40 bg-muted/10 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
        <div className="container mx-auto px-4 relative">
          <AnimatedSection className="text-center mb-10">
            <motion.p 
              className="text-sm text-muted-foreground uppercase tracking-widest mb-2 font-medium"
              initial={{ opacity: 0, letterSpacing: "0.1em" }}
              whileInView={{ opacity: 1, letterSpacing: "0.2em" }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              Complete Workflow Automation
            </motion.p>
          </AnimatedSection>
          <WorkflowChips />
        </div>
      </section>

      {/* Problems → Solutions Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-16">
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-sm font-medium text-foreground mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <Zap className="w-4 h-4" />
              Problems We Solve
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Stop wasting time on admin work
            </h2>
            <p className="text-muted-foreground text-lg">
              Docito eliminates the busywork that burns out doctors and frustrates patients.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {problems.map((p, i) => (
              <ProblemSolutionCard key={i} icon={p.icon} problem={p.problem} solution={p.solution} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/10 relative overflow-hidden">
        <GradientOrb className="w-[500px] h-[500px] bg-primary/10 top-0 left-1/4" />
        <div className="container mx-auto px-4 relative">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-16">
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <Shield className="w-4 h-4" />
              Everything You Need
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              One platform, complete control
            </h2>
            <p className="text-muted-foreground text-lg">
              From scheduling to billing, manage your entire practice in one place.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, idx) => (
              <FeatureCard key={idx} icon={f.icon} title={f.title} description={f.description} index={idx} />
            ))}
          </div>
        </div>
      </section>

      {/* Integrations / Ecosystem */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-16">
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <Activity className="w-4 h-4" />
              Connected Ecosystem
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Seamless referrals, instant results
            </h2>
            <p className="text-muted-foreground text-lg">
              Send referrals to labs, pharmacies, and imaging centers with one click. 
              Receive results directly in your dashboard.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {integrations.map((item, idx) => (
              <IntegrationCard key={idx} icon={item.icon} title={item.title} description={item.description} index={idx} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Security - Lazy loaded */}
      <Suspense fallback={<SectionSkeleton />}>
        <TrustSection />
      </Suspense>

      {/* Testimonials - Lazy loaded */}
      <Suspense fallback={<SectionSkeleton />}>
        <TestimonialsSection />
      </Suspense>

      {/* Final CTA with premium animation */}
      <section className="py-24 relative overflow-hidden">
        <GradientOrb className="w-[600px] h-[600px] bg-primary/15 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="container mx-auto px-4 relative">
          <AnimatedSection className="max-w-4xl mx-auto">
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-xl p-10 md:p-14">
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/15"
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="relative text-center">
                  <motion.h2 
                    className="text-3xl md:text-4xl font-bold mb-4"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    Ready to automate your practice?
                  </motion.h2>
                  <motion.p 
                    className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    viewport={{ once: true }}
                  >
                    Join thousands of doctors who spend less time on admin and more time with patients.
                  </motion.p>

                  <motion.div 
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    viewport={{ once: true }}
                  >
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                      <Button size="lg" className="rounded-full px-10 shadow-lg shadow-primary/25" asChild>
                        <Link to="/auth?mode=register&role=doctor">
                          Get Started Free
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                      <Button size="lg" variant="outline" className="rounded-full px-10" asChild>
                        <Link to="/pricing">
                          View Pricing
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </motion.div>
                  </motion.div>

                  <motion.p 
                    className="text-sm text-muted-foreground mt-8"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    viewport={{ once: true }}
                  >
                    No credit card required • HIPAA compliant • Cancel anytime
                  </motion.p>
                </div>
              </Card>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
