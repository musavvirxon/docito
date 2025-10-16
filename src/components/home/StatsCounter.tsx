import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";

const StatsCounter = () => {
  const stats = [
    { value: 10000, suffix: "+", label: "Doctors" },
    { value: 1000000, suffix: "+", label: "Patients" },
    { value: 50, suffix: "+", label: "Countries" },
    { value: 4.9, suffix: "/5", label: "Avg Rating", decimal: true },
  ];

  return (
    <section className="py-24 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(243,75%,59%)]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <CountUpAnimation
                value={stat.value}
                suffix={stat.suffix}
                decimal={stat.decimal}
              />
              <div className="text-lg text-primary-foreground/80 mt-2">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CountUpAnimation = ({
  value,
  suffix,
  decimal,
}: {
  value: number;
  suffix: string;
  decimal?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 2000 });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  useEffect(() => {
    springValue.on("change", (latest) => {
      if (ref.current) {
        const displayValue = decimal ? latest.toFixed(1) : Math.floor(latest).toLocaleString();
        ref.current.textContent = displayValue + suffix;
      }
    });
  }, [springValue, suffix, decimal]);

  return (
    <div
      ref={ref}
      className="text-5xl md:text-6xl font-bold text-primary-foreground bg-gradient-to-r from-primary-foreground to-primary-foreground/80 bg-clip-text"
    >
      0{suffix}
    </div>
  );
};

export default StatsCounter;
