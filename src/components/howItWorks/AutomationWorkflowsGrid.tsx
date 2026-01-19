// File: src/components/howItWorks/AutomationWorkflowsGrid.tsx
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import Reveal from "./Reveal";
import {
  CalendarClock,
  ClipboardPenLine,
  Stethoscope,
  FileDown,
  Network,
  Pill,
  Users,
  Workflow,
} from "lucide-react";

type Item = {
  icon: any;
  title: string;
  desc: string;
};

export default function AutomationWorkflowsGrid() {
  const { t } = useTranslation(["howItWorks"]);

  const items: Item[] = [
    {
      icon: CalendarClock,
      title: t("howItWorks.automation.items.scheduling.title", "Smart scheduling & reminders"),
      desc: t(
        "howItWorks.automation.items.scheduling.desc",
        "Reduce no-shows with confirmations, rescheduling, and automated follow-ups."
      ),
    },
    {
      icon: Workflow,
      title: t("howItWorks.automation.items.checkin.title", "Check-in & queue management"),
      desc: t(
        "howItWorks.automation.items.checkin.desc",
        "Real-time statuses and workload balancing across front desk and clinical teams."
      ),
    },
    {
      icon: ClipboardPenLine,
      title: t("howItWorks.automation.items.documentation.title", "Visit templates & documentation"),
      desc: t(
        "howItWorks.automation.items.documentation.desc",
        "Diagnosis → Treatment → Prescriptions → Files → Notes, structured and fast."
      ),
    },
    {
      icon: Network,
      title: t("howItWorks.automation.items.referrals.title", "Referrals & care coordination"),
      desc: t(
        "howItWorks.automation.items.referrals.desc",
        "Referrals connect directly to scheduling, orders, and downstream work queues."
      ),
    },
    {
      icon: FileDown,
      title: t("howItWorks.automation.items.results.title", "Diagnostics results delivery"),
      desc: t(
        "howItWorks.automation.items.results.desc",
        "Lab/imaging results delivered securely to the right role with audit trails."
      ),
    },
    {
      icon: Pill,
      title: t("howItWorks.automation.items.fulfillment.title", "Prescription fulfillment workflow"),
      desc: t(
        "howItWorks.automation.items.fulfillment.desc",
        "Track prepare → ready → dispensed → confirmed with permissioned visibility."
      ),
    },
  ];

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight">
                {t("howItWorks.automation.title", "Automation that reduces manual work")}
              </h2>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
                {t(
                  "howItWorks.automation.subtitle",
                  "Designed for staff-heavy workflows — fast, permissioned, and traceable."
                )}
              </p>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, idx) => (
            <Reveal key={idx} delay={idx * 0.04}>
              <Card className="h-full rounded-3xl border-border/50 bg-background/40 backdrop-blur p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl border border-primary/20 bg-primary/10 text-primary flex items-center justify-center">
                    <it.icon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium">{it.title}</div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{it.desc}</p>
                <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{t("howItWorks.automation.tag", "Staff-ready operations")}</span>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
