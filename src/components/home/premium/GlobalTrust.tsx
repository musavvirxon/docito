// src/components/home/premium/GlobalTrust.tsx
import { motion } from "framer-motion";
import { Globe, Shield, Lock, CheckCircle2, Languages, Banknote, Clock, Scale } from "lucide-react";
import { useTranslation } from "react-i18next";

const featureKeys = [
  { key: "multiLanguage", icon: Languages },
  { key: "multiCurrency", icon: Banknote },
  { key: "anyTimezone", icon: Clock },
  { key: "regionalCompliance", icon: Scale },
];

const principleKeys = [
  { key: "privacyFirst", icon: Shield },
  { key: "securityProgram", icon: Lock },
  { key: "complianceReady", icon: CheckCircle2 },
];

export default function GlobalTrust() {
  const { t } = useTranslation("premium");

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Globe className="w-4 h-4" />
            {t("global.badge", "Global platform")}
          </div>
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">
            {t("global.title", "One platform. Every country. Any language.")}
          </h2>
          <p className="text-lg text-muted-foreground font-light max-w-2xl mx-auto">
            {t("global.description", "Docito is built to work anywhere — no matter where your team or patients are located.")}
          </p>
        </motion.div>

        {/* Global features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {featureKeys.map((f, index) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="p-6 rounded-3xl bg-card border border-border/50 text-center hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{t(`global.features.${f.key}.title`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`global.features.${f.key}.description`)}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Trust principles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {principleKeys.map((p, index) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 rounded-3xl bg-gradient-to-br from-card to-muted/30 border border-border/50 text-center"
              >
                <motion.div
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4"
                >
                  <Icon className="w-8 h-8 text-primary" />
                </motion.div>
                <h3 className="font-semibold text-foreground mb-2">{t(`global.principles.${p.key}.title`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`global.principles.${p.key}.description`)}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
