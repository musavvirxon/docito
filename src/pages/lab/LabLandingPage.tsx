// src/pages/lab/LabLandingPage.tsx
import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FlaskConical,
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
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import ModernNavbar from "@/components/home/ModernNavbar";
import { usePublicChrome } from "@/contexts/PublicChromeContext";

const AnimatedSection = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
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

export default function LabLandingPage() {
  const heroRef = useRef(null);
  const { footerProvided } = usePublicChrome();

  const canonical = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://docito.app";
    return `${origin}/lab`;
  }, []);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.97]);

  const features = [
    {
      icon: Microscope,
      title: "Orders & Accessioning",
      description: "Centralize incoming orders with fast accessioning and clear status tracking.",
    },
    {
      icon: TestTube,
      title: "Sample Processing",
      description: "Manage collection, lab intake, QC, and processing workflows end-to-end.",
    },
    {
      icon: Truck,
      title: "Home Collection",
      description: "Schedule pickup, assign collectors, and track visits with patient notifications.",
    },
    {
      icon: Calendar,
      title: "Scheduling",
      description: "Coordinate appointments, routes, and technician workloads in one calendar.",
    },
    {
      icon: DollarSign,
      title: "Billing & Claims",
      description: "Capture charges, generate invoices, and support insurance workflows.",
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "View volume, turnaround time, revenue trends, and operational performance.",
    },
    {
      icon: Users,
      title: "Staff Management",
      description: "Invite staff, control permissions, and audit activity with role-based access.",
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Automated alerts for results, delays, abnormal flags, and patient updates.",
    },
    {
      icon: FileCheck,
      title: "Compliance",
      description: "Audit trails, secure access, and structured documentation for regulated labs.",
    },
  ];

  const compliance = [
    { icon: Shield, text: "HIPAA-Aligned" },
    { icon: Lock, text: "Secure Access" },
    { icon: Users, text: "Role-Based Permissions" },
    { icon: Database, text: "Encrypted Data" },
    { icon: CheckCircle, text: "Audit Trails" },
  ];

  const ecosystem = [
    { icon: Stethoscope, label: "Doctors" },
    { icon: Building2, label: "Clinics" },
    { icon: Pill, label: "Pharmacies" },
    { icon: Scan, label: "Imaging" },
    { icon: FlaskConical, label: "Labs" },
    { icon: BadgeCheck, label: "Insurance" },
  ];

  return (
    <>
      <Helmet>
        <title>Lab Management Software | Docito</title>
        <meta
          name="description"
          content="Modern lab operations platform: orders, home collection, samples, billing, analytics, and staff management."
        />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="min-h-screen bg-background overflow-x-hidden">
        <ModernNavbar />

        {/* Hero */}
        <section
          ref={heroRef}
          className="relative min-h-[86vh] pt-10 md:pt-14 flex items-center justify-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
          <div className="absolute inset-0">
            <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] animate-pulse" />
            <div
              className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] animate-pulse"
              style={{ animationDelay: "1s" }}
            />
          </div>

          <motion.div
            style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
            className="relative z-10 container mx-auto px-4 text-center max-w-5xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8"
            >
              <FlaskConical className="w-4 h-4" />
              <span className="text-sm font-medium tracking-wide">For Laboratories</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[0.95]"
            >
              <span className="text-foreground">Operate Your Lab</span>
              <br />
              <span className="text-foreground">With Speed,</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                Accuracy, And Scale
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed font-light"
            >
              Orders, home collection, samples, billing, analytics, and staff permissions — all in one secure platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button asChild size="lg" className="text-lg px-10 h-16 rounded-2xl shadow-lg shadow-primary/25">
                <Link to="/lab/register">
                  Register Your Lab
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-10 h-16 rounded-2xl">
                <Link to="/contact">Request a Demo</Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-16 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>Faster Turnaround Times</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span>Real-Time Status Tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                <span>Secure Data & Audit Trails</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span>Connected Healthcare Network</span>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="py-32">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-4xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight">
                Everything Your Lab Needs{" "}
                <span className="text-primary">In One Platform</span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Streamline operations from order intake to result delivery.
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {features.map((f, i) => (
                <FeatureCard
                  key={i}
                  icon={f.icon}
                  title={f.title}
                  description={f.description}
                  delay={i * 0.08}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Connected Ecosystem */}
        <section className="py-32 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-primary/5 rounded-full blur-[170px]" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <AnimatedSection className="text-center max-w-4xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight">
                A Connected{" "}
                <span className="text-primary">Healthcare Ecosystem</span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Labs are a core node in modern care delivery. Docito connects you to providers, imaging, pharmacies, and payers.
              </p>
            </AnimatedSection>

            <AnimatedSection>
              <Card className="max-w-5xl mx-auto p-12 md:p-16 border-border/40 bg-card/40 backdrop-blur-xl">
                <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                  {ecosystem.map((item, index) => (
                    <motion.div
                      key={index}
                      className="flex flex-col items-center gap-4 group"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.08 }}
                      viewport={{ once: true }}
                    >
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center group-hover:border-primary/25 group-hover:shadow-lg transition-all duration-300">
                        <item.icon className="w-10 h-10 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        {item.label}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-12 pt-8 border-t border-border/30 text-center">
                  <p className="text-muted-foreground">
                    One platform connecting the entire healthcare workflow.
                  </p>
                </div>
              </Card>
            </AnimatedSection>
          </div>
        </section>

        {/* Compliance */}
        <section className="py-32">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight">
                Healthcare-Grade{" "}
                <span className="text-primary">Security</span>
              </h2>
            </AnimatedSection>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 max-w-5xl mx-auto">
              {compliance.map((item, index) => (
                <AnimatedSection key={index}>
                  <Card className="p-6 md:p-8 text-center border-border/40 bg-card/40 backdrop-blur-xl h-full hover:border-primary/20 transition-all duration-500">
                    <item.icon className="w-10 h-10 mx-auto mb-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">{item.text}</p>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <AnimatedSection>
              <Card className="p-10 md:p-12 border-border/40 bg-gradient-to-br from-primary/10 via-background to-accent/10 backdrop-blur-xl">
                <div className="relative">
                  <h2 className="text-3xl md:text-4xl font-bold mb-3">
                    Launch Your Lab On Docito
                  </h2>
                  <p className="text-muted-foreground text-lg mb-6">
                    Start onboarding in minutes and streamline operations immediately.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="lg" className="rounded-full px-8" asChild>
                      <Link to="/auth?mode=register">
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
                      <Link to="/contact">
                        Talk to Sales
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground mt-4">
                    No long-term contracts. Upgrade anytime.
                  </p>
                </div>
              </Card>
            </AnimatedSection>
          </div>
        </section>

        {/* Page-local footer should not render if PublicLayout already provides PremiumFooter */}
        {!footerProvided ? (
          <footer className="py-12 border-t border-border/50">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-muted-foreground text-sm">
                  © {new Date().getFullYear()} Docito. All rights reserved.
                </p>
                <div className="flex gap-8">
                  <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Privacy
                  </Link>
                  <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Terms
                  </Link>
                  <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        ) : null}
      </div>
    </>
  );
}
