import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const CTASection = () => {
  const { t } = useTranslation('home');
  const navigate = useNavigate();

  return (
    <section className="py-32 relative overflow-hidden bg-gradient-to-br from-primary via-secondary to-accent dark:from-[#030712] dark:via-[#0A0F1E] dark:to-[#030712]">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0 overflow-hidden opacity-20 dark:opacity-5">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/20 dark:bg-primary/10 rounded-none dark:rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/20 dark:bg-primary/10 rounded-none dark:rounded-full" />
      </div>

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
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="text-lg px-8 py-6 h-auto"
              >
                {t('cta.scheduleDemoButton')}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("/doctors")}
                className="text-lg px-8 py-6 h-auto"
              >
                {t('cta.learnMoreButton')}
              </Button>
            </motion.div>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-8 text-primary-foreground/80">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-primary-foreground"></div>
              <span className="text-sm">{t('cta.features.hipaa')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-primary-foreground"></div>
              <span className="text-sm">{t('cta.features.security')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-primary-foreground"></div>
              <span className="text-sm">{t('cta.features.support')}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
