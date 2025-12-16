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
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import ModernNavbar from '@/components/home/ModernNavbar';

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

export default function LabLandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const features = [
    { icon: TestTube, title: "Sample Management", description: "Track samples from collection to results with complete chain of custody." },
    { icon: FileText, title: "Digital Test Orders", description: "Receive orders electronically from doctors and clinics in real-time." },
    { icon: Microscope, title: "Result Processing", description: "Streamlined workflow for processing and validating test results." },
    { icon: Activity, title: "Quality Control", description: "Built-in QC protocols and compliance tracking for accreditation." },
    { icon: BarChart3, title: "Analytics Dashboard", description: "Track turnaround times, volumes, and revenue insights." },
    { icon: Users, title: "Patient Portal", description: "Patients can view and download results securely online." },
  ];

  const integrations = [
    { icon: Stethoscope, label: "Doctors" },
    { icon: Building2, label: "Clinics" },
    { icon: Pill, label: "Pharmacies" },
    { icon: Scan, label: "Imaging" },
    { icon: BadgeCheck, label: "Insurance" },
  ];

  return (
    <>
      <Helmet>
        <title>Laboratory Information System | Lab Management Software | Docito</title>
        <meta name="description" content="Transform your lab with Docito's digital platform. Manage test orders, samples, results, and healthcare integrations from one secure system." />
        <meta name="keywords" content="laboratory information system, lab management software, LIMS, lab test ordering, sample tracking, lab analytics" />
        <link rel="canonical" href="https://docito.app/for-labs" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <ModernNavbar />

        {/* Hero Section */}
        <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
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
              <FlaskConical className="w-4 h-4" />
              <span className="text-sm font-medium">For Clinical Laboratories</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
            >
              <span className="text-foreground">The Digital Hub</span>
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                for Modern Laboratories
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed"
            >
              Manage test orders, sample tracking, result processing, and healthcare integrations — all from one secure platform.
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
        </section>

        {/* Features Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Everything Your Lab Needs —{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Unified</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                One platform to manage every aspect of your laboratory operations
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

        {/* Integration Section */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Connected to the{' '}
                <span className="text-primary">Healthcare Ecosystem</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Seamlessly integrate with doctors, clinics, pharmacies, and insurance providers.
              </p>
            </AnimatedSection>

            <AnimatedSection>
              <Card className="max-w-4xl mx-auto p-12 border-border/50 bg-gradient-to-br from-card to-muted/50">
                <div className="flex flex-wrap justify-center gap-12">
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

        {/* Compliance Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Built for{' '}
                <span className="text-primary">Compliance</span>
              </h2>
            </AnimatedSection>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-4xl mx-auto">
              {[
                { icon: Shield, text: "HIPAA Compliant" },
                { icon: Lock, text: "Encrypted Data" },
                { icon: CheckCircle, text: "Audit Trails" },
                { icon: BadgeCheck, text: "CAP Ready" },
                { icon: Zap, text: "Fast Results" },
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

        {/* CTA Section */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
          <div className="relative z-10 container mx-auto px-4 text-center">
            <AnimatedSection>
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Transform Your Lab Into a{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Digital-First Operation
                </span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Increase efficiency, reduce turnaround times, and deliver better results with Docito.
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
