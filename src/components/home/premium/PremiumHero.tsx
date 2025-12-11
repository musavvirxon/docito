import { useEffect, useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import gsap from 'gsap';
import HeroOrb3D from './HeroOrb3D';

export default function PremiumHero() {
  const { t } = useTranslation(['home']);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // GSAP text animation
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.3 }
      );
    }
    if (subtitleRef.current) {
      gsap.fromTo(
        subtitleRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.5 }
      );
    }
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-visible pt-20">
      {/* Background gradient - more transparent */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-transparent to-transparent pointer-events-none" />
      
      {/* Animated background orbs - reduced opacity */}
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px]"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left space-y-8">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                {t('home:hero.badge', 'Professional Medical Platform')}
              </span>
            </motion.div>

            {/* Title */}
            <h1
              ref={titleRef}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-light tracking-tight text-foreground"
              style={{ opacity: 0 }}
            >
              <span className="block">{t('home:hero.title1', 'Complete Healthcare')}</span>
              <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent font-normal">
                {t('home:hero.title2', 'Operating System')}
              </span>
            </h1>

            {/* Subtitle */}
            <p
              ref={subtitleRef}
              className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 font-light leading-relaxed"
              style={{ opacity: 0 }}
            >
              {t('home:hero.description', 'Unified scheduling, records, diagnostics, prescriptions, and payments for the modern healthcare ecosystem.')}
            </p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-primary text-primary-foreground font-medium rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
              >
                {t('home:cta.scheduleDemo', 'Schedule Demo')}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-muted text-foreground font-medium rounded-full hover:bg-muted/80 transition-all"
              >
                {t('home:cta.learnMore', 'Learn More')}
              </motion.button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="grid grid-cols-3 gap-8 pt-8 border-t border-border/50"
            >
              {[
                { value: '10K+', label: t('home:stats.doctors', 'Doctors') },
                { value: '500K+', label: t('home:stats.patients', 'Patients') },
                { value: '98%', label: t('home:stats.satisfaction', 'Satisfaction') },
              ].map((stat, i) => (
                <div key={i} className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-semibold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* 3D Orb */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative"
          >
            <Suspense fallback={
              <div className="w-full h-[500px] flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-primary/20 animate-pulse" />
              </div>
            }>
              <HeroOrb3D />
            </Suspense>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center"
        >
          <motion.div
            animate={{ y: [0, 12, 0], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-3 bg-muted-foreground/50 rounded-full mt-2"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
