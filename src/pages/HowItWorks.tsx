// File: src/pages/HowItWorks.tsx
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { SEOHead } from "@/components/SEOHead";
import HowItWorksHero from "@/components/howItWorks/HowItWorksHero";
import LazyMount from "@/components/howItWorks/LazyMount";

const UniversalFlowStepper = lazy(() => import("@/components/howItWorks/UniversalFlowStepper"));
const RoleSwitcher = lazy(() => import("@/components/howItWorks/RoleSwitcher"));
const AutomationWorkflowsGrid = lazy(() => import("@/components/howItWorks/AutomationWorkflowsGrid"));
const SecurityTrustStrip = lazy(() => import("@/components/howItWorks/SecurityTrustStrip"));
const HowItWorksFAQ = lazy(() => import("@/components/howItWorks/HowItWorksFAQ"));
const FinalCTASection = lazy(() => import("@/components/howItWorks/FinalCTASection"));

function SectionSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-3xl border border-border/50 bg-muted/15 p-8">
      <div className="h-4 w-48 rounded bg-muted/50" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-4 w-full max-w-3xl rounded bg-muted/30" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl border border-border/40 bg-background/40" />
        ))}
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const { t } = useTranslation(["howItWorks", "common"]);

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
        <HowItWorksHero />

        <LazyMount rootMargin="200px">
          <section className="py-14 sm:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Suspense fallback={<SectionSkeleton lines={2} />}>
                <UniversalFlowStepper />
              </Suspense>
            </div>
          </section>
        </LazyMount>

        <LazyMount rootMargin="240px">
          <section className="py-14 sm:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Suspense fallback={<SectionSkeleton lines={3} />}>
                <RoleSwitcher />
              </Suspense>
            </div>
          </section>
        </LazyMount>

        <LazyMount rootMargin="260px">
          <section className="py-14 sm:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Suspense fallback={<SectionSkeleton lines={2} />}>
                <AutomationWorkflowsGrid />
              </Suspense>
            </div>
          </section>
        </LazyMount>

        <LazyMount rootMargin="260px">
          <section className="py-14 sm:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Suspense fallback={<SectionSkeleton lines={1} />}>
                <SecurityTrustStrip />
              </Suspense>
            </div>
          </section>
        </LazyMount>

        <LazyMount rootMargin="260px">
          <section className="py-14 sm:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Suspense fallback={<SectionSkeleton lines={2} />}>
                <HowItWorksFAQ />
              </Suspense>
            </div>
          </section>
        </LazyMount>

        <LazyMount rootMargin="320px">
          <section className="py-14 sm:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Suspense fallback={<SectionSkeleton lines={1} />}>
                <FinalCTASection />
              </Suspense>
            </div>
          </section>
        </LazyMount>
      </main>
    </>
  );
}
