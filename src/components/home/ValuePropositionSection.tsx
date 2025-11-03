import { motion } from "framer-motion";
import { CreditCard, Calendar, FileText, Activity, Users, Shield, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const ValuePropositionSection = () => {
  const { t } = useTranslation('home');
  const coreFeatures = [
    {
      icon: CreditCard,
      title: t('valueProposition.paymentProcessing.title'),
      description: t('valueProposition.paymentProcessing.description'),
    },
    {
      icon: Calendar,
      title: t('valueProposition.schedulingManagement.title'),
      description: t('valueProposition.schedulingManagement.description'),
    },
    {
      icon: FileText,
      title: t('valueProposition.recordsManagement.title'),
      description: t('valueProposition.recordsManagement.description'),
    },
  ];

  const additionalFeatures = [
    {
      icon: Activity,
      title: t('valueProposition.procedureLibrary.title'),
      description: t('valueProposition.procedureLibrary.description'),
    },
    {
      icon: Users,
      title: t('valueProposition.referralNetwork.title'),
      description: t('valueProposition.referralNetwork.description'),
    },
    {
      icon: Shield,
      title: t('valueProposition.legalCompliance.title'),
      description: t('valueProposition.legalCompliance.description'),
    },
  ];

  return (
    <section id="features" className="py-24 bg-muted/30 dark:bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 bg-primary/10 dark:bg-primary/5 border-2 border-primary/30 dark:border-primary/30 rounded-full px-6 py-2 mb-6">
            <span className="text-primary dark:text-primary font-semibold">{t('valueProposition.badge')}</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
            {t('valueProposition.title')}
            <br />
            {t('valueProposition.subtitle')}
          </h2>
        </motion.div>

        {/* Core Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {coreFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="group"
            >
              <Card className="relative overflow-hidden p-8 h-full border-2 border-border dark:border-border hover:border-primary/50 dark:hover:border-primary transition-all duration-300 bg-card dark:bg-card dark:hover:shadow-glow-blue">
                <div className="relative z-10">
                  <div className="inline-flex p-4 rounded-2xl bg-primary/10 dark:bg-primary/20 mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300 dark:shadow-glow-blue">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Additional Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {additionalFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.6 }}
              whileHover={{ y: -5 }}
            >
              <Card className="relative overflow-hidden p-6 h-full bg-card/80 dark:bg-card/80 backdrop-blur-sm border-2 border-border dark:border-border hover:border-primary/50 dark:hover:border-primary transition-all duration-300 dark:hover:shadow-glow-blue">
                <feature.icon className="w-6 h-6 text-primary mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Analytics Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <Card className="relative overflow-hidden p-8 md:p-12 border-2 border-primary/30 dark:border-primary/30 bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10 dark:to-card/50 dark:shadow-glow-blue-lg">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="inline-flex items-center space-x-2 bg-primary/10 dark:bg-primary/20 rounded-full px-4 py-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <span className="text-primary font-semibold">{t('valueProposition.analytics.badge')}</span>
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-4">
                  {t('valueProposition.analytics.title')}
                </h3>
                <p className="text-lg text-muted-foreground mb-6">
                  {t('valueProposition.analytics.description')}
                </p>
                <ul className="space-y-3">
                  {[
                    t('valueProposition.analytics.features.dashboard'),
                    t('valueProposition.analytics.features.revenue'),
                    t('valueProposition.analytics.features.insights'),
                    t('valueProposition.analytics.features.trends'),
                    t('valueProposition.analytics.features.performance'),
                    t('valueProposition.analytics.features.reports'),
                  ].map((item, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span className="text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1">
                <div className="bg-card dark:bg-card rounded-xl shadow-2xl dark:shadow-glow-blue p-6 border-2 border-border dark:border-border">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-primary/5 dark:bg-primary/10 rounded-lg">
                      <span className="text-sm font-medium text-foreground">{t('valueProposition.analytics.stats.revenueToday')}</span>
                      <span className="text-xl font-bold text-primary">$12,450</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-primary/5 dark:bg-primary/10 rounded-lg">
                      <span className="text-sm font-medium text-foreground">{t('valueProposition.analytics.stats.appointments')}</span>
                      <span className="text-xl font-bold text-primary">28</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-primary/5 dark:bg-primary/10 rounded-lg">
                      <span className="text-sm font-medium text-foreground">{t('valueProposition.analytics.stats.activePatients')}</span>
                      <span className="text-xl font-bold text-primary">1,247</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default ValuePropositionSection;
