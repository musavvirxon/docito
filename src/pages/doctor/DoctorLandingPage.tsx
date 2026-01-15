import { useRef, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
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
  Bell,
  Shield,
  Users,
  ArrowRight,
  ChevronRight,
  Clock,
  XCircle,
  CheckCircle,
  Zap,
  Lock,
  BadgeCheck,
  BarChart3,
  MessageSquare,
  Video,
  Pill,
  FlaskConical,
  Scan,
  Heart,
  Activity,
  ClipboardList,
  DollarSign,
  FolderOpen,
  Send,
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

// Animated section wrapper
const AnimatedSection = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// SVG Care Network Animation
const CareNetworkIllustration = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <div ref={ref} className="relative w-full max-w-md mx-auto">
      <svg viewBox="0 0 400 200" className="w-full h-auto">
        {/* Connection lines with draw animation */}
        <motion.path
          d="M 80 100 L 200 100"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-primary/40"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
        <motion.path
          d="M 200 100 L 280 60"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-primary/40"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 0.6, delay: 1.5 }}
        />
        <motion.path
          d="M 200 100 L 280 100"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-primary/40"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 0.6, delay: 1.7 }}
        />
        <motion.path
          d="M 200 100 L 280 140"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-primary/40"
          initial={{ pathLength: 0 }}
          animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 0.6, delay: 1.9 }}
        />

        {/* Patient node */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <circle cx="80" cy="100" r="24" className="fill-muted stroke-border" strokeWidth="2" />
          <Users className="w-6 h-6 text-muted-foreground" x="68" y="88" />
          <foreignObject x="56" y="76" width="48" height="48">
            <div className="flex items-center justify-center h-full">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
          </foreignObject>
        </motion.g>

        {/* Doctor node (center) */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ duration: 0.4, delay: 1 }}
        >
          <circle cx="200" cy="100" r="32" className="fill-primary/10 stroke-primary" strokeWidth="3" />
          <foreignObject x="176" y="76" width="48" height="48">
            <div className="flex items-center justify-center h-full">
              <Stethoscope className="w-8 h-8 text-primary" />
            </div>
          </foreignObject>
        </motion.g>

        {/* Lab node */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ duration: 0.4, delay: 2.1 }}
        >
          <circle cx="280" cy="60" r="20" className="fill-muted stroke-border" strokeWidth="2" />
          <foreignObject x="268" y="48" width="24" height="24">
            <div className="flex items-center justify-center h-full">
              <FlaskConical className="w-5 h-5 text-muted-foreground" />
            </div>
          </foreignObject>
        </motion.g>

        {/* Pharmacy node */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ duration: 0.4, delay: 2.3 }}
        >
          <circle cx="280" cy="100" r="20" className="fill-muted stroke-border" strokeWidth="2" />
          <foreignObject x="268" y="88" width="24" height="24">
            <div className="flex items-center justify-center h-full">
              <Pill className="w-5 h-5 text-muted-foreground" />
            </div>
          </foreignObject>
        </motion.g>

        {/* Imaging node */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ duration: 0.4, delay: 2.5 }}
        >
          <circle cx="280" cy="140" r="20" className="fill-muted stroke-border" strokeWidth="2" />
          <foreignObject x="268" y="128" width="24" height="24">
            <div className="flex items-center justify-center h-full">
              <Scan className="w-5 h-5 text-muted-foreground" />
            </div>
          </foreignObject>
        </motion.g>

        {/* Labels */}
        <motion.text
          x="80" y="140"
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 2.8 }}
        >
          Patient
        </motion.text>
        <motion.text
          x="200" y="150"
          textAnchor="middle"
          className="fill-primary text-xs font-medium"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 2.8 }}
        >
          You
        </motion.text>
        <motion.text
          x="320" y="65"
          textAnchor="start"
          className="fill-muted-foreground text-xs"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 2.8 }}
        >
          Lab
        </motion.text>
        <motion.text
          x="320" y="105"
          textAnchor="start"
          className="fill-muted-foreground text-xs"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 2.8 }}
        >
          Pharmacy
        </motion.text>
        <motion.text
          x="320" y="145"
          textAnchor="start"
          className="fill-muted-foreground text-xs"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 2.8 }}
        >
          Imaging
        </motion.text>
      </svg>
    </div>
  );
};

// Workflow chip animation
const WorkflowChips = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  
  const steps = [
    { icon: Stethoscope, label: 'Diagnosis' },
    { icon: ClipboardList, label: 'Treatment' },
    { icon: Pill, label: 'Prescriptions' },
    { icon: FolderOpen, label: 'Files' },
    { icon: FileText, label: 'Notes' },
  ];

  return (
    <div ref={ref} className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
      {steps.map((step, index) => (
        <motion.div
          key={step.label}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          className="flex items-center gap-2"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <step.icon className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{step.label}</span>
          </div>
          {index < steps.length - 1 && (
            <ChevronRight className="w-4 h-4 text-muted-foreground hidden md:block" />
          )}
        </motion.div>
      ))}
    </div>
  );
};

