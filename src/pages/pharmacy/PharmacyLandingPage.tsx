import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Pill,
  Package,
  Truck,
  CreditCard,
  Users,
  BarChart3,
  FileText,
  RefreshCw,
  Shield,
  Lock,
  CheckCircle,
  ArrowRight,
  Stethoscope,
  Building2,
  FlaskConical,
  Scan,
  BadgeCheck,
  Zap,
  Globe,
  Clock,
  Heart,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import ModernNavbar from '@/components/home/ModernNavbar';

// Animated Section Component
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

// Feature Card Component
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

// Timeline Step Component
const TimelineStep = ({ number, title, description, isLast = false, delay = 0 }: { number: number; title: string; description: string; isLast?: boolean; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -40 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className="flex gap-6"
    >
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/30">
          {number}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gradient-to-b from-primary to-primary/20 mt-4" />
        )}
      </div>
      <div className="pb-12">
        <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

// Integration Icon Component
const IntegrationIcon = ({ icon: Icon, label, delay = 0 }: { icon: any; label: string; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.4, delay }}
      className="flex flex-col items-center gap-3 group"
    >
      <div className="w-20 h-20 rounded-2xl bg-card border border-border/50 flex items-center justify-center group-hover:border-primary/30 group-hover:shadow-lg transition-all duration-300">
        <Icon className="w-10 h-10 text-primary" />
      </div>
      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
    </motion.div>
  );
};

