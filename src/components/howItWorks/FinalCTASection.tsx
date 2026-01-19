// File: src/components/howItWorks/FinalCTASection.tsx
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import FadeIn from "./FadeIn";
import { ArrowRight } from "lucide-react";

export default function FinalCTASection() {
  const { t } = useTranslation(["howItWorks"]);

  return (
    <FadeIn rootMargin="160px">
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-muted/15 p-10 sm:p-12">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -start-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-16 -end-16 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight">
              {t("howItWorks.cta.title", "Ready to use Docito?")}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
              {t(
                "howItWorks.cta.subtitle",
                "Find care faster — or join the network as a verified provider or practice."
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 lg:justify-end">
            <Button asChild className="h-11 rounded-full px-6">
              <Link to="/" aria-label={t("howItWorks.cta.findCare", "Find care")}>
                <span className="flex items-center gap-2">
                  {t("howItWorks.cta.findCare", "Find care")}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-11 rounded-full px-6 bg-background/60 backdrop-blur">
              <Link to="/doctor" aria-label={t("howItWorks.cta.joinProvider", "Join as provider")}>
                {t("howItWorks.cta.joinProvider", "Join as provider")}
              </Link>
            </Button>

            <Button asChild variant="ghost" className="h-11 rounded-full px-6">
              <Link to="/practice" aria-label={t("howItWorks.cta.registerPractice", "Register practice")}>
                {t("howItWorks.cta.registerPractice", "Register practice")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
