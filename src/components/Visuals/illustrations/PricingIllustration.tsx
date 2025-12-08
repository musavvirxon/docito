import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface PricingIllustrationProps {
  className?: string;
}

export const PricingIllustration = ({ className = "" }: PricingIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  const plans = [
    { x: 30, height: 70, color: "fill-muted", delay: 0, price: "$" },
    { x: 95, height: 100, color: "fill-primary", delay: 0.2, featured: true, price: "$$" },
    { x: 160, height: 80, color: "fill-muted", delay: 0.4, price: "$$$" },
  ];

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 240 180" className="w-full h-full">
        {/* Background gradient circle */}
        <motion.circle
          cx="120"
          cy="90"
          r="75"
          className="fill-primary/5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6 }}
        />

        {/* Base line */}
        <motion.rect 
          x="20" 
          y="145" 
          width="200" 
          height="4" 
          rx="2" 
          className="fill-border"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5 }}
          style={{ originX: 0.5 }}
        />
        
        {/* Pricing tier cards */}
        {plans.map((plan, i) => (
          <motion.g key={i}>
            {/* Card shadow */}
            <motion.rect
              x={plan.x + 3}
              y={145 - plan.height + 3}
              width="50"
              height={plan.height}
              rx="8"
              className="fill-foreground/5"
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: plan.delay }}
              style={{ originY: 1 }}
            />
            
            {/* Card */}
            <motion.rect
              x={plan.x}
              y={145 - plan.height}
              width="50"
              height={plan.height}
              rx="8"
              className={`${plan.color} ${plan.featured ? "stroke-primary" : "stroke-border"}`}
              strokeWidth={plan.featured ? 3 : 1}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: plan.delay }}
              style={{ originY: 1 }}
            />
            
            {/* Price circle */}
            <motion.circle
              cx={plan.x + 25}
              cy={145 - plan.height + 22}
              r="14"
              className={plan.featured ? "fill-primary-foreground/20" : "fill-background/50"}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: plan.delay + 0.3 }}
            />
            
            {/* Price indicator */}
            <motion.text
              x={plan.x + 25}
              y={145 - plan.height + 27}
              textAnchor="middle"
              className={`text-[9px] font-bold ${plan.featured ? "fill-primary-foreground" : "fill-foreground"}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: plan.delay + 0.4 }}
            >
              {plan.price}
            </motion.text>
            
            {/* Feature lines */}
            {[0, 1, 2].map((line) => (
              <motion.rect
                key={line}
                x={plan.x + 10}
                y={145 - plan.height + 45 + line * 12}
                width="30"
                height="4"
                rx="2"
                className={plan.featured ? "fill-primary-foreground/30" : "fill-foreground/20"}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3, delay: plan.delay + 0.5 + line * 0.1 }}
              />
            ))}
            
            {/* Featured badge */}
            {plan.featured && (
              <motion.g
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.8, type: "spring" }}
              >
                <rect
                  x={plan.x + 5}
                  y={145 - plan.height - 18}
                  width="40"
                  height="16"
                  rx="8"
                  className="fill-accent"
                />
                <text
                  x={plan.x + 25}
                  y={145 - plan.height - 7}
                  textAnchor="middle"
                  className="fill-accent-foreground text-[7px] font-bold"
                >
                  BEST
                </text>
              </motion.g>
            )}

            {/* Checkmarks */}
            {plan.featured && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <circle cx={plan.x + 43} cy={145 - plan.height + 50} r="5" className="fill-accent" />
                <path
                  d={`M ${plan.x + 40} ${145 - plan.height + 50} l 2 2 l 4 -4`}
                  className="stroke-accent-foreground"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </motion.g>
            )}
          </motion.g>
        ))}
        
        {/* Sparkles on featured plan */}
        {!prefersReducedMotion && (
          <>
            <motion.circle
              cx="85"
              cy="30"
              r="3"
              className="fill-accent"
              animate={{ 
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.circle
              cx="155"
              cy="40"
              r="2"
              className="fill-primary"
              animate={{ 
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
            <motion.circle
              cx="75"
              cy="50"
              r="2"
              className="fill-accent"
              animate={{ 
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
            />
            
            {/* Arrow pointing to featured */}
            <motion.path
              d="M 120 25 L 120 35"
              className="stroke-primary"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 1.2 }}
            />
            <motion.path
              d="M 116 32 L 120 38 L 124 32"
              className="stroke-primary"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            />
          </>
        )}
      </svg>
    </div>
  );
};

export default PricingIllustration;