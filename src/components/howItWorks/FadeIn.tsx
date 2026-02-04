// File: src/components/howItWorks/FadeIn.tsx
import { type ReactNode, memo } from "react";
import { useInViewOnce } from "./useInViewOnce";

type Props = {
  children: ReactNode;
  className?: string;
  rootMargin?: string;
};

// Memoized to prevent unnecessary re-renders and reduce main-thread work
const FadeIn = memo(function FadeIn({ children, className, rootMargin = "0px" }: Props) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(rootMargin);

  return (
    <div
      ref={ref}
      className={[
        className,
        // Use transform-gpu for hardware acceleration, reducing main thread work
        "transition-[opacity,transform] duration-700 ease-out transform-gpu",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
      ]
        .filter(Boolean)
        .join(" ")}
      // Only apply will-change when element is about to animate (not yet in view)
      style={inView ? undefined : { willChange: "opacity, transform" }}
    >
      {children}
    </div>
  );
});

export default FadeIn;
