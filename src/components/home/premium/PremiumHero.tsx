import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LazyHeroOrb3D from './LazyHeroOrb3D';

export default function PremiumHero() {
  const { t } = useTranslation(['home']);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Trigger CSS animations after mount
  useEffect(() => {
    // Small delay to ensure paint has completed
    const timer = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  useEffect(() => {
    // Dynamically import GSAP to avoid blocking LCP
    import('gsap').then(({ default: gsap }) => {
      // Only animate if already visible (progressive enhancement)
      if (titleRef.current) {
        gsap.fromTo(
          titleRef.current,
          { y: 30 },
          { y: 0, duration: 0.8, ease: 'power3.out' }
        );
      }
      if (subtitleRef.current) {
        gsap.fromTo(
          subtitleRef.current,
          { y: 20 },
          { y: 0, duration: 0.8, ease: 'power3.out', delay: 0.1 }
        );
      }
    });
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-visible pt-20">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center">
        {/* Left side - Text content */}
        <div className="relative z-10 w-full lg:w-1/2 py-20 lg:pr-8">
          <div className="text-left space-y-8">
            {/* Badge - CSS animation instead of framer-motion */}
            <div
              className={`transform transition-all duration-500 ease-out ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 backdrop-blur-sm text-primary text-sm font-medium rounded-full border border-primary/20">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                {t('home:hero.badge', 'Professional Medical Platform')}
              </span>
            </div>

            {/* Title - NO opacity:0, visible immediately for LCP */}
            <h1
              ref={titleRef}
              className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-foreground"
            >
              <span className="block">
                {t('home:hero.title1', 'Complete Healthcare')}
              </span>
              <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent font-normal">
                {t('home:hero.title2', 'Operating System')}
              </span>
            </h1>

            {/* Subtitle - visible immediately */}
            <p
              ref={subtitleRef}
              className="text-lg sm:text-xl text-muted-foreground max-w-xl font-light leading-relaxed"
            >
              {t(
                'home:hero.description',
                'Unified scheduling, records, diagnostics, prescriptions, and payments for the modern healthcare ecosystem.'
              )}
            </p>

            {/* CTA Buttons - CSS animation instead of framer-motion */}
            <div
              className={`flex flex-col sm:flex-row gap-4 transform transition-all duration-500 ease-out delay-300 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
              }`}
            >
              <button
                className="px-8 py-4 bg-primary text-primary-foreground font-medium rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {t('home:cta.scheduleDemo', 'Schedule Demo')}
              </button>
              <button
                className="px-8 py-4 bg-background/80 backdrop-blur-sm text-foreground font-medium rounded-full border border-border/50 hover:bg-background/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {t('home:cta.learnMore', 'Learn More')}
              </button>
            </div>
          </div>
        </div>

        {/* Right side - 3D Globe (lazy loaded) */}
        <div className="w-full lg:w-1/2 h-[500px] lg:h-[700px] relative">
          <LazyHeroOrb3D />
        </div>
      </div>

      {/* Scroll indicator - CSS animation */}
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-10 transition-opacity duration-500 delay-[1500ms] ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center animate-bounce">
          <div className="w-1.5 h-3 bg-muted-foreground/50 rounded-full mt-2" />
        </div>
      </div>
    </section>
  );
}
