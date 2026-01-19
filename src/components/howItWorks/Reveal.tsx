// File: src/components/howItWorks/Reveal.tsx
import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { useInViewOnce } from "./useInViewOnce";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

export default function Reveal({ children, className, delay = 0, y = 14 }: Props) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
