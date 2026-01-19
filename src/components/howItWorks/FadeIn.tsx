// File: src/components/howItWorks/FadeIn.tsx
import { type ReactNode } from "react";
import { useInViewOnce } from "./useInViewOnce";

type Props = {
  children: ReactNode;
  className?: string;
  rootMargin?: string;
};

export default function FadeIn({ children, className, rootMargin = "0px" }: Props) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(rootMargin);

  return (
    <div
      ref={ref}
      className={[
        className,
        "transition-all duration-700 ease-out will-change-transform will-change-opacity",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
