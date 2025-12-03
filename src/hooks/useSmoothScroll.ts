import { useEffect } from 'react';

export const useSmoothScroll = (speed: number = 0.15) => {
  useEffect(() => {
    let targetScroll = window.scrollY;
    let currentScroll = window.scrollY;
    let animationId: number | null = null;

    const smoothScroll = () => {
      const diff = targetScroll - currentScroll;
      
      // Faster response with minimal delay
      if (Math.abs(diff) < 1) {
        currentScroll = targetScroll;
        window.scrollTo(0, currentScroll);
        animationId = null;
        return;
      }

      // Quick acceleration with smooth deceleration
      currentScroll += diff * speed;
      window.scrollTo(0, currentScroll);
      animationId = requestAnimationFrame(smoothScroll);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      targetScroll = Math.max(0, Math.min(targetScroll + e.deltaY, maxScroll));
      
      if (!animationId) {
        animationId = requestAnimationFrame(smoothScroll);
      }
    };

    const syncScroll = () => {
      if (!animationId) {
        targetScroll = window.scrollY;
        currentScroll = window.scrollY;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('scroll', syncScroll);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', syncScroll);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [speed]);
};
