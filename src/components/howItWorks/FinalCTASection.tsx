// File: src/components/howItWorks/FinalCTASection.tsx
import { useTranslation } from "react-i18next";
import Reveal from "./Reveal";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function FinalCTASection() {
  const { t } = useTranslation(["howItWorks"]);

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="rounded-3xl border border-border/50 bg-muted/20 p-8 sm:p-10 overflow-hidden relative">
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 -start-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
              <div className="absolute -bottom-24 -end-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
            </div>

            <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <h2 className="text-2xl sm:text-3xl font-light tracking-tight">
                  {t("howItWorks.cta.title", "Ready to experience a connected care workflow?")}
                </h2>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
                  {t(
                    "howItWorks.cta.subtitle",
                    "Start with search — or join Docito as a provider and streamline your operations."
                  )}
                </p>
              </div>

              <div className="lg:col-span-5 flex flex-col sm:flex-row gap-3 justify-start lg:justify-end">
                <Button asChild className="h-11 rounded-full px-6">
                  <Link to="/#search" aria-label={t("howItWorks.cta.findCare", "Find care")}>
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

                <Button
                  asChild
                  variant="secondary"
                  className="h-11 rounded-full px-6"
                >
                  <Link to="/practice" aria-label={t("howItWorks.cta.registerPractice", "Register practice")}>
                    {t("howItWorks.cta.registerPractice", "Register practice")}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
