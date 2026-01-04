import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Scan,
  FileText,
  Shield,
  Lock,
  CheckCircle,
  ArrowRight,
  Stethoscope,
  Building2,
  Pill,
  FlaskConical,
  BadgeCheck,
  Zap,
  BarChart3,
  Users,
  Calendar,
  CreditCard,
  Eye,
  Server,
  FileImage,
  Layers,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import ModernNavbar from '@/components/home/ModernNavbar';
import { useTranslation } from 'react-i18next';

const AnimatedSection = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => {
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

const GlassCard = ({
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
      <Card className="group relative overflow-hidden border-border/30 bg-card/40 backdrop-blur-2xl p-8 h-full hover:border-primary/40 transition-all duration-700 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.15)] hover:-translate-y-2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
            <Icon className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-3 text-foreground tracking-tight">
            {title}
          </h3>
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            {description}
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

const TimelineItem = ({
  number,
  title,
  description,
  delay = 0,
}: {
  number: string;
  title: string;
  description: string;
  delay?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -40 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
      transition={{ duration: 0.6, delay }}
      className="flex gap-6 group"
    >
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform duration-300">
          {number}
        </div>
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
  const { t, i18n } = useTranslation('imaging');

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  const canonical = useMemo(() => {
    // Keep a single canonical for SEO; if you do per-language routes later, adjust here.
    return 'https://docito.app/imaging-center';
  }, []);

  const features = useMemo(
    () => [
      {
        icon: FileText,
        title: t('features.items.digitalReferrals.title'),
        description: t('features.items.digitalReferrals.description'),
      },
      {
        icon: Calendar,
        title: t('features.items.smartScheduling.title'),
        description: t('features.items.smartScheduling.description'),
      },
      {
        icon: Server,
        title: t('features.items.pacsDicom.title'),
        description: t('features.items.pacsDicom.description'),
      },
      {
        icon: FileImage,
        title: t('features.items.reportManagement.title'),
        description: t('features.items.reportManagement.description'),
      },
      {
        icon: Eye,
        title: t('features.items.patientAccess.title'),
        description: t('features.items.patientAccess.description'),
      },
      {
        icon: CreditCard,
        title: t('features.items.billingInsurance.title'),
        description: t('features.items.billingInsurance.description'),
      },
      {
        icon: BarChart3,
        title: t('features.items.analyticsInsights.title'),
        description: t('features.items.analyticsInsights.description'),
      },
    ],
    [t]
  );

  const steps = useMemo(
    () => [
      {
        number: '01',
        title: t('howItWorks.steps.step1.title'),
        description: t('howItWorks.steps.step1.description'),
      },
      {
        number: '02',
        title: t('howItWorks.steps.step2.title'),
        description: t('howItWorks.steps.step2.description'),
      },
      {
        number: '03',
        title: t('howItWorks.steps.step3.title'),
        description: t('howItWorks.steps.step3.description'),
      },
      {
        number: '04',
        title: t('howItWorks.steps.step4.title'),
        description: t('howItWorks.steps.step4.description'),
      },
      {
        number: '05',
        title: t('howItWorks.steps.step5.title'),
        description: t('howItWorks.steps.step5.description'),
      },
      {
        number: '06',
        title: t('howItWorks.steps.step6.title'),
        description: t('howItWorks.steps.step6.description'),
      },
    ],
    [t]
  );

  const integrations = useMemo(
    () => [
      { icon: Stethoscope, label: t('integrations.items.doctors.title') },
      { icon: Building2, label: t('integrations.items.clinics.title') },
      { icon: FlaskConical, label: t('integrations.items.labs.title') },
      { icon: Pill, label: t('integrations.items.pharmacies.title') },
      { icon: BadgeCheck, label: t('integrations.items.insurance.title') },
      { icon: Users, label: t('integrations.items.patients.title') },
    ],
    [t]
  );

  const compliance = useMemo(
    () => [
      { icon: Shield, text: t('compliance.items.hipaa') },
      { icon: Lock, text: t('compliance.items.dicom') },
      { icon: FileText, text: t('compliance.items.encrypted') },
      { icon: Users, text: t('compliance.items.rbac') },
      { icon: CheckCircle, text: t('compliance.items.audit') },
    ],
    [t]
  );

  const pricingChips = useMemo(
    () => [
      t('pricing.chips.noLockIn'),
      t('pricing.chips.flexiblePlans'),
      t('pricing.chips.enterpriseReady'),
    ],
    [t]
  );

  return (
    <>
      <Helmet htmlAttributes={{ lang: i18n.language || 'en' }}>
        <title>{t('seo.title')}</title>
        <meta name="description" content={t('seo.description')} />
        <meta name="keywords" content={t('seo.keywords')} />
        <link rel="canonical" href={canonical} />

        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'MedicalBusiness',
            name: t('schema.name'),
            description: t('schema.description'),
            areaServed: 'Global',
            serviceType: t('schema.serviceType'),
            url: canonical,
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background overflow-x-hidden">
        <ModernNavbar />

        {/* Hero */}
        <section
          ref={heroRef}
          className="relative min-h-[100vh] flex items-center justify-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
            <div
              className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] animate-pulse"
              style={{ animationDelay: '1s' }}
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

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
              <Scan className="w-4 h-4" />
              <span className="text-sm font-medium tracking-wide">
                {t('hero.badge')}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[0.95]"
            >
              <span className="text-foreground">{t('hero.title1')}</span>
              <br />
              <span className="text-foreground">{t('hero.title2')}</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                {t('hero.title3')}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed font-light"
            >
              {t('hero.description')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                asChild
                size="lg"
                className="text-lg px-10 h-16 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 font-medium"
              >
                <Link to="/imaging/register">
                  {t('hero.primaryCta')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-lg px-10 h-16 rounded-2xl border-border/50 hover:bg-muted/50 transition-all duration-300"
              >
                <Link to="/contact">{t('hero.secondaryCta')}</Link>
              </Button>
            </motion.div>

            <div className="mt-8 text-sm text-muted-foreground">
              {t('hero.trustNote')}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-6 h-10 rounded-full border-2 border-muted-foreground/20 flex justify-center pt-2"
            >
              <div className="w-1 h-2 rounded-full bg-muted-foreground/40" />
            </motion.div>
          </motion.div>
        </section>

        {/* Problems */}
        <section className="py-32 relative">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-4xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight">
                {t('problems.title1')}{' '}
                <span className="text-muted-foreground">{t('problems.title2')}</span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {t('problems.description')}
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  from: t('problems.cards.paperFrom'),
                  to: t('problems.cards.paperTo'),
                  icon: FileText,
                },
                {
                  from: t('problems.cards.pacsFrom'),
                  to: t('problems.cards.pacsTo'),
                  icon: Layers,
                },
                {
                  from: t('problems.cards.reportsFrom'),
                  to: t('problems.cards.reportsTo'),
                  icon: Zap,
                },
              ].map((item, index) => (
                <AnimatedSection key={index}>
                  <Card className="p-8 text-center border-border/30 bg-card/40 backdrop-blur-xl h-full hover:border-primary/20 transition-all duration-500">
                    <item.icon className="w-12 h-12 mx-auto mb-6 text-primary" />
                    <p className="text-muted-foreground line-through mb-3 text-lg">
                      {item.from}
                    </p>
                    <p className="font-semibold text-foreground text-xl">{item.to}</p>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-32 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight">
                {t('features.title1')}{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {t('features.title2')}
                </span>
              </h2>
              <p className="text-xl text-muted-foreground">{t('features.subtitle')}</p>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {features.map((feature, index) => (
                <GlassCard
                  key={index}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  delay={index * 0.08}
                />
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-32">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight">
                {t('howItWorks.title1')}{' '}
                <span className="text-primary">{t('howItWorks.title2')}</span>
              </h2>
              <p className="text-xl text-muted-foreground">{t('howItWorks.subtitle')}</p>
            </AnimatedSection>

            <div className="max-w-2xl mx-auto">
              {steps.map((step, index) => (
                <TimelineItem
                  key={index}
                  number={step.number}
                  title={step.title}
                  description={step.description}
                  delay={index * 0.1}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Ecosystem */}
        <section className="py-32 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px]" />
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <AnimatedSection className="text-center max-w-4xl mx-auto mb-20">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight">
                {t('ecosystem.title1')}{' '}
                <span className="text-primary">{t('ecosystem.title2')}</span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {t('ecosystem.description')}
              </p>
            </AnimatedSection>

            <AnimatedSection>
              <Card className="max-w-5xl mx-auto p-12 md:p-16 border-border/30 bg-gradient-to-br from-card/60 to-muted/30 backdrop-blur-xl">
                <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                  {integrations.map((item, index) => (
                    <motion.div
                      key={index}
                      className="flex flex-col items-center gap-4 group"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center group-hover:border-primary/30 group-hover:shadow-lg transition-all duration-300">
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
                    <span className="text-primary font-medium">
                      {t('ecosystem.networkName')}
                    </span>{' '}
                    — {t('ecosystem.networkLine')}
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
                {t('security.title1')}{' '}
                <span className="text-primary">{t('security.title2')}</span>
                {t('security.title3')}
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

        {/* Pricing */}
        <section className="py-32 bg-muted/30">
          <div className="container mx-auto px-4">
            <AnimatedSection className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">
                {t('pricing.title')}{' '}
                <span className="text-primary">{t('pricing.emphasis')}</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
                {t('pricing.subtitle')}
              </p>

              <div className="flex flex-wrap justify-center gap-4 mb-10">
                {pricingChips.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="h-14 px-8 rounded-xl">
                  <Link to="/pricing">{t('pricing.buttons.viewPricing')}</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-14 px-8 rounded-xl"
                >
                  <Link to="/contact">{t('pricing.buttons.talkToSales')}</Link>
                </Button>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-40 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px]" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px]" />
          </div>
          <div className="relative z-10 container mx-auto px-4 text-center">
            <AnimatedSection>
              <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold mb-8 tracking-tight max-w-5xl mx-auto leading-tight">
                {t('finalCta.title1')}{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {t('finalCta.title2')}
                </span>
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
                {t('finalCta.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="text-lg px-12 h-16 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                >
                  <Link to="/imaging/register">
                    {t('finalCta.buttons.register')}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="text-lg px-12 h-16 rounded-2xl"
                >
                  <Link to="/contact">{t('finalCta.buttons.demo')}</Link>
                </Button>
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-border/50">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-muted-foreground text-sm">
                {t('footer.copyright', { year: new Date().getFullYear() })}
              </p>
              <div className="flex gap-8">
                <Link
                  to="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('footer.links.privacy')}
                </Link>
                <Link
                  to="/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('footer.links.terms')}
                </Link>
                <Link
                  to="/contact"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('footer.links.contact')}
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
