// File: src/components/howItWorks/HowItWorksHero.tsx
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import VectorNetworkIllustration from "./VectorNetworkIllustration";

export default function HowItWorksHero() {
  const { t } = useTranslation(["howItWorks"]);

  return (
    <section className="relative overflow-hidden pt-14">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -start-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -end-24 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left copy */}
          <div className="space-y-7 text-start">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-medium text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Docito
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight"
            >
              <span className="block text-foreground">
                {t("howItWorks.hero.title", "How Docito works")}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground font-light"
            >
              {t(
                "howItWorks.hero.subtitle",
                "One connected workflow for patients, doctors, and every team that makes care happen \u2014 automated, permissioned, and fast."
              )}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button asChild className="h-11 rounded-full px-6">
                <Link
                  to="/#search"
                  aria-label={t("howItWorks.hero.ctaPrimary", "Start search")}
                >
                  <span className="flex items-center gap-2">
                    {t("howItWorks.hero.ctaPrimary", "Start search")}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-11 rounded-full px-6 bg-background/60 backdrop-blur"
              >
                <a
                  href="#roles"
                  aria-label={t("howItWorks.hero.ctaSecondary", "Explore by role")}
                >
                  <span className="flex items-center gap-2">
                    {t("howItWorks.hero.ctaSecondary", "Explore by role")}
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </a>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.34 }}
              className="flex items-center gap-3 text-xs text-muted-foreground"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                RBAC
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                Work queues
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                Audit trails
              </span>
            </motion.div>
          </div>

          {/* Right illustration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="relative rounded-3xl border border-border/50 bg-background/40 backdrop-blur-2xl shadow-2xl shadow-black/5 p-6 sm:p-8">
              <VectorNetworkIllustration className="text-foreground" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Anchor for role section */}
      <div id="roles" className="scroll-mt-24" />
    </section>
  );
}
