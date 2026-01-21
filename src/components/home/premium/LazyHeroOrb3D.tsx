import { lazy, Suspense, useState, useEffect, useCallback, memo } from 'react';
import HeroStaticFallback from './HeroStaticFallback';

// Lazy load the heavy 3D component
const HeroOrb3D = lazy(() => import('./HeroOrb3D'));

function LazyHeroOrb3D() {
  const [shouldLoad3D, setShouldLoad3D] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // On desktop: load 3D after first interaction (scroll/click anywhere)
  useEffect(() => {
    if (isMobile || hasInteracted) return;

    const handleInteraction = () => {
      setHasInteracted(true);
      setShouldLoad3D(true);
    };

    // Use passive listeners for scroll performance
    window.addEventListener('scroll', handleInteraction, { passive: true, once: true });
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { passive: true, once: true });

    return () => {
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [isMobile, hasInteracted]);

  // Manual trigger for static fallback click
  const handleFallbackClick = useCallback(() => {
    setShouldLoad3D(true);
    setHasInteracted(true);
  }, []);

  // Mobile: always show static fallback (can click to load 3D if desired)
  // Desktop: show fallback until interaction, then load 3D
  if (!shouldLoad3D) {
    return <HeroStaticFallback onClick={handleFallbackClick} />;
  }

  return (
    <Suspense fallback={<HeroStaticFallback />}>
      <HeroOrb3D />
    </Suspense>
  );
}

export default memo(LazyHeroOrb3D);
