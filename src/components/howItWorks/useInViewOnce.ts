import { useEffect, useMemo, useRef, useState } from "react";

type Options = {
  rootMargin?: string;
  threshold?: number;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useInViewOnce<T extends HTMLElement>(rootMarginOrOptions?: string | Options) {
  // Handle both string and object params for backward compatibility
  const opts: Options = typeof rootMarginOrOptions === "string" 
    ? { rootMargin: rootMarginOrOptions } 
    : rootMarginOrOptions || {};
  
  const { rootMargin = "0px 0px -10% 0px", threshold = 0.12 } = opts;

  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  const disabled = useMemo(() => prefersReducedMotion(), []);

  useEffect(() => {
    if (disabled) {
      setInView(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    if (inView) return;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [disabled, inView, rootMargin, threshold]);

  return { ref, inView } as const;
}
