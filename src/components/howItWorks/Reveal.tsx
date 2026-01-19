import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Delay in milliseconds */
  delayMs?: number;
  /** Delay as a number (converted to ms internally) - for backwards compatibility */
  delay?: number;
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export default function Reveal({ children, className, delayMs = 0, delay }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(prefersReducedMotion());

  // Support both delayMs and delay props (delay is in seconds, convert to ms)
  const actualDelay = delayMs || (delay ? delay * 1000 : 0);

  useEffect(() => {
    if (shown) return;

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { root: null, rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 will-change-transform will-change-opacity",
        shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
      style={actualDelay ? { transitionDelay: `${actualDelay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
