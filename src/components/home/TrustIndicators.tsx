import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const TrustIndicators = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const trustItems = [
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-primary">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "HIPAA & GDPR Compliant",
      description: "Enterprise-grade data protection standards",
      color: "from-primary/10 to-primary/5",
      borderColor: "border-primary/20",
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-chart-2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Verified Providers Only",
      description: "Every doctor and clinic is credential-verified",
      color: "from-chart-2/10 to-chart-2/5",
      borderColor: "border-chart-2/20",
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-chart-3">
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
      ),
      title: "Encrypted Medical Records",
      description: "256-bit encryption for all health data",
      color: "from-chart-3/10 to-chart-3/5",
      borderColor: "border-chart-3/20",
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-chart-4">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Real Patient Reviews",
      description: "Transparent ratings from verified visits",
      color: "from-chart-4/10 to-chart-4/5",
      borderColor: "border-chart-4/20",
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-chart-5">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Instant Booking",
      description: "Real-time availability, no phone calls needed",
      color: "from-chart-5/10 to-chart-5/5",
      borderColor: "border-chart-5/20",
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-primary">
          <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
          <path d="M6 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      title: "Superbill-Ready Billing",
      description: "Itemized superbills generated for every visit, ready to submit to any insurer",
      color: "from-primary/10 to-primary/5",
      borderColor: "border-primary/20",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <section ref={ref} className="py-24 bg-muted/30 dark:bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-4">
            Why Patients Choose Docito
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built on trust, transparency, and security
          </p>
        </motion.div>

        {/* Trust Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {trustItems.map((item, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group"
            >
              <div className={`relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br ${item.color} border ${item.borderColor} backdrop-blur-sm transition-all duration-300 hover:shadow-xl`}>
                {/* Animated Icon Container */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="mb-5"
                >
                  <div className="w-16 h-16 rounded-2xl bg-background/80 dark:bg-background/50 flex items-center justify-center shadow-lg border border-border/50">
                    {item.icon}
                  </div>
                </motion.div>

                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>

                {/* Subtle Glow Effect */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default TrustIndicators;
