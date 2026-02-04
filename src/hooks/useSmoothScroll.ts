import { useEffect, useRef } from 'react';

export const useSmoothScroll = (speed: number = 0.15) => {
  // Cache dimensions to avoid forced reflow on every wheel event
  const cachedMaxScrollRef = useRef(0);

  useEffect(() => {
    let targetScroll = window.scrollY;
    let currentScroll = window.scrollY;
    let animationId: number | null = null;

    // Cache max scroll on mount and resize - avoids forced reflow in wheel handler
    const updateCachedMaxScroll = () => {
      cachedMaxScrollRef.current = document.documentElement.scrollHeight - window.innerHeight;
    };

    // Initial cache
    updateCachedMaxScroll();

    // Update cache on resize using matchMedia-style approach
    const resizeObserver = new ResizeObserver(() => {
      updateCachedMaxScroll();
    });
    resizeObserver.observe(document.documentElement);

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
      
      // Use cached value instead of reading window.innerHeight (avoids forced reflow)
      const maxScroll = cachedMaxScrollRef.current;
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
      resizeObserver.disconnect();
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [speed]);
};
