// File: src/components/howItWorks/UniversalFlowStepper.tsx
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FadeIn from "./FadeIn";
import { Search, SlidersHorizontal, CalendarCheck, Sparkles } from "lucide-react";

const steps = [
  { icon: Search, stepKey: "howItWorks.flow.step1Title", descKey: "howItWorks.flow.step1Desc", fallbackTitle: "Search", fallbackDesc: "Find providers, services, and availability — in seconds." },
  { icon: SlidersHorizontal, stepKey: "howItWorks.flow.step2Title", descKey: "howItWorks.flow.step2Desc", fallbackTitle: "Choose", fallbackDesc: "Compare verified options and pick what fits." },
  { icon: CalendarCheck, stepKey: "howItWorks.flow.step3Title", descKey: "howItWorks.flow.step3Desc", fallbackTitle: "Book", fallbackDesc: "Book instantly with reminders and smart intake." },
  { icon: Sparkles, stepKey: "howItWorks.flow.step4Title", descKey: "howItWorks.flow.step4Desc", fallbackTitle: "Care & Follow-up", fallbackDesc: "Visit, results, prescriptions, and follow-ups — connected." },
] as const;

export default function UniversalFlowStepper() {
  const { t } = useTranslation(["howItWorks"]);

  const ops = [
    { key: "scheduling", fallback: "Scheduling" },
    { key: "queues", fallback: "Work queues" },
    { key: "documentation", fallback: "Documentation" },
    { key: "results", fallback: "Results delivery" },
    { key: "fulfillment", fallback: "Fulfillment" },
    { key: "followups", fallback: "Follow-ups" },
  ] as const;

  return (
    <FadeIn rootMargin="120px">
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight">
              {t("howItWorks.flow.title", "A universal flow — across the whole ecosystem")}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              {t(
                "howItWorks.flow.stepperSubtitle",
                "Docito keeps every step coordinated, while automating the operational work behind it."
              )}
            </p>
          </div>
          <Badge variant="secondary" className="hidden sm:inline-flex rounded-full">
            {t("howItWorks.flow.badge", "Designed for speed")}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, idx) => (
            <Card key={s.stepKey} className="rounded-3xl border-border/50 bg-background/40 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t("howItWorks.flow.stepLabel", "Step")} {idx + 1}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  <h3 className="text-base font-medium">
                    {t(s.stepKey, s.fallbackTitle)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(s.descKey, s.fallbackDesc)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-3xl border border-border/50 bg-muted/15 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium">
              {t("howItWorks.flow.opsLayerTitle", "Operational layer")}
            </p>
            <div className="flex flex-wrap gap-2">
              {ops.map((o) => (
                <span
                  key={o.key}
                  className="inline-flex items-center rounded-full border border-border/50 bg-background/50 px-3 py-1 text-xs text-muted-foreground"
                >
                  {t(`howItWorks.flow.opsItems.${o.key}`, o.fallback)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
