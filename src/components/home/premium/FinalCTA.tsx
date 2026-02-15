// src/components/home/premium/FinalCTA.tsx
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Rocket, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { trackMarketingEvent } from "@/lib/marketing";

export default function FinalCTA() {
  const navigate = useNavigate();
  const { t } = useTranslation("premium");

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 20%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, type: "spring" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            {t("finalCta.badge", "Launching now")}
          </motion.div>

          <h2 className="text-4xl md:text-6xl font-extralight tracking-tight text-foreground mb-6">
            {t("finalCta.title.line1", "Start in minutes.")}
            <br />
            <span className="font-normal text-primary">{t("finalCta.title.highlight", "Connect your care.")}</span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground font-light max-w-2xl mx-auto mb-12">
            {t("finalCta.description", "Create an account and run appointments, records, prescriptions, and payments in one connected system—built for both patients and providers.")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className="h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg gap-2"
                onClick={() => {
                  void trackMarketingEvent("home_final_cta_primary_click", {
                    cta: "start_trial",
                    section: "final_cta",
                  });
                  navigate("/auth?mode=signup");
                }}
              >
                <Rocket className="w-5 h-5" />
                {t("finalCta.cta.primary", "Start free 14-day trial")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 rounded-full text-lg gap-2 border-2"
                onClick={() => {
                  void trackMarketingEvent("home_final_cta_secondary_click", {
                    cta: "explore_features",
                    section: "final_cta",
                  });
                  navigate("/features#features");
                }}
              >
                <Layers className="w-5 h-5" />
                {t("finalCta.cta.secondary", "Explore features")}
              </Button>
            </motion.div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 text-sm text-muted-foreground"
          >
            {t("finalCta.note", "Free 14-day trial • No credit card required • Cancel anytime")}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
