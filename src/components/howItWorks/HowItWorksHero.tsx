// File: src/components/howItWorks/HowItWorksHero.tsx
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import VectorNetworkIllustration from "./VectorNetworkIllustration";
import { useHowItWorksMetrics } from "@/hooks/useHowItWorksMetrics";

function MetricPill({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/40 backdrop-blur px-3 py-1.5">
      <ShieldCheck className="h-4 w-4 text-primary/80" />
      <span className="text-xs text-muted-foreground">{label}</span>
      {loading ? (
        <span className="inline-block h-3 w-10 rounded bg-muted/50 animate-pulse" />
      ) : (
        <span className="text-xs font-medium text-foreground tabular-nums">{value}</span>
      )}
    </div>
  );
}

export default function HowItWorksHero() {
  const { t } = useTranslation(["howItWorks"]);
  const metrics = useHowItWorksMetrics();

  const loading = metrics.status === "loading" || metrics.status === "idle";
  const live = metrics.status === "success" ? metrics.data : null;

  const fallback = {
    verified_doctors: Number(t("howItWorks.metrics.fallback.verified_doctors", { defaultValue: "1200" })),
    verified_facilities: Number(t("howItWorks.metrics.fallback.verified_facilities", { defaultValue: "350" })),
    appointments_7d: Number(t("howItWorks.metrics.fallback.appointments_7d", { defaultValue: "5400" })),
  };

  const m = live || fallback;

  return (
    <section className="relative overflow-hidden pt-14">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -start-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -end-24 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-7 text-start">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-medium text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Docito
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-foreground">
              {t("howItWorks.hero.title", "How Docito works")}
            </h1>

            <p className="max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground font-light">
              {t(
                "howItWorks.hero.subtitle",
                "One connected workflow for patients, doctors, and every team that makes care happen — automated, permissioned, and fast."
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="h-11 rounded-full px-6">
                <Link to="/#search" aria-label={t("howItWorks.hero.ctaPrimary", "Start search")}>
                  <span className="flex items-center gap-2">
                    {t("howItWorks.hero.ctaPrimary", "Start search")}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="h-11 rounded-full px-6 bg-background/60 backdrop-blur">
                <a href="#roles" aria-label={t("howItWorks.hero.ctaSecondary", "Explore by role")}>
                  <span className="flex items-center gap-2">
                    {t("howItWorks.hero.ctaSecondary", "Explore by role")}
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <MetricPill
                label={t("howItWorks.metrics.labels.verifiedDoctors", "Verified doctors")}
                value={Intl.NumberFormat().format(m.verified_doctors)}
                loading={loading}
              />
              <MetricPill
                label={t("howItWorks.metrics.labels.verifiedFacilities", "Verified facilities")}
                value={Intl.NumberFormat().format(m.verified_facilities)}
                loading={loading}
              />
              <MetricPill
                label={t("howItWorks.metrics.labels.appointments7d", "Appointments (7d)")}
                value={Intl.NumberFormat().format(m.appointments_7d)}
                loading={loading}
              />
            </div>

            {metrics.status === "error" ? (
              <p className="text-xs text-muted-foreground">
                {t("howItWorks.metrics.unavailable", "Metrics unavailable (showing safe defaults).")}
              </p>
            ) : null}
          </div>

          <div className="relative">
            <div className="relative rounded-3xl border border-border/50 bg-background/40 backdrop-blur-2xl shadow-2xl shadow-black/5 p-6 sm:p-8">
              <VectorNetworkIllustration className="text-foreground" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
