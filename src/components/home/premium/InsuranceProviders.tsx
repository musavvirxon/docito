import { motion } from 'framer-motion';
import { Shield, Check, ArrowRight, FileCheck, CreditCard, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const stepKeys = ["selectProvider", "verification", "directBilling"] as const;
const stepIcons = [Search, FileCheck, CreditCard];

export default function InsuranceProviders() {
  const { t } = useTranslation("premium");

  const benefits = t("insurance.benefits", { returnObjects: true }) as string[];
  const benefitsList = Array.isArray(benefits) ? benefits : [];

  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            {t("insurance.badge", "Insurance Integration")}
          </div>
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">{t("insurance.title")}</h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">{t("insurance.description")}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {stepKeys.map((key, index) => {
            const Icon = stepIcons[index];
            return (
              <motion.div key={key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1, duration: 0.5 }} className="relative">
                <div className="h-full p-8 rounded-3xl bg-card border border-border/50 text-center flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5"><Icon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" /></div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">{t("insurance.stepLabel", { step: index + 1 })}</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{t(`insurance.steps.${key}.title`)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`insurance.steps.${key}.description`)}</p>
                </div>
                {index < stepKeys.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-5 -translate-y-1/2 z-10"><ArrowRight className="w-5 h-5 text-muted-foreground/40" /></div>
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }} className="flex flex-wrap justify-center gap-4">
          {benefitsList.map((benefit) => (
            <div key={benefit} className="flex items-center gap-2 px-5 py-3 rounded-full bg-card border border-border/50">
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">{benefit}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
