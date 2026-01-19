// File: src/pages/HowItWorks.tsx
import { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SEOHead } from "@/components/SEOHead";
import HowItWorksHero from "@/components/howItWorks/HowItWorksHero";
import { Skeleton } from "@/components/ui/skeleton";

const UniversalFlowStepper = lazy(() => import("@/components/howItWorks/UniversalFlowStepper"));
const RoleSwitcher = lazy(() => import("@/components/howItWorks/RoleSwitcher"));
const AutomationWorkflowsGrid = lazy(() => import("@/components/howItWorks/AutomationWorkflowsGrid"));
const SecurityTrustStrip = lazy(() => import("@/components/howItWorks/SecurityTrustStrip"));
const HowItWorksFAQ = lazy(() => import("@/components/howItWorks/HowItWorksFAQ"));
const FinalCTASection = lazy(() => import("@/components/howItWorks/FinalCTASection"));

function SectionSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="rounded-3xl border border-border/50 bg-muted/20 p-8">
        <Skeleton className="h-5 w-52" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full max-w-2xl" />
          ))}
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-border/40 bg-background/40" />
          ))}
        </div>
      </div>
    </div>
  );
}

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
          "One connected workflow for patients, doctors, and every team that makes care happen — automated, permissioned, and fast."
        )}
        keywords={t(
          "common:seo.keywords",
          "healthcare, doctors, clinics, labs, pharmacy, imaging, appointments"
        )}
      />

      <main className="bg-background text-foreground antialiased">
        {/* Above the fold */}
        <HowItWorksHero />

        {/* Below the fold (lazy-loaded for performance) */}
        <Suspense fallback={<SectionSkeleton />}>
          <UniversalFlowStepper />
        </Suspense>

        <Suspense fallback={<SectionSkeleton lines={4} />}>
          <RoleSwitcher />
        </Suspense>

        <Suspense fallback={<SectionSkeleton lines={2} />}>
          <AutomationWorkflowsGrid />
        </Suspense>

        <Suspense fallback={<SectionSkeleton lines={2} />}>
          <SecurityTrustStrip />
        </Suspense>

        <Suspense fallback={<SectionSkeleton lines={4} />}>
          <HowItWorksFAQ />
        </Suspense>

        <Suspense fallback={<SectionSkeleton lines={2} />}>
          <FinalCTASection />
        </Suspense>
      </main>
    </>
  );
}
