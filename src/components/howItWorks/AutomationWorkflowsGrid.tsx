// File: src/components/howItWorks/AutomationWorkflowsGrid.tsx
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import FadeIn from "./FadeIn";
import {
  CalendarClock,
  ClipboardCheck,
  FileText,
  Share2,
  Send,
  Pill,
} from "lucide-react";

const items = [
  {
    key: "scheduling",
    icon: CalendarClock,
    titleKey: "howItWorks.automation.items.scheduling.title",
    descKey: "howItWorks.automation.items.scheduling.desc",
    fallbackTitle: "Smart scheduling & reminders",
    fallbackDesc: "Reduce no-shows with automated confirmations and timing logic.",
  },
  {
    key: "checkin",
    icon: ClipboardCheck,
    titleKey: "howItWorks.automation.items.checkin.title",
    descKey: "howItWorks.automation.items.checkin.desc",
    fallbackTitle: "Check-in & queue management",
    fallbackDesc: "Move people through care with clear statuses and routing.",
  },
  {
    key: "documentation",
    icon: FileText,
    titleKey: "howItWorks.automation.items.documentation.title",
    descKey: "howItWorks.automation.items.documentation.desc",
    fallbackTitle: "Visit templates & documentation",
    fallbackDesc: "Structured workflow from diagnosis → treatment → prescriptions → files → notes.",
  },
  {
    key: "referrals",
    icon: Share2,
    titleKey: "howItWorks.automation.items.referrals.title",
    descKey: "howItWorks.automation.items.referrals.desc",
    fallbackTitle: "Referrals & care coordination",
    fallbackDesc: "Link referrals to scheduling and keep every handoff visible.",
  },
  {
    key: "results",
    icon: Send,
    titleKey: "howItWorks.automation.items.results.title",
    descKey: "howItWorks.automation.items.results.desc",
    fallbackTitle: "Diagnostics results delivery",
    fallbackDesc: "Deliver results securely with controlled access and notifications.",
  },
  {
    key: "fulfillment",
    icon: Pill,
    titleKey: "howItWorks.automation.items.fulfillment.title",
    descKey: "howItWorks.automation.items.fulfillment.desc",
    fallbackTitle: "Prescription fulfillment workflow",
    fallbackDesc: "Track received → prepared → fulfilled with confirmations.",
  },
] as const;

function safeString(v: unknown, fallback: string) {
  return typeof v === "string" ? v : fallback;
}

export default function AutomationWorkflowsGrid() {
  const { t } = useTranslation(["howItWorks"]);

  return (
    <FadeIn rootMargin="120px">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight">
            {t("howItWorks.automation.title", "Automation that removes manual work")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
            {t(
              "howItWorks.automation.subtitle",
              "Every team gets a clean queue and a clear next step — with fewer calls, fewer spreadsheets, and less friction."
            )}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <Card
              key={it.key}
              className="rounded-3xl border-border/50 bg-background/40 backdrop-blur hover:bg-background/60 transition-colors"
            >
              <CardContent className="p-6">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <it.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">
                    {safeString(t(it.titleKey, it.fallbackTitle), it.fallbackTitle)}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {safeString(t(it.descKey, it.fallbackDesc), it.fallbackDesc)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}
