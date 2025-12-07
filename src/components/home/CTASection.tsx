import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";

const CTASection = () => {
  const { t } = useTranslation('home');
  const navigate = useNavigate();
  const [clicked, setClicked] = useState(false);

  const handleGetStarted = () => {
    setClicked(true);
    setTimeout(() => {
      navigate("/auth");
    }, 500);
  };

  return (
    <section className="py-32 relative overflow-hidden bg-gradient-to-br from-primary via-secondary to-accent dark:from-[#030712] dark:via-[#0A0F1E] dark:to-[#030712]">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/10 dark:bg-primary/10 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 7 }}
          className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white/10 dark:bg-primary/10 rounded-full blur-3xl" 
        />
      </div>

      {/* Sparkle particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/40 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 4,
          }}
        />
      ))}

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 tracking-tight">
            {t('cta.title')}
          </h2>

          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-12 max-w-2xl mx-auto">
            {t('cta.description')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              {/* Animated glow behind button */}
              <motion.div
                animate={{ 
                  boxShadow: [
                    "0 0 20px 0px rgba(255,255,255,0.3)",
                    "0 0 40px 10px rgba(255,255,255,0.4)",
                    "0 0 20px 0px rgba(255,255,255,0.3)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-lg"
              />
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="text-lg px-8 py-6 h-auto relative bg-white text-primary hover:bg-white/90 dark:bg-primary-foreground dark:text-primary dark:hover:bg-primary-foreground/90"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                {t('cta.scheduleDemoButton')}
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <ArrowRight className="ml-2 w-5 h-5" />
                </motion.div>
              </Button>
              
              {/* Confetti on click */}
              {clicked && (
                <>
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96E6A1'][i % 5],
                        left: '50%',
                        top: '50%',
                      }}
                      initial={{ x: 0, y: 0, opacity: 1 }}
                      animate={{
                        x: (Math.random() - 0.5) * 200,
                        y: (Math.random() - 0.5) * 200,
                        opacity: 0,
                        scale: [1, 1.5, 0],
                      }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  ))}
                </>
              )}
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/doctors")}
                className="text-lg px-8 py-6 h-auto bg-transparent border-2 border-white/30 text-primary-foreground hover:bg-white/10 hover:border-white/50"
              >
                {t('cta.learnMoreButton')}
              </Button>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-12 flex flex-wrap justify-center gap-8 text-primary-foreground/80"
          >
            {[
              t('cta.features.hipaa'),
              t('cta.features.security'),
              t('cta.features.support'),
            ].map((feature, index) => (
              <motion.div 
                key={feature}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center space-x-2"
              >
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                  className="w-2 h-2 rounded-full bg-primary-foreground"
                />
                <span className="text-sm">{feature}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
