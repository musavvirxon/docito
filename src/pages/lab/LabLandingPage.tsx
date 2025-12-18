import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  FlaskConical,
  FileText,
  Clock,
  Shield,
  Lock,
  CheckCircle,
  ArrowRight,
  Stethoscope,
  Building2,
  Pill,
  Scan,
  BadgeCheck,
  Zap,
  BarChart3,
  Users,
  Microscope,
  TestTube,
  Activity,
  Calendar,
  DollarSign,
  Truck,
  Bell,
  FileCheck,
  Database,
  Globe,
  ChevronRight,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import AppleNavbar from '@/components/home/AppleNavbar';

const AnimatedSection = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
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

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: { icon: any; title: string; description: string; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
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

const TimelineStep = ({ number, title, description, isLast = false }: { number: string; title: string; description: string; isLast?: boolean }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative flex gap-6"
    >
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/30">
          {number}
        </div>
        {!isLast && <div className="w-0.5 h-full bg-gradient-to-b from-primary to-primary/20 mt-4" />}
      </div>
      <div className="pb-12">
        <h4 className="text-xl font-semibold mb-2">{title}</h4>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
};

const ProblemSolutionCard = ({ problem, solution, icon: Icon }: { problem: string; solution: string; icon: any }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-xl">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-destructive/80">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <span className="text-lg">✕</span>
            </div>
            <span className="text-sm line-through">{problem}</span>
          </div>
          <div className="flex items-center gap-3 text-primary">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">{solution}</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default function LabLandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const features = [
    { icon: Calendar, title: "Online Lab Booking", description: "Patients book tests directly or via doctor referrals. Automated scheduling and reminders." },
    { icon: TestTube, title: "Test & Package Management", description: "Create individual tests and bundled packages with custom pricing and preparation instructions." },
    { icon: Stethoscope, title: "Doctor Referral Network", description: "Receive digital referrals from verified doctors, clinics, and hospitals in real-time." },
    { icon: FileText, title: "Digital Reports", description: "Upload, sign, and deliver reports securely. Automatic delivery to patients and doctors." },
    { icon: Truck, title: "Home Sample Collection", description: "Manage pickup schedules, staff assignments, and route optimization." },
    { icon: DollarSign, title: "Payments & Invoicing", description: "Accept online payments, process insurance claims, and generate invoices automatically." },
    { icon: BarChart3, title: "Analytics & Insights", description: "Track revenue, test demand, turnaround times, and operational efficiency." },
  ];

  const integrations = [
    { icon: Stethoscope, label: "Doctors" },
    { icon: Building2, label: "Clinics" },
    { icon: Building2, label: "Hospitals" },
    { icon: Pill, label: "Pharmacies" },
    { icon: Scan, label: "Imaging" },
    { icon: BadgeCheck, label: "Insurance" },
  ];

  const problemSolutions = [
    { problem: "Missed appointments", solution: "Automated scheduling & reminders", icon: Calendar },
    { problem: "Paper-based reports", solution: "Digital results with instant delivery", icon: FileText },
    { problem: "Phone call bookings", solution: "Online booking system", icon: Globe },
    { problem: "Manual billing errors", solution: "Integrated automated payments", icon: DollarSign },
  ];

  const howItWorks = [
    { number: "1", title: "Register Your Lab", description: "Add lab details, licenses, locations, and verification documents." },
    { number: "2", title: "Configure Tests & Prices", description: "Create tests, packages, set availability, and pricing structures." },
    { number: "3", title: "Receive Bookings & Referrals", description: "Accept orders from patients, doctors, clinics, and hospitals." },
    { number: "4", title: "Collect Samples & Run Tests", description: "In-lab collection or home sample pickup with tracking." },
    { number: "5", title: "Upload Results Digitally", description: "Secure delivery to patient and doctor dashboards instantly." },
    { number: "6", title: "Get Paid & Grow", description: "Instant payments, analytics, and insights to scale your business." },
  ];

  return (
    <>
      <Helmet>
        <title>Laboratory Management Software | Lab Booking System | Docito</title>
        <meta name="description" content="Modern laboratory management reimagined. Manage bookings, tests, reports, payments, and doctor referrals — all in one secure platform. Transform your lab today." />
        <meta name="keywords" content="laboratory management software, diagnostic lab software, lab booking system, lab test management platform, digital lab system, healthcare lab software, LIMS, pathology lab software" />
        <link rel="canonical" href="https://docito.app/for-labs" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalBusiness",
            "name": "Docito Laboratory Platform",
            "description": "Digital platform for diagnostic laboratories",
            "url": "https://docito.app/for-labs"
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <AppleNavbar />

        {/* Hero Section */}
        <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <motion.div 
            style={{ y: heroY, opacity: heroOpacity }}
            className="relative z-10 container mx-auto px-4 text-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8"
            >
              <FlaskConical className="w-4 h-4" />
              <span className="text-sm font-medium">For Diagnostic Laboratories</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
            >
              <span className="text-foreground">Modern Laboratory</span>
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Management, Reimagined
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              A unified digital platform for diagnostic labs to manage bookings, tests, reports, payments, and doctor referrals — all in one place.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button asChild size="lg" className="text-lg px-8 h-14 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all">
                <Link to="/lab/register">
                  Register Your Lab
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 h-14 rounded-xl">
                <Link to="/contact">
                  Schedule a Demo
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2"
            >
              <motion.div className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full" />
            </motion.div>
          </motion.div>
        </section>

        {/* Problem → Solution Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Why Modern Labs Can't Rely on{' '}
                <span className="text-primary">Manual Systems</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Manual lab workflows lead to delays, errors, lost referrals, and poor patient experience. Docito replaces fragmented tools with a single, secure, intelligent lab management platform.
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {problemSolutions.map((item, index) => (
                <ProblemSolutionCard
                  key={index}
                  problem={item.problem}
                  solution={item.solution}
                  icon={item.icon}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Everything Your Lab Needs —{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">One Platform</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                A comprehensive suite of tools designed specifically for diagnostic laboratories
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <FeatureCard
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  delay={index * 0.1}
                />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                How Docito Works{' '}
                <span className="text-primary">for Labs</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                From registration to revenue growth — a seamless journey
              </p>
            </AnimatedSection>

            <div className="max-w-2xl mx-auto">
              {howItWorks.map((step, index) => (
                <TimelineStep
                  key={index}
                  number={step.number}
                  title={step.title}
                  description={step.description}
                  isLast={index === howItWorks.length - 1}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Why Essential Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="relative z-10 container mx-auto px-4">
            <AnimatedSection className="text-center max-w-4xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                This Is Not Optional.{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  This Is the Future.
                </span>
              </h2>
              <p className="text-xl text-muted-foreground mb-12">
                Patients expect speed, transparency, and digital access. Doctors expect instant results. Labs that fail to modernize risk becoming invisible.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {[
                  { icon: Zap, text: "Increase Bookings" },
                  { icon: CheckCircle, text: "Reduce Errors" },
                  { icon: Users, text: "Expand Partnerships" },
                  { icon: Shield, text: "Build Patient Trust" },
                  { icon: Globe, text: "Scale Globally" },
                ].map((item, index) => (
                  <AnimatedSection key={index}>
                    <Card className="p-6 text-center border-border/50 bg-card/50 backdrop-blur-sm h-full hover:border-primary/30 transition-all">
                      <item.icon className="w-10 h-10 mx-auto mb-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">{item.text}</p>
                    </Card>
                  </AnimatedSection>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Pricing Philosophy */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Fair, Transparent,{' '}
                <span className="text-primary">Built to Scale</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Docito pricing is designed to grow with your lab — whether you're a single diagnostic center or a nationwide network.
              </p>
            </AnimatedSection>

            <AnimatedSection>
              <Card className="max-w-3xl mx-auto p-8 md:p-12 border-border/50 bg-card/50 backdrop-blur-xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                  <div className="space-y-2">
                    <CheckCircle className="w-8 h-8 mx-auto text-primary" />
                    <p className="font-semibold">No Hidden Fees</p>
                    <p className="text-sm text-muted-foreground">Transparent pricing always</p>
                  </div>
                  <div className="space-y-2">
                    <CheckCircle className="w-8 h-8 mx-auto text-primary" />
                    <p className="font-semibold">No Per-Report Penalties</p>
                    <p className="text-sm text-muted-foreground">Unlimited report delivery</p>
                  </div>
                  <div className="space-y-2">
                    <CheckCircle className="w-8 h-8 mx-auto text-primary" />
                    <p className="font-semibold">Flexible Plans</p>
                    <p className="text-sm text-muted-foreground">Based on your lab size</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                  <Button asChild size="lg" variant="outline" className="rounded-xl">
                    <Link to="/pricing">
                      View Plans
                      <ChevronRight className="ml-1 w-4 h-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" className="rounded-xl">
                    <Link to="/contact">Talk to Sales</Link>
                  </Button>
                </div>
              </Card>
            </AnimatedSection>
          </div>
        </section>

        {/* Security & Compliance */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Enterprise-Grade Security for{' '}
                <span className="text-primary">Medical Data</span>
              </h2>
            </AnimatedSection>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-4xl mx-auto">
              {[
                { icon: Shield, text: "HIPAA Aligned" },
                { icon: Lock, text: "Encrypted Storage" },
                { icon: FileCheck, text: "Audit Trails" },
                { icon: Users, text: "Role-Based Access" },
                { icon: BadgeCheck, text: "Secure Delivery" },
              ].map((item, index) => (
                <AnimatedSection key={index}>
                  <Card className="p-6 text-center border-border/50 bg-card/50 backdrop-blur-sm h-full">
                    <item.icon className="w-10 h-10 mx-auto mb-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">{item.text}</p>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Integration Ecosystem */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Connected to the Entire{' '}
                <span className="text-primary">Healthcare Network</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Docito connects labs into a unified healthcare ecosystem — no silos, no delays.
              </p>
            </AnimatedSection>

            <AnimatedSection>
              <Card className="max-w-4xl mx-auto p-12 border-border/50 bg-gradient-to-br from-card to-muted/50">
                <div className="flex flex-wrap justify-center gap-12">
                  {integrations.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                        <item.icon className="w-8 h-8 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </AnimatedSection>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/30 rounded-full blur-3xl" />
            <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-accent/30 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10 container mx-auto px-4 text-center">
            <AnimatedSection>
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Power Your Lab With the Platform{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Built for Modern Healthcare
                </span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Join the next generation of diagnostic labs using Docito to grow faster, work smarter, and deliver better care.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg px-10 h-16 rounded-xl shadow-lg shadow-primary/30">
                  <Link to="/lab/register">
                    Register Your Lab
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-10 h-16 rounded-xl">
                  <Link to="/contact">Request a Demo</Link>
                </Button>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-muted-foreground text-sm">
                © {new Date().getFullYear()} Docito. All rights reserved.
              </p>
              <div className="flex gap-6">
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
