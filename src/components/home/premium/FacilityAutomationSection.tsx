// src/components/home/premium/FacilityAutomationSection.tsx
import { motion } from "framer-motion";
import { ArrowRight, Bell, Calendar, ClipboardList, CreditCard, FileText, FlaskConical, ScanLine, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { trackMarketingEvent } from "@/lib/marketing";

const flowKeys = ["intake", "scheduling", "records", "labs", "imaging", "billing"] as const;
const flowIcons = [ClipboardList, Calendar, FileText, FlaskConical, ScanLine, CreditCard];

const highlightKeys = ["reminders", "privacy", "tasks"] as const;
const highlightIcons = [Bell, ShieldCheck, Workflow];

export default function FacilityAutomationSection() {
  const navigate = useNavigate();
  const { t } = useTranslation("premium");

  return (
    <section id="automation" className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            {t("automation.badge", "Facility automation")}
          </div>
          <h2 className="text-4xl md:text-5xl font-extralight tracking-tight text-foreground mb-4">{t("automation.title")}</h2>
          <p className="text-lg text-muted-foreground font-light max-w-3xl mx-auto">{t("automation.description")}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flowKeys.map((key, idx) => {
            const Icon = flowIcons[idx];
            return (
              <motion.div key={key} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.06 }} whileHover={{ y: -6, scale: 1.01 }} className="group">
                <div className="h-full p-7 rounded-3xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/10 transition-colors duration-300">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">{t(`automation.flow.${key}.title`)}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{t(`automation.flow.${key}.description`)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }} className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(["reminders", "privacy", "tasks"] as const).map((key, i) => {
            const Icon = highlightIcons[i];
            const tKey = key === "reminders" ? `automation.flow.${key}` : `automation.highlights.${key}`;
            return (
              <div key={key} className="p-7 rounded-3xl bg-background/50 backdrop-blur-xl border border-border/50 hover:border-primary/30 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Icon className="w-6 h-6 text-primary" /></div>
                  <div>
                    <div className="font-semibold text-foreground mb-1">{t(`${tKey}.title`)}</div>
                    <div className="text-sm text-muted-foreground leading-relaxed">{t(`${tKey}.description`)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.25 }} className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" className="rounded-full h-12 px-7 gap-2" onClick={() => { void trackMarketingEvent("home_automation_primary_click", { cta: "start_trial", section: "automation" }); navigate("/auth?mode=signup"); }}>
            {t("automation.cta.primary", "Start free 14-day trial")}
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button size="lg" variant="outline" className="rounded-full h-12 px-7 gap-2 border-2" onClick={() => { void trackMarketingEvent("home_automation_secondary_click", { cta: "explore_features", section: "automation" }); navigate("/features#features"); }}>
            {t("automation.cta.secondary", "See workflows")}
            <Workflow className="w-4 h-4" />
          </Button>
        </motion.div>

        <div className="mt-6 text-center text-sm text-muted-foreground">{t("automation.note")}</div>
      </div>
    </section>
  );
}
