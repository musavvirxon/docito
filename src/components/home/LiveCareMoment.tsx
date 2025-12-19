import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const LiveCareMoment = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { id: 0, label: "Diagnosis", color: "hsl(var(--primary))" },
    { id: 1, label: "Lab Results", color: "hsl(var(--chart-2))" },
    { id: 2, label: "Prescription", color: "hsl(var(--chart-3))" },
    { id: 3, label: "Follow-up", color: "hsl(var(--chart-4))" },
  ];

  useEffect(() => {
    if (!isInView) return;
    
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 3000);

    return () => clearInterval(interval);
  }, [isInView]);

  const containerVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1] as const,
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <section ref={ref} className="py-24 bg-gradient-to-b from-background to-muted/20 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-4">
            Care, in Motion
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            From diagnosis to follow-up — everything connected in one flow.
          </p>
        </motion.div>

        {/* Animated Illustration */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="relative max-w-5xl mx-auto"
        >
          {/* Main Canvas */}
          <div className="relative bg-card/50 dark:bg-card/30 backdrop-blur-xl rounded-3xl border border-border/50 p-8 md:p-12 shadow-2xl">
            
            {/* Top Row - Doctor and Patient Cards */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Patient Card */}
              <motion.div
                variants={cardVariants}
                className="relative"
              >
                <div className="bg-background/80 dark:bg-background/50 rounded-2xl p-6 border border-border/50 shadow-lg">
                  <div className="flex items-center gap-4 mb-4">
                    {/* Avatar Circle */}
                    <motion.div
                      animate={{ 
                        boxShadow: activeStep >= 0 ? "0 0 20px hsl(var(--primary) / 0.3)" : "none"
                      }}
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center"
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-primary">
                        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </motion.div>
                    <div>
                      <div className="h-3 w-24 bg-foreground/20 rounded-full mb-2" />
                      <div className="h-2 w-16 bg-muted-foreground/20 rounded-full" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-chart-2" />
                      <div className="h-2 w-20 bg-muted-foreground/15 rounded-full" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-chart-3" />
                      <div className="h-2 w-28 bg-muted-foreground/15 rounded-full" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Doctor Panel */}
              <motion.div
                variants={cardVariants}
                className="relative"
              >
                <div className="bg-background/80 dark:bg-background/50 rounded-2xl p-6 border border-border/50 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
                        <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="h-3 w-20 bg-foreground/20 rounded-full" />
                  </div>
                  
                  {/* Diagnosis Entry */}
                  <motion.div
                    animate={{
                      opacity: activeStep >= 0 ? 1 : 0.4,
                      scale: activeStep === 0 ? 1.02 : 1,
                    }}
                    transition={{ duration: 0.5 }}
                    className="bg-primary/5 dark:bg-primary/10 rounded-xl p-4 mb-3 border border-primary/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <motion.div
                        animate={{ scale: activeStep === 0 ? [1, 1.2, 1] : 1 }}
                        transition={{ duration: 0.6, repeat: activeStep === 0 ? Infinity : 0, repeatDelay: 2 }}
                        className="w-2 h-2 rounded-full bg-primary"
                      />
                      <span className="text-xs font-medium text-primary">Diagnosis</span>
                    </div>
                    <div className="h-2 w-3/4 bg-foreground/10 rounded-full" />
                  </motion.div>

                  {/* Treatment */}
                  <motion.div
                    animate={{
                      opacity: activeStep >= 2 ? 1 : 0.3,
                      scale: activeStep === 2 ? 1.02 : 1,
                    }}
                    transition={{ duration: 0.5 }}
                    className="bg-chart-3/5 dark:bg-chart-3/10 rounded-xl p-4 border border-chart-3/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <motion.div
                        animate={{ scale: activeStep === 2 ? [1, 1.2, 1] : 1 }}
                        transition={{ duration: 0.6, repeat: activeStep === 2 ? Infinity : 0, repeatDelay: 2 }}
                        className="w-2 h-2 rounded-full bg-chart-3"
                      />
                      <span className="text-xs font-medium text-chart-3">Prescription</span>
                    </div>
                    <div className="h-2 w-1/2 bg-foreground/10 rounded-full" />
                  </motion.div>
                </div>
              </motion.div>
            </div>

            {/* Timeline Flow */}
            <motion.div
              variants={cardVariants}
              className="relative"
            >
              <div className="bg-background/60 dark:bg-background/40 rounded-2xl p-6 border border-border/50">
                <div className="flex items-center justify-between relative">
                  {/* Connection Line */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border/50 -translate-y-1/2" />
                  <motion.div
                    className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-primary via-chart-2 to-chart-3 -translate-y-1/2"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(activeStep + 1) * 25}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />

                  {steps.map((step, index) => (
                    <motion.div
                      key={step.id}
                      className="relative z-10 flex flex-col items-center"
                      animate={{
                        scale: activeStep === index ? 1.1 : 1,
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.div
                        animate={{
                          backgroundColor: activeStep >= index ? step.color : "hsl(var(--muted))",
                          boxShadow: activeStep === index ? `0 0 20px ${step.color}40` : "none",
                        }}
                        transition={{ duration: 0.5 }}
                        className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-4 border-background"
                      >
                        {index === 0 && (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary-foreground">
                            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        )}
                        {index === 1 && (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary-foreground">
                            <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="2"/>
                            <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        )}
                        {index === 2 && (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary-foreground">
                            <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v6m0 0H3m6 0h12M3 9v10a2 2 0 002 2h14a2 2 0 002-2V9" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        )}
                        {index === 3 && (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary-foreground">
                            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        )}
                      </motion.div>
                      <motion.span
                        animate={{
                          opacity: activeStep >= index ? 1 : 0.5,
                          color: activeStep === index ? step.color : undefined,
                        }}
                        className="mt-3 text-xs md:text-sm font-medium text-muted-foreground"
                      >
                        {step.label}
                      </motion.span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Floating Elements */}
            <motion.div
              animate={{
                y: [0, -8, 0],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-primary/20 to-chart-2/20 rounded-full blur-xl"
            />
            <motion.div
              animate={{
                y: [0, 8, 0],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute -bottom-6 -left-6 w-24 h-24 bg-gradient-to-br from-chart-3/20 to-chart-4/20 rounded-full blur-xl"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LiveCareMoment;
