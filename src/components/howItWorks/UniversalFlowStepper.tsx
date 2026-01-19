// File: src/components/howItWorks/UniversalFlowStepper.tsx
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Reveal from "./Reveal";

type Step = {
  title: string;
  desc: string;
};

export default function UniversalFlowStepper() {
  const { t } = useTranslation(["howItWorks"]);

  const steps: Step[] = [
    {
      title: t("howItWorks.flow.step1Title", "Search"),
      desc: t(
        "howItWorks.flow.step1Desc",
        "Find doctors, facilities, labs, imaging, and pharmacies by availability, location, and verification."
      ),
    },
    {
      title: t("howItWorks.flow.step2Title", "Choose"),
      desc: t(
        "howItWorks.flow.step2Desc",
        "Compare profiles, services, pricing/insurance, and trust signals — then pick what fits."
      ),
    },
    {
      title: t("howItWorks.flow.step3Title", "Book"),
      desc: t(
        "howItWorks.flow.step3Desc",
        "Book a slot, receive confirmation, and get reminders. Staff queues update automatically."
      ),
    },
    {
      title: t("howItWorks.flow.step4Title", "Care & Follow-up"),
      desc: t(
        "howItWorks.flow.step4Desc",
        "Get visit notes, results, prescriptions, and follow-ups — delivered to the right role, instantly."
      ),
    },
  ];

  const ops = [
    { k: "scheduling", label: t("howItWorks.flow.opsItems.scheduling", "Scheduling") },
    { k: "queues", label: t("howItWorks.flow.opsItems.queues", "Work queues") },
    { k: "documentation", label: t("howItWorks.flow.opsItems.documentation", "Documentation") },
    { k: "results", label: t("howItWorks.flow.opsItems.results", "Results delivery") },
    { k: "fulfillment", label: t("howItWorks.flow.opsItems.fulfillment", "Fulfillment") },
    { k: "followups", label: t("howItWorks.flow.opsItems.followups", "Follow-ups") },
  ];

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight">
                {t("howItWorks.flow.title", "A universal flow — for every role")}
              </h2>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
                {t(
                  "howItWorks.flow.subtitle",
                  "Docito connects patient actions to operational execution — without manual handoffs."
                )}
              </p>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex rounded-full">
              {t("howItWorks.flow.badge", "End-to-end")}
            </Badge>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-4">
          {steps.map((s, idx) => (
            <Reveal key={idx} delay={idx * 0.05}>
              <Card className="h-full rounded-3xl border-border/50 bg-background/40 backdrop-blur p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-2xl border border-primary/20 bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                    {idx + 1}
                  </div>
                  <div className="text-base font-medium">{s.title}</div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </Card>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.05}>
          <div className="mt-8 rounded-3xl border border-border/50 bg-muted/20 p-6 sm:p-7">
            <div className="text-sm font-medium text-foreground">
              {t("howItWorks.flow.opsLayerTitle", "Operational layer")}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {ops.map((o) => (
                <span
                  key={o.k}
                  className="inline-flex items-center rounded-full border border-border/50 bg-background/50 px-3 py-1 text-xs text-muted-foreground"
                >
                  {o.label}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
