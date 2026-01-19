// File: src/components/howItWorks/LazyMount.tsx
import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  rootMargin?: string;
  minHeightClassName?: string;
};

export default function LazyMount({
  children,
  rootMargin = "200px",
  minHeightClassName = "min-h-[240px]",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting) {
          setMounted(true);
          io.disconnect();
        }
      },
      { root: null, rootMargin, threshold: 0.01 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [mounted, rootMargin]);

  return <div ref={ref} className={!mounted ? minHeightClassName : undefined}>{mounted ? children : null}</div>;
}
