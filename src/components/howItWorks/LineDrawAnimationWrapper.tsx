// File: src/components/howItWorks/LineDrawAnimationWrapper.tsx
import { useEffect, useId, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  durationMs?: number;
  className?: string;
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export default function LineDrawAnimationWrapper({ children, durationMs = 2400, className }: Props) {
  const scopeId = useId().replace(/:/g, "");

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const root = document.querySelector<HTMLElement>(`[data-line-draw-scope="${scopeId}"]`);
    if (!root) return;

    const paths = Array.from(root.querySelectorAll<SVGPathElement>("[data-draw-path]"));
    for (const p of paths) {
      try {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
        p.style.setProperty("--ldw-len", `${len}`);
      } catch {
        // ignore
      }
    }

    root.classList.remove("ldw-play");
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    root.offsetHeight;
    root.classList.add("ldw-play");

    const t = window.setTimeout(() => {
      root.classList.remove("ldw-play");
    }, Math.max(durationMs + 200, 0));

    return () => window.clearTimeout(t);
  }, [durationMs, scopeId]);

  return (
    <div data-line-draw-scope={scopeId} className={className}>
      <style>{`
        [data-line-draw-scope="${scopeId}"] [data-draw-path] {
          opacity: 0.9;
          will-change: stroke-dashoffset, opacity;
        }

        [data-line-draw-scope="${scopeId}"] [data-float-dot] {
          opacity: 0;
          will-change: transform, opacity;
        }

        @keyframes ldw-draw-${scopeId} {
          from { stroke-dashoffset: var(--ldw-len, 1); opacity: 0.2; }
          to { stroke-dashoffset: 0; opacity: 1; }
        }

        @keyframes ldw-dot-${scopeId} {
          0%   { transform: translateY(0px); opacity: 0; }
          25%  { opacity: 0.9; }
          100% { transform: translateY(-10px); opacity: 0; }
        }

        [data-line-draw-scope="${scopeId}"].ldw-play [data-draw-path] {
          animation: ldw-draw-${scopeId} ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1) 1 forwards;
        }

        [data-line-draw-scope="${scopeId}"].ldw-play [data-float-dot] {
          animation: ldw-dot-${scopeId} 2200ms ease-out 1 forwards;
        }
      `}</style>
      {children}
    </div>
  );
}
