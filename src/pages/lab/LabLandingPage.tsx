import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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

const TimelineStep = ({
  number,
  title,
  description,
  isLast = false,
}: {
  number: string;
  title: string;
  description: string;
  isLast?: boolean;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
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
  const isInView = useInView(ref, { once: true, margin: '-50px' });

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
  const { t } = useTranslation('lab');

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  const seoTitle = t('seo.title');
  const seoDescription = t('seo.description');
  const seoKeywords = t('seo.keywords');

  const featureItems = useMemo(
    () => [
      { icon: TestTube, title: t('features.items.orderIntake.title'), description: t('features.items.orderIntake.description') },
      { icon: Calendar, title: t('features.items.slotScheduling.title'), description: t('features.items.slotScheduling.description') },
      { icon: FileCheck, title: t('features.items.sampleTracking.title'), description: t('features.items.sampleTracking.description') },
      { icon: Shield, title: t('features.items.resultsDelivery.title'), description: t('features.items.resultsDelivery.description') },
      { icon: Bell, title: t('features.items.notifications.title'), description: t('features.items.notifications.description') },
      { icon: BarChart3, title: t('features.items.analytics.title'), description: t('features.items.analytics.description') }
    ],
    [t]
  );

  const problemItems = useMemo(
    () => [
      { icon: Zap, problem: t('problems.items.paperOrders.problem'), solution: t('problems.items.paperOrders.solution') },
      { icon: Calendar, problem: t('problems.items.noScheduling.problem'), solution: t('problems.items.noScheduling.solution') },
      { icon: FileCheck, problem: t('problems.items.lostSamples.problem'), solution: t('problems.items.lostSamples.solution') },
      { icon: Shield, problem: t('problems.items.lateResults.problem'), solution: t('problems.items.lateResults.solution') },
      { icon: BarChart3, problem: t('problems.items.noAnalytics.problem'), solution: t('problems.items.noAnalytics.solution') },
      { icon: Lock, problem: t('problems.items.complianceRisk.problem'), solution: t('problems.items.complianceRisk.solution') }
    ],
    [t]
  );

  const steps = useMemo(
    () => [
      { n: '1', title: t('howItWorks.steps.step1.title'), description: t('howItWorks.steps.step1.description') },
      { n: '2', title: t('howItWorks.steps.step2.title'), description: t('howItWorks.steps.step2.description') },
      { n: '3', title: t('howItWorks.steps.step3.title'), description: t('howItWorks.steps.step3.description') },
      { n: '4', title: t('howItWorks.steps.step4.title'), description: t('howItWorks.steps.step4.description') }
    ],
    [t]
  );

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={seoKeywords} />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content="/logos/social/docito-og-image.png" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content="/logos/social/docito-og-image.png" />
      </Helmet>

      <AppleNavbar />

      {/* Hero */}
      <section ref={heroRef} className="relative pt-28 pb-20">
        <motion.div style={{ y: heroY }} className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_55%)]" />
        </motion.div>

        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-6">
              <Microscope className="w-4 h-4" />
              {t('hero.badge')}
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
              {t('hero.title1')}{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t('hero.title2')}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-3xl mx-auto">
              {t('hero.description')}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Button size="lg" className="rounded-full px-8" asChild>
                <Link to="/auth?mode=register">
                  {t('hero.primaryCta')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>

              <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
                <Link to="/contact">
                  {t('hero.secondaryCta')}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">{t('hero.trustNote')}</p>
          </div>
        </div>
      </section>

      {/* Problems -> Solutions */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-sm font-medium text-foreground mb-4">
              <BadgeCheck className="w-4 h-4" />
              {t('problems.badge')}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('problems.title')}</h2>
            <p className="text-muted-foreground text-lg">{t('problems.subtitle')}</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {problemItems.map((p, i) => (
              <ProblemSolutionCard key={i} icon={p.icon} problem={p.problem} solution={p.solution} />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-4">
              <Shield className="w-4 h-4" />
              {t('features.badge')}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('features.title')}</h2>
            <p className="text-muted-foreground text-lg">{t('features.subtitle')}</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureItems.map((f, idx) => (
              <FeatureCard key={idx} icon={f.icon} title={f.title} description={f.description} delay={idx * 0.05} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-sm font-medium text-foreground mb-4">
              <Activity className="w-4 h-4" />
              {t('howItWorks.badge')}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('howItWorks.title')}</h2>
            <p className="text-muted-foreground text-lg">{t('howItWorks.subtitle')}</p>
          </AnimatedSection>

          <div className="max-w-3xl mx-auto">
            {steps.map((s, idx) => (
              <TimelineStep
                key={s.n}
                number={s.n}
                title={s.title}
                description={s.description}
                isLast={idx === steps.length - 1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Integrations / Ecosystem */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <AnimatedSection className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-4">
              <Globe className="w-4 h-4" />
              {t('integrations.badge')}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('integrations.title')}</h2>
            <p className="text-muted-foreground text-lg">{t('integrations.subtitle')}</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-xl">
              <div className="flex items-start gap-4">
                <Stethoscope className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">{t('integrations.items.doctors.title')}</h3>
                  <p className="text-muted-foreground">{t('integrations.items.doctors.description')}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-xl">
              <div className="flex items-start gap-4">
                <Building2 className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">{t('integrations.items.clinics.title')}</h3>
                  <p className="text-muted-foreground">{t('integrations.items.clinics.description')}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-xl">
              <div className="flex items-start gap-4">
                <Users className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">{t('integrations.items.patients.title')}</h3>
                  <p className="text-muted-foreground">{t('integrations.items.patients.description')}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-xl">
              <div className="flex items-start gap-4">
                <Database className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-1">{t('integrations.items.insurance.title')}</h3>
                  <p className="text-muted-foreground">{t('integrations.items.insurance.description')}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <AnimatedSection className="max-w-4xl mx-auto">
            <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-xl p-10 md:p-12">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('cta.title')}</h2>
                <p className="text-muted-foreground text-lg mb-6">{t('cta.description')}</p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button size="lg" className="rounded-full px-8" asChild>
                    <Link to="/auth?mode=register">
                      {t('cta.primary')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
                    <Link to="/contact">
                      {t('cta.secondary')}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground mt-4">{t('cta.note')}</p>
              </div>
            </Card>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer quick links */}
      <footer className="py-10 border-t border-border/60">
        <div className="container mx-auto px-4 flex items-center justify-between gap-4 flex-wrap">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t('nav.backToHome')}
          </Link>
          <div className="flex gap-4">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('nav.signIn')}
            </Link>
            <Link to="/auth?mode=register" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('nav.getStarted')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

