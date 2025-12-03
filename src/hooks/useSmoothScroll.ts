import { useEffect } from 'react';

export const useSmoothScroll = (speed: number = 0.08) => {
  useEffect(() => {
    let targetScroll = window.scrollY;
    let currentScroll = window.scrollY;
    let animationId: number | null = null;
    let isScrolling = false;

    const lerp = (start: number, end: number, factor: number) => {
      return start + (end - start) * factor;
    };

    const smoothScroll = () => {
      currentScroll = lerp(currentScroll, targetScroll, speed);
      
      if (Math.abs(currentScroll - targetScroll) < 0.5) {
        currentScroll = targetScroll;
        isScrolling = false;
        if (animationId) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
        return;
      }

      window.scrollTo(0, currentScroll);
      animationId = requestAnimationFrame(smoothScroll);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      targetScroll = Math.max(0, Math.min(targetScroll + e.deltaY, maxScroll));
      
      if (!isScrolling) {
        isScrolling = true;
        animationId = requestAnimationFrame(smoothScroll);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const scrollAmount = window.innerHeight * 0.3;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        targetScroll = Math.min(targetScroll + scrollAmount, maxScroll);
        if (!isScrolling) {
          isScrolling = true;
          animationId = requestAnimationFrame(smoothScroll);
        }
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        targetScroll = Math.max(targetScroll - scrollAmount, 0);
        if (!isScrolling) {
          isScrolling = true;
          animationId = requestAnimationFrame(smoothScroll);
        }
      }
    };

    // Sync target scroll when user clicks scrollbar or uses touch
    const syncScroll = () => {
      if (!isScrolling) {
        targetScroll = window.scrollY;
        currentScroll = window.scrollY;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', syncScroll);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', syncScroll);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [speed]);
};
