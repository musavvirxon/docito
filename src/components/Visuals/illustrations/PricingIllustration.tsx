import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface PricingIllustrationProps {
  className?: string;
}

export const PricingIllustration = ({ className = "" }: PricingIllustrationProps) => {
  const prefersReducedMotion = useReducedMotion();

  const plans = [
    { x: 40, height: 80, color: "fill-muted", delay: 0 },
    { x: 100, height: 110, color: "fill-primary", delay: 0.2, featured: true },
    { x: 160, height: 90, color: "fill-muted", delay: 0.4 },
  ];

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 240 180" className="w-full h-full">
        {/* Background */}
        <rect x="20" y="140" width="200" height="4" rx="2" className="fill-border" />
        
        {/* Pricing tier cards */}
        {plans.map((plan, i) => (
          <motion.g key={i}>
            {/* Card */}
            <motion.rect
              x={plan.x}
              y={140 - plan.height}
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
              cy={140 - plan.height + 25}
              r="15"
              className={plan.featured ? "fill-primary-foreground/20" : "fill-background/50"}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: plan.delay + 0.3 }}
            />
            
            {/* Price indicator */}
            <motion.text
              x={plan.x + 25}
              y={140 - plan.height + 30}
              textAnchor="middle"
              className={`text-[10px] font-bold ${plan.featured ? "fill-primary-foreground" : "fill-foreground"}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: plan.delay + 0.4 }}
            >
              $
            </motion.text>
            
            {/* Feature lines */}
            {[0, 1, 2].map((line) => (
              <motion.rect
                key={line}
                x={plan.x + 10}
                y={140 - plan.height + 50 + line * 12}
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
                  y={140 - plan.height - 15}
                  width="40"
                  height="18"
                  rx="9"
                  className="fill-accent"
                />
                <text
                  x={plan.x + 25}
                  y={140 - plan.height - 3}
                  textAnchor="middle"
                  className="fill-accent-foreground text-[8px] font-bold"
                >
                  BEST
                </text>
              </motion.g>
            )}
          </motion.g>
        ))}
        
        {/* Sparkles on featured plan */}
        {!prefersReducedMotion && (
          <>
            <motion.circle
              cx="90"
              cy="25"
              r="3"
              className="fill-accent"
              animate={{ 
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.circle
              cx="160"
              cy="35"
              r="2"
              className="fill-primary"
              animate={{ 
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
            <motion.circle
              cx="80"
              cy="45"
              r="2"
              className="fill-accent"
              animate={{ 
                scale: [0, 1, 0],
                opacity: [0, 1, 0]
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
            />
          </>
        )}
      </svg>
    </div>
  );
};

export default PricingIllustration;