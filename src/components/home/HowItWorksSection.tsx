import { motion } from "framer-motion";
import { Search, Star, Calendar, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const HowItWorksSection = () => {
  const { t } = useTranslation('home');
  const steps = [
    {
      number: 1,
      icon: Search,
      title: t('howItWorks.steps.search.title'),
      description: t('howItWorks.steps.search.description'),
    },
    {
      number: 2,
      icon: Star,
      title: t('howItWorks.steps.review.title'),
      description: t('howItWorks.steps.review.description'),
    },
    {
      number: 3,
      icon: Calendar,
      title: t('howItWorks.steps.book.title'),
      description: t('howItWorks.steps.book.description'),
    },
    {
      number: 4,
      icon: Check,
      title: t('howItWorks.steps.care.title'),
      description: t('howItWorks.steps.care.description'),
    },
  ];

  return (
    <section className="py-24 bg-muted dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            {t('howItWorks.title')}
          </h2>
          <p className="text-xl text-muted-foreground">{t('howItWorks.subtitle')}</p>
        </motion.div>

        <div className="relative max-w-6xl mx-auto">
          {/* Desktop Timeline */}
          <div className="hidden md:flex justify-between items-start mb-12">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2, duration: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center relative"
                >
                  <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-primary/20 border-2 border-primary flex items-center justify-center shadow-lg dark:shadow-[0_0_20px_rgba(59,130,246,0.3)] mb-4 group cursor-pointer">
                    <step.icon className="w-10 h-10 text-primary" />
                  </div>
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <span className="text-primary-foreground font-bold text-sm">{step.number}</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-[200px]">{step.description}</p>
                </motion.div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 bg-border dark:bg-slate-700 mx-4 mt-10"></div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile Timeline */}
          <div className="md:hidden space-y-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="flex items-start space-x-4"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 border-2 border-primary flex items-center justify-center shadow-lg dark:shadow-[0_0_20px_rgba(59,130,246,0.3)] flex-shrink-0 relative">
                  <step.icon className="w-8 h-8 text-primary" />
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-xs">{step.number}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
