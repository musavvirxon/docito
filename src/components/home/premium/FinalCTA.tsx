// src/components/home/premium/FinalCTA.tsx
import { motion } from "framer-motion";
import { ArrowRight, HeartPulse, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { trackMarketingEvent } from "@/lib/marketing";

export default function FinalCTA() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const onStartTrial = () => {
    void trackMarketingEvent("home_cta_start_trial", { placement: "final_cta" });
    navigate("/auth?mode=signup");
  };

  const onFindCare = () => {
    void trackMarketingEvent("home_cta_find_care", { placement: "final_cta" });
    const el = document.getElementById("smart-search");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    navigate("/doctors");
  };

  return (
    <section className="relative py-24 bg-gradient-to-br from-primary/10 via-background to-purple-500/5 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <HeartPulse className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {t("home:premium.finalCta.badge", "Less admin. More care.")}
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t("home:premium.finalCta.title", "Bring your care into sync")}
          </h2>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            {t(
              "home:premium.finalCta.description",
              "Start today with scheduling and patient communication. Add records, prescriptions, billing, and analytics when you’re ready — all in one connected workspace."
            )}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button
              size="lg"
              className="group text-lg px-8 py-6"
              onClick={onStartTrial}
            >
              {t("home:premium.finalCta.primaryButton", "Start free 14-day trial")}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={onFindCare}
            >
              {t("home:premium.finalCta.secondaryButton", "Find and book care")}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>{t("home:premium.finalCta.noCreditCard", "No credit card required")}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>{t("home:premium.finalCta.cancelAnytime", "Cancel anytime")}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>{t("home:premium.finalCta.support", "Human support included")}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
