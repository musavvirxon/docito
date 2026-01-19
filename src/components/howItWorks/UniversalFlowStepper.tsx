// File: src/components/howItWorks/UniversalFlowStepper.tsx
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Reveal from "./Reveal";
import { cn } from "@/lib/utils";

type Step = {
  title: string;
  desc: string;
};

export default function UniversalFlowStepper() {
  const { t } = useTranslation(["howItWorks"]);

  const steps: Step[] = [
    {
      title: t("howItWorks.flow.step1Title", "Search"),
      desc: t("howItWorks.flow.step1Desc", "Find verified providers and services by location, specialty, and availability."),
    },
    {
      title: t("howItWorks.flow.step2Title", "Choose"),
      desc: t("howItWorks.flow.step2Desc", "Compare profiles, prices, schedules, and clinic capabilities — in one place."),
    },
    {
      title: t("howItWorks.flow.step3Title", "Book"),
      desc: t("howItWorks.flow.step3Desc", "Request an appointment or order, then track status in your dashboard."),
    },
    {
      title: t("howItWorks.flow.step4Title", "Care & Follow-up"),
      desc: t("howItWorks.flow.step4Desc", "Get results, prescriptions, and follow-ups delivered to the right people."),
    },
  ];

  const ops = [
    { key: "scheduling", label: t("howItWorks.flow.opsItems.scheduling", "Scheduling") },
    { key: "queues", label: t("howItWorks.flow.opsItems.queues", "Work queues") },
    { key: "documentation", label: t("howItWorks.flow.opsItems.documentation", "Documentation") },
    { key: "results", label: t("howItWorks.flow.opsItems.results", "Results delivery") },
    { key: "fulfillment", label: t("howItWorks.flow.opsItems.fulfillment", "Fulfillment") },
    { key: "followups", label: t("howItWorks.flow.opsItems.followups", "Follow-ups") },
  ];

  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-foreground">
              {t("howItWorks.flow.title", "A universal flow, for every role")}
            </h2>
            <Badge variant="secondary" className="rounded-full">
              {t("howItWorks.flow.opsLayerTitle", "Operational layer included")}
            </Badge>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={i} delayMs={i * 70}>
              <Card className="h-full rounded-3xl border-border/50 bg-background/40 backdrop-blur p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                    {i + 1}
                  </div>
                  <h3 className="text-lg font-medium text-foreground">{s.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </Card>
            </Reveal>
          ))}
        </div>

        <Reveal delayMs={120}>
          <div className="mt-8 rounded-3xl border border-border/50 bg-muted/20 p-6">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{t("howItWorks.flow.opsLayerTitle", "Operational layer")}: </span>
              <span className="inline-flex flex-wrap gap-2">
                {ops.map((o) => (
                  <span
                    key={o.key}
                    className={cn("px-3 py-1 rounded-full border border-border/50 bg-background/50")}
                  >
                    {o.label}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
