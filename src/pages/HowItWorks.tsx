// File: src/pages/HowItWorks.tsx
import { useEffect } from "react";
import { SEOHead } from "@/components/SEOHead";
import { useTranslation } from "react-i18next";
import HowItWorksHero from "@/components/howItWorks/HowItWorksHero";

export default function HowItWorks() {
  const { t } = useTranslation(["howItWorks", "common"]);

  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = prev || "auto";
    };
  }, []);

  return (
    <>
      <SEOHead
        title={t("howItWorks.hero.title", "How Docito works")}
        description={t(
          "howItWorks.hero.subtitle",
          "One connected workflow for patients, doctors, and every team that makes care happen \u2014 automated, permissioned, and fast."
        )}
        keywords={t(
          "common:seo.keywords",
          "healthcare, doctors, clinics, labs, pharmacy, imaging, appointments"
        )}
      />

      <main className="bg-background text-foreground antialiased">
        <HowItWorksHero />

        {/* Below-the-fold sections are added in later phases (lazy-loaded). */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-border/50 bg-muted/20 p-8">
              <div className="h-4 w-44 rounded bg-muted/50" />
              <div className="mt-4 h-4 w-full max-w-2xl rounded bg-muted/40" />
              <div className="mt-2 h-4 w-full max-w-xl rounded bg-muted/30" />
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-2xl border border-border/40 bg-background/40"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