export default function PharmacyLandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const features = [
    { icon: FileText, title: "Digital Prescriptions (eRx)", description: "Receive prescriptions instantly from verified doctors across the Docito network." },
    { icon: RefreshCw, title: "Medication Refill Management", description: "Automated refill requests and smart patient reminders." },
    { icon: Package, title: "Inventory & Stock Control", description: "Real-time stock levels, expiry alerts, and supplier insights." },
    { icon: Truck, title: "Online Orders & Delivery", description: "Enable home delivery with real-time order tracking." },
    { icon: CreditCard, title: "Payments & Insurance", description: "Accept cash, cards, digital wallets, and process insurance claims." },
    { icon: Users, title: "Patient Profiles", description: "Access medication history, allergies, and adherence tracking." },
    { icon: BarChart3, title: "Analytics Dashboard", description: "Sales trends, fast-moving drugs, and revenue insights." },
  ];

  const steps = [
    { title: "Register Your Pharmacy", description: "Verify licenses, locations, and operating hours in minutes." },
    { title: "Sync Inventory & Pricing", description: "Upload medicines, generics, and real-time availability." },
    { title: "Receive Digital Prescriptions", description: "From doctors, clinics, and hospitals across the network." },
    { title: "Prepare & Fulfill Orders", description: "Streamlined workflow for in-store pickup or home delivery." },
    { title: "Get Paid Instantly", description: "Process online payments, insurance claims, and generate invoices." },
    { title: "Grow & Optimize", description: "Leverage insights, repeat customers, and referral programs." },
  ];

  const trustItems = [
    { icon: Shield, text: "HIPAA-aligned infrastructure" },
    { icon: Lock, text: "Secure e-prescriptions" },
    { icon: Users, text: "Role-based access control" },
    { icon: FileText, text: "Encrypted patient data" },
    { icon: CheckCircle, text: "Complete audit trails" },
  ];

  const integrations = [
    { icon: Stethoscope, label: "Doctors" },
    { icon: Building2, label: "Clinics" },
    { icon: Heart, label: "Hospitals" },
    { icon: FlaskConical, label: "Labs" },
    { icon: Scan, label: "Imaging" },
    { icon: BadgeCheck, label: "Insurance" },
  ];

  return (
    <>
      <Helmet>
        <title>Pharmacy Management Software | Digital Pharmacy Platform | Docito</title>
        <meta name="description" content="Transform your pharmacy with Docito's digital platform. Manage prescriptions, inventory, payments, deliveries, and doctor integrations from one secure system." />
        <meta name="keywords" content="pharmacy management software, digital pharmacy platform, online prescription management, e-prescription system, pharmacy POS software, pharmacy inventory software, medication refill system, pharmacy analytics" />
        <link rel="canonical" href="https://docito.app/for-pharmacies" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Docito for Pharmacies",
            "applicationCategory": "HealthApplication",
            "operatingSystem": "Web",
            "description": "Complete digital pharmacy management platform with prescription processing, inventory management, and healthcare integration.",
            "offers": {
              "@type": "Offer",
              "category": "Subscription"
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <ModernNavbar />

        {/* Hero Section */}
        <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
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
              <Pill className="w-4 h-4" />
              <span className="text-sm font-medium">For Modern Pharmacies</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
            >
              <span className="text-foreground">The Digital Backbone</span>
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                for Modern Pharmacies
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              Manage prescriptions, inventory, payments, deliveries, and doctor integrations — all from one secure platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button asChild size="lg" className="text-lg px-8 h-14 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all">
                <Link to="/pharmacy/register">
                  Register Your Pharmacy
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 h-14 rounded-xl">
                <Link to="/contact">
                  Schedule a Demo
                </Link>
              </Button>
            </motion.div>

            {/* Floating Elements Animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="mt-20 relative h-64"
            >
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-1/4 top-0 w-20 h-20 rounded-2xl bg-card border border-border/50 shadow-xl flex items-center justify-center"
              >
                <FileText className="w-10 h-10 text-primary" />
              </motion.div>
              <motion.div
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute left-1/2 -translate-x-1/2 top-10 w-24 h-24 rounded-2xl bg-card border border-border/50 shadow-xl flex items-center justify-center"
              >
                <Package className="w-12 h-12 text-accent" />
              </motion.div>
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute right-1/4 top-5 w-20 h-20 rounded-2xl bg-card border border-border/50 shadow-xl flex items-center justify-center"
              >
                <Truck className="w-10 h-10 text-primary" />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2"
            >
              <div className="w-1.5 h-3 rounded-full bg-muted-foreground/50" />
            </motion.div>
          </motion.div>
        </section>

        {/* Problem Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-4xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Why Traditional Pharmacy Systems Are{' '}
                <span className="text-destructive">Holding You Back</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Disconnected systems, paper prescriptions, stock shortages, and manual billing slow pharmacies down. 
                Patients expect speed, transparency, and digital access — Docito delivers all three.
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { from: "Paper prescriptions", to: "Digital e-prescriptions", icon: FileText },
                { from: "Manual inventory", to: "Automated stock tracking", icon: Package },
                { from: "Walk-in only", to: "Online refills & orders", icon: Globe },
                { from: "Cash-only payments", to: "Integrated payments", icon: CreditCard },
              ].map((item, index) => (
                <AnimatedSection key={index}>
                  <Card className="p-6 text-center border-border/50 bg-card/50 backdrop-blur-sm h-full">
                    <item.icon className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground line-through mb-2">{item.from}</p>
                    <p className="font-semibold text-foreground">{item.to}</p>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Everything Your Pharmacy Needs —{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Unified</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                One platform to manage every aspect of your pharmacy operations
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
                How Docito Works for Pharmacies
              </h2>
              <p className="text-xl text-muted-foreground">
                From registration to revenue — your complete journey
              </p>
            </AnimatedSection>

            <div className="max-w-2xl mx-auto">
              {steps.map((step, index) => (
                <TimelineStep
                  key={index}
                  number={index + 1}
                  title={step.title}
                  description={step.description}
                  isLast={index === steps.length - 1}
                  delay={index * 0.15}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Future Is Connected Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-4xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                The Future of Pharmacies Is{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Connected</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Pharmacies are no longer standalone stores — they are critical nodes in the healthcare ecosystem. 
                Docito connects you directly with doctors, labs, clinics, and patients.
              </p>
            </AnimatedSection>

            <AnimatedSection>
              <div className="relative max-w-4xl mx-auto">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 rounded-full border-2 border-dashed border-primary/30" />
                  <div className="absolute w-48 h-48 rounded-full border-2 border-dashed border-accent/30" />
                </div>
                <div className="relative flex items-center justify-center py-20">
                  <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center shadow-2xl shadow-primary/40">
                    <Pill className="w-16 h-16 text-primary-foreground" />
                  </div>
                </div>
                <div className="flex flex-wrap justify-center gap-8 mt-8">
                  {integrations.map((item, index) => (
                    <IntegrationIcon
                      key={index}
                      icon={item.icon}
                      label={item.label}
                      delay={index * 0.1}
                    />
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Compliance Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Built for Healthcare-Grade{' '}
                <span className="text-primary">Compliance</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Security and compliance are built into every layer of the platform
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
              {trustItems.map((item, index) => (
                <AnimatedSection key={index}>
                  <Card className="p-6 text-center border-border/50 bg-card/50 backdrop-blur-sm h-full hover:border-primary/30 transition-colors">
                    <item.icon className="w-10 h-10 mx-auto mb-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">{item.text}</p>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Ecosystem Integration Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                One Platform.{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Every Healthcare Partner.</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Docito eliminates silos and enables real-time collaboration across the healthcare system.
              </p>
            </AnimatedSection>

            <AnimatedSection>
              <Card className="max-w-4xl mx-auto p-12 border-border/50 bg-gradient-to-br from-card to-muted/50">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-8">
                  {integrations.map((item, index) => (
                    <div key={index} className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                        <item.icon className="w-8 h-8 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </AnimatedSection>
          </div>
        </section>

        {/* Pricing Philosophy */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Pricing That Makes Sense for{' '}
                <span className="text-primary">Pharmacies</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Docito pricing scales with your pharmacy — from single retail locations to national chains.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {[
                  { icon: CheckCircle, text: "No hidden fees" },
                  { icon: Zap, text: "Flexible plans" },
                  { icon: FileText, text: "Transparent billing" },
                  { icon: Building2, text: "Enterprise options" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-2 justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg px-8 h-14 rounded-xl">
                  <Link to="/pricing">View Pricing</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 h-14 rounded-xl">
                  <Link to="/contact">Talk to Sales</Link>
                </Button>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 container mx-auto px-4 text-center">
            <AnimatedSection>
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Transform Your Pharmacy Into a{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Digital-First Healthcare Hub
                </span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Increase efficiency, boost revenue, and deliver better patient experiences with Docito.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg px-10 h-16 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all">
                  <Link to="/pharmacy/register">
                    Register Your Pharmacy
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-10 h-16 rounded-xl">
                  <Link to="/contact">
                    Request a Demo
                  </Link>
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
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