// Problem → Solution card
const ProblemSolutionCard = ({
  icon: Icon,
  problem,
  solution,
  delay = 0,
}: {
  icon: any;
  problem: string;
  solution: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-xl p-6 h-full hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 text-destructive/70">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4" />
            </div>
            <span className="text-sm line-through">{problem}</span>
          </div>
          <div className="flex items-center gap-3 text-primary">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">{solution}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// Feature card
const FeatureCard = ({
  icon: Icon,
  title,
  description,
  delay = 0,
}: {
  icon: any;
  title: string;
  description: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-xl p-8 h-full hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors duration-300">
            <Icon className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-3 text-foreground">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </Card>
    </motion.div>
  );
};

export default function DoctorLandingPage() {
  const { t, i18n } = useTranslation(['doctors', 'common']);
  const isRTL = i18n.language === 'ar';

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  const problems = useMemo(() => [
    {
      icon: Calendar,
      problem: 'Missed appointments and no-shows',
      solution: 'Automated reminders reduce no-shows by 70%',
    },
    {
      icon: FileText,
      problem: 'Hours of paperwork after each visit',
      solution: 'Smart documentation in minutes, not hours',
    },
    {
      icon: Zap,
      problem: 'Scattered tools for messaging, notes, files',
      solution: 'One unified platform for everything',
    },
    {
      icon: Send,
      problem: 'Manual referrals and lost follow-ups',
      solution: 'Automatic referrals to labs, imaging, pharmacies',
    },
    {
      icon: FolderOpen,
      problem: 'Lost files and missing patient records',
      solution: 'Secure cloud storage for all records',
    },
    {
      icon: DollarSign,
      problem: 'Slow billing and insurance claims',
      solution: 'Streamlined billing and instant claims',
    },
  ], []);

  const features = useMemo(() => [
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'Patients book instantly. You control availability. Automated reminders do the rest.',
    },
    {
      icon: Video,
      title: 'Video Consultations',
      description: 'See patients remotely with built-in HD video. No extra apps needed.',
    },
    {
      icon: MessageSquare,
      title: 'Secure Messaging',
      description: 'HIPAA-compliant chat with patients, staff, and other providers.',
    },
    {
      icon: ClipboardList,
      title: 'Visit Documentation',
      description: 'Diagnosis, treatment plans, prescriptions, and notes—all in one flow.',
    },
    {
      icon: Send,
      title: 'Automated Referrals',
      description: 'Send referrals to labs, imaging, and pharmacies with one click.',
    },
    {
      icon: BarChart3,
      title: 'Practice Analytics',
      description: 'Track appointments, revenue, and patient outcomes in real-time.',
    },
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
        <meta 
          name="description" 
          content="Docito automates scheduling, reminders, visit notes, prescriptions, referrals, billing, and files for doctors. Join thousands of providers delivering better care with less admin." 
        />
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
            publisher: {
              "@type": "Organization",
              name: "Docito",
              url: "https://docito.lovable.app",
            },
          })}
        </script>
      </Helmet>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-28 pb-20 overflow-hidden">
        <motion.div style={{ y: heroY }} className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_55%)]" />
        </motion.div>

        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="max-w-xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-6"
              >
                <Stethoscope className="w-4 h-4" />
                For Healthcare Providers
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6"
              >
                Less admin.{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  More care.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8"
              >
                Docito automates scheduling, reminders, visit documentation, prescriptions, 
                referrals, billing, and file management—so you can focus on what matters: your patients.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 mb-6"
              >
                <Button size="lg" className="rounded-full px-8" asChild>
                  <Link to="/auth?mode=register&role=doctor">
                    Join as Doctor
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
                  <Link to="/contact">
                    Schedule Demo
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-sm text-muted-foreground"
              >
                🔒 HIPAA-compliant • Free to get started • No credit card required
              </motion.p>
            </div>

            {/* Right: Care Network Illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:block"
            >
              <CareNetworkIllustration />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Workflow Automation Chips */}
      <section className="py-12 border-y border-border/50 bg-muted/20">
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-8">
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">Complete Workflow Automation</p>
          </AnimatedSection>
          <WorkflowChips />
        </div>
      </section>

      {/* Problems → Solutions Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-sm font-medium text-foreground mb-4">
              <BadgeCheck className="w-4 h-4" />
              Problems We Solve
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Stop wasting time on admin work
            </h2>
            <p className="text-muted-foreground text-lg">
              Docito eliminates the busywork that burns out doctors and frustrates patients.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {problems.map((p, i) => (
              <ProblemSolutionCard
                key={i}
                icon={p.icon}
                problem={p.problem}
                solution={p.solution}
                delay={i * 0.05}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-4">
              <Shield className="w-4 h-4" />
              Everything You Need
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              One platform, complete control
            </h2>
            <p className="text-muted-foreground text-lg">
              From scheduling to billing, manage your entire practice in one place.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, idx) => (
              <FeatureCard
                key={idx}
                icon={f.icon}
                title={f.title}
                description={f.description}
                delay={idx * 0.05}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Integrations / Ecosystem */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-4">
              <Activity className="w-4 h-4" />
              Connected Ecosystem
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Seamless referrals, instant results
            </h2>
            <p className="text-muted-foreground text-lg">
              Send referrals to labs, pharmacies, and imaging centers with one click. 
              Receive results directly in your dashboard.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {integrations.map((item, idx) => (
              <Card key={idx} className="p-6 border-border/50 bg-card/50 backdrop-blur-xl text-center hover:border-primary/30 transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </Card>
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

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <AnimatedSection className="max-w-4xl mx-auto">
            <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-xl p-10 md:p-12">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
              <div className="relative text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to automate your practice?
                </h2>
                <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                  Join thousands of doctors who spend less time on admin and more time with patients.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" className="rounded-full px-8" asChild>
                    <Link to="/auth?mode=register&role=doctor">
                      Get Started Free
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
                    <Link to="/pricing">
                      View Pricing
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground mt-6">
                  No credit card required • HIPAA compliant • Cancel anytime
                </p>
              </div>
            </Card>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
