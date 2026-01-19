// File: src/components/howItWorks/useInViewOnce.ts
import { useEffect, useRef, useState } from "react";

export function useInViewOnce<T extends HTMLElement>(rootMargin = "0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { root: null, rootMargin, threshold: 0.12 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView } as const;
}
