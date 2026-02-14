// src/pages/imaging/ImagingLandingPage.tsx
import { useMemo, useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Scan, FileText, Shield, Lock, CheckCircle, ArrowRight,
  Stethoscope, Building2, Pill, FlaskConical, BadgeCheck, BarChart3,
  Users, Calendar, CreditCard, Eye, Server, FileImage, Layers,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import ModernNavbar from "@/components/home/ModernNavbar";
import { usePublicChrome } from "@/contexts/PublicChromeContext";

const AnimatedSection = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }} className={className}>
      {children}
    </motion.div>
  );
};

const GlassCard = ({ icon: Icon, title, description, delay = 0 }: { icon: any; title: string; description: string; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}>
      <Card className="group relative overflow-hidden border-border/30 bg-card/40 backdrop-blur-2xl p-8 h-full hover:border-primary/40 transition-all duration-700 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.15)] hover:-translate-y-2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
            <Icon className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-3 text-foreground tracking-tight">{title}</h3>
          <p className="text-muted-foreground leading-relaxed text-[15px]">{description}</p>
        </div>
      </Card>
    </motion.div>
  );
};

const TimelineItem = ({ number, title, description, delay = 0 }: { number: string; title: string; description: string; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, x: -40 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
      transition={{ duration: 0.6, delay }} className="flex gap-6 group">
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform duration-300">{number}</div>
        <div className="w-px flex-1 bg-gradient-to-b from-primary/40 to-transparent mt-4" />
      </div>
      <div className="pb-16">
        <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

export default function ImagingLandingPage() {
  const { t, i18n } = useTranslation(["imagingPage", "common"]);
  const heroRef = useRef(null);
  const { footerProvided } = usePublicChrome();

  const [ready, setReady] = useState(i18n.hasLoadedNamespace("imagingPage"));
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try { await i18n.loadNamespaces(["imagingPage"]); } catch {}
      if (!cancelled) setReady(true);
    };
    void load();
    return () => { cancelled = true; };
  }, [i18n, i18n.language]);

  const canonical = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://docito.app";
    return `${origin}/imaging-center`;
  }, []);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  if (!ready) return null;

  const features = [
    { icon: FileImage, title: t("imagingPage.features.items.erx.title"), description: t("imagingPage.features.items.erx.description") },
    { icon: Calendar, title: t("imagingPage.features.items.refills.title"), description: t("imagingPage.features.items.refills.description") },
    { icon: Eye, title: t("imagingPage.features.items.inventory.title"), description: t("imagingPage.features.items.inventory.description") },
    { icon: CreditCard, title: t("imagingPage.features.items.delivery.title"), description: t("imagingPage.features.items.delivery.description") },
    { icon: BarChart3, title: t("imagingPage.features.items.payments.title"), description: t("imagingPage.features.items.payments.description") },
    { icon: Users, title: t("imagingPage.features.items.profiles.title"), description: t("imagingPage.features.items.profiles.description") },
    { icon: Server, title: t("imagingPage.features.items.analytics.title"), description: t("imagingPage.features.items.analytics.description") },
  ];

  const steps = [
    { number: t("imagingPage.howItWorks.steps.step1.number"), title: t("imagingPage.howItWorks.steps.step1.title"), description: t("imagingPage.howItWorks.steps.step1.description") },
    { number: t("imagingPage.howItWorks.steps.step2.number"), title: t("imagingPage.howItWorks.steps.step2.title"), description: t("imagingPage.howItWorks.steps.step2.description") },
    { number: t("imagingPage.howItWorks.steps.step3.number"), title: t("imagingPage.howItWorks.steps.step3.title"), description: t("imagingPage.howItWorks.steps.step3.description") },
    { number: t("imagingPage.howItWorks.steps.step4.number"), title: t("imagingPage.howItWorks.steps.step4.title"), description: t("imagingPage.howItWorks.steps.step4.description") },
    { number: t("imagingPage.howItWorks.steps.step5.number"), title: t("imagingPage.howItWorks.steps.step5.title"), description: t("imagingPage.howItWorks.steps.step5.description") },
    { number: t("imagingPage.howItWorks.steps.step6.number"), title: t("imagingPage.howItWorks.steps.step6.title"), description: t("imagingPage.howItWorks.steps.step6.description") },
  ];

  const integrations = [
    { icon: Stethoscope, label: t("imagingPage.ecosystem.nodes.doctors") },
    { icon: Building2, label: t("imagingPage.ecosystem.nodes.clinics") },
    { icon: Pill, label: t("imagingPage.ecosystem.nodes.hospitals") },
    { icon: FlaskConical, label: t("imagingPage.ecosystem.nodes.labs") },
    { icon: BadgeCheck, label: t("imagingPage.ecosystem.nodes.insurance") },
  ];

  const compliance = [
    { icon: Shield, text: t("imagingPage.compliance.items.hipaaAligned") },
    { icon: Lock, text: t("imagingPage.compliance.items.secureErx") },
    { icon: Users, text: t("imagingPage.compliance.items.roleBasedAccess") },
    { icon: FileText, text: t("imagingPage.compliance.items.encryptedData") },
    { icon: CheckCircle, text: t("imagingPage.compliance.items.auditTrails") },
  ];

  return (
    <>
      <Helmet>
        <title>Imaging Center Platform | Docito</title>
        <meta name="description" content={t("imagingPage.hero.subheadline")} />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="min-h-screen bg-background overflow-x-hidden">
        <ModernNavbar />

        {/* Hero */}
        <section ref={heroRef} className="relative min-h-[82vh] pt-10 md:pt-14 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

          <motion.div style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
            className="relative z-10 container mx-auto px-4 text-center max-w-5xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8">
              <Scan className="w-4 h-4" />
              <span className="text-sm font-medium tracking-wide">{t("imagingPage.hero.kicker")}</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-[0.95]">
              <span className="text-foreground">{t("imagingPage.hero.headlineLine1")}</span><br />
              <span className="text-foreground">{t("imagingPage.hero.headlineLine2")}</span><br />
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                {t("imagingPage.hero.headlineLine3")}
              </span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed font-light">
              {t("imagingPage.hero.subheadline")}
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-10 h-16 rounded-2xl shadow-lg shadow-primary/25">
                <Link to="/imaging/register">{t("imagingPage.hero.primaryCta")}<ArrowRight className="ml-2 w-5 h-5" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-10 h-16 rounded-2xl">
                <Link to="/contact">{t("imagingPage.hero.secondaryCta")}</Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="py-32">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-4xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight">
                {t("imagingPage.features.title")} <span className="text-primary">{t("imagingPage.features.subtitle")}</span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">{t("imagingPage.features.description")}</p>
            </AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {features.map((f, i) => (
                <GlassCard key={i} icon={f.icon} title={f.title} description={f.description} delay={i * 0.08} />
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-32">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight">
                {t("imagingPage.howItWorks.title")}
              </h2>
              <p className="text-xl text-muted-foreground">{t("imagingPage.howItWorks.subtitle")}</p>
            </AnimatedSection>
            <div className="max-w-2xl mx-auto">
              {steps.map((s, i) => (
                <TimelineItem key={i} number={s.number} title={s.title} description={s.description} delay={i * 0.1} />
              ))}
            </div>
          </div>
        </section>

        {/* Connected Ecosystem */}
        <section className="py-32 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px]" />
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <AnimatedSection className="text-center max-w-4xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight">{t("imagingPage.ecosystem.title")}</h2>
              <p className="text-xl text-muted-foreground leading-relaxed">{t("imagingPage.ecosystem.description")}</p>
            </AnimatedSection>
            <AnimatedSection>
              <Card className="max-w-5xl mx-auto p-12 md:p-16 border-border/30 bg-gradient-to-br from-card/60 to-muted/30 backdrop-blur-xl">
                <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                  {integrations.map((item, index) => (
                    <motion.div key={index} className="flex flex-col items-center gap-4 group"
                      initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }} viewport={{ once: true }}>
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center group-hover:border-primary/30 group-hover:shadow-lg transition-all duration-300">
                        <item.icon className="w-10 h-10 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-12 pt-8 border-t border-border/30 text-center">
                  <p className="text-muted-foreground">{t("imagingPage.ecosystem.footer")}</p>
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
                {t("imagingPage.compliance.title")}
              </h2>
            </AnimatedSection>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 max-w-5xl mx-auto">
              {compliance.map((item, index) => (
                <AnimatedSection key={index}>
                  <Card className="p-6 md:p-8 text-center border-border/30 bg-card/40 backdrop-blur-xl h-full hover:border-primary/20 transition-all duration-500">
                    <item.icon className="w-10 h-10 mx-auto mb-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">{item.text}</p>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32">
          <div className="container mx-auto px-4">
            <AnimatedSection>
              <Card className="p-10 md:p-12 border-border/40 bg-gradient-to-br from-primary/10 via-background to-accent/10 backdrop-blur-xl text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-3">{t("imagingPage.finalCta.headline")}</h2>
                <p className="text-muted-foreground text-lg mb-6">{t("imagingPage.finalCta.subheadline")}</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild size="lg" className="text-lg px-12 h-16 rounded-2xl shadow-lg shadow-primary/25">
                    <Link to="/imaging/register">{t("imagingPage.finalCta.primaryCta")}<ArrowRight className="ml-2 w-5 h-5" /></Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="text-lg px-12 h-16 rounded-2xl">
                    <Link to="/contact">{t("imagingPage.finalCta.secondaryCta")}</Link>
                  </Button>
                </div>
              </Card>
            </AnimatedSection>
          </div>
        </section>

        {!footerProvided ? (
          <footer className="py-12 border-t border-border/50">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-muted-foreground text-sm">© {new Date().getFullYear()} Docito. All rights reserved.</p>
                <div className="flex gap-8">
                  <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
                  <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
                  <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
                </div>
              </div>
            </div>
          </footer>
        ) : null}
      </div>
    </>
  );
}
