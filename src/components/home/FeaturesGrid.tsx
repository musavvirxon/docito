import { motion } from "framer-motion";
import { CheckCircle2, Clock, Star, Zap, Globe, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const FeaturesGrid = () => {
  const { t } = useTranslation('home');
  const features = [
    {
      icon: CheckCircle2,
      title: t('features.verifiedProviders.title'),
      description: t('features.verifiedProviders.description'),
    },
    {
      icon: Clock,
      title: t('features.availability.title'),
      description: t('features.availability.description'),
    },
    {
      icon: Star,
      title: t('features.verifiedReviews.title'),
      description: t('features.verifiedReviews.description'),
    },
    {
      icon: Zap,
      title: t('features.instantBooking.title'),
      description: t('features.instantBooking.description'),
    },
    {
      icon: Globe,
      title: t('features.globalNetwork.title'),
      description: t('features.globalNetwork.description'),
    },
    {
      icon: Shield,
      title: t('features.hipaaCompliant.title'),
      description: t('features.hipaaCompliant.description'),
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 dark:from-slate-900 dark:via-blue-950 dark:to-gray-900 relative overflow-hidden">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0 overflow-hidden opacity-30 dark:opacity-20">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            {t('features.title')}
          </h2>
          <p className="text-xl text-muted-foreground">
            {t('features.subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -5 }}
            >
              <Card className="relative overflow-hidden p-8 h-full bg-card/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-border dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-300 dark:hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                <div className="relative z-10">
                  <div className="inline-flex p-3 rounded-xl bg-primary/10 dark:bg-primary/20 mb-4 shadow-lg dark:shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
