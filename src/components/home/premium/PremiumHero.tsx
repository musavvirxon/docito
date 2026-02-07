// src/components/home/premium/PremiumHero.tsx
import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { trackMarketingEvent } from "@/lib/marketing";

import LazyHeroOrb3D from "./HeroOrb3D";

export default function PremiumHero() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const heroTitle = useMemo(
    () =>
      t("home:premium.hero.title", "Less admin. More care") as unknown as string,
    [t]
  );

  const titleParts = useMemo(() => heroTitle.split(" "), [heroTitle]);
  const titleMain = useMemo(
    () => titleParts.slice(0, -1).join(" "),
    [titleParts]
  );
  const titleAccent = useMemo(
    () => titleParts.slice(-1).join(" "),
    [titleParts]
  );

  const scrollToSearch = useCallback(() => {
    const el = document.getElementById("smart-search");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // Fallback: keep users moving
    navigate("/doctors");
  }, [navigate]);

  const onStartTrial = useCallback(() => {
    void trackMarketingEvent("home_cta_start_trial", { placement: "hero" });
    navigate("/auth?mode=signup");
  }, [navigate]);

  const onFindCare = useCallback(() => {
    void trackMarketingEvent("home_cta_find_care", { placement: "hero" });
    scrollToSearch();
  }, [scrollToSearch]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background pt-28 pb-24">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              <span>
                {t(
                  "home:premium.hero.badge",
                  "All your care, in sync — patients and providers"
                )}
              </span>
            </div>

            <div className="space-y-4">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-lg font-medium text-primary"
              >
                {t("home:premium.hero.subtitle", "Healthcare, without the chaos")}
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight"
              >
                {titleMain}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
                  {titleAccent}
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-xl text-muted-foreground max-w-xl"
              >
                {t(
                  "home:premium.hero.description",
                  "Docito brings scheduling, records, prescriptions, payments, and analytics into one connected workflow — so teams spend less time on admin and patients get faster, smoother care."
                )}
              </motion.p>
            </div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                size="lg"
                className="group text-base px-8"
                onClick={onStartTrial}
              >
                {t("home:premium.hero.primaryCta", "Start free 14-day trial")}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="text-base px-8"
                onClick={onFindCare}
              >
                {t("home:premium.hero.secondaryCta", "Find care now")}
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.6 }}
              className="text-sm text-muted-foreground"
            >
              {t(
                "home:premium.hero.microcopy",
                "No demo calls. Start in minutes. Cancel anytime."
              )}
            </motion.div>

            {/* Feature highlights */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-wrap gap-4"
            >
              {[
                t("home:premium.hero.features.integrated", "Integrated workflow"),
                t("home:premium.hero.features.secure", "Privacy-first"),
                t("home:premium.hero.features.fast", "Built for speed"),
                t("home:premium.hero.features.support", "Patient + practice ready"),
              ].map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/50 border border-primary/10 backdrop-blur-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right 3D orb */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="relative h-[500px] lg:h-[600px]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-3xl blur-3xl opacity-50" />
            <div className="relative h-full rounded-3xl overflow-hidden border border-primary/10 bg-white/5 backdrop-blur-sm">
              <LazyHeroOrb3D />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
