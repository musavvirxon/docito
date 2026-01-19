import { useTranslation } from "react-i18next";
import Reveal from "./Reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

function safeString(v: unknown, fallback: string) {
  return typeof v === "string" ? v : fallback;
}

export default function HowItWorksFAQ() {
  const { t } = useTranslation(["howItWorks"]);

  const faqs = [
    {
      qKey: "howItWorks.faq.q1.question",
      aKey: "howItWorks.faq.q1.answer",
      qFallback: "How do staff get access?",
      aFallback: "Practice or facility admins invite staff and assign roles. Access is scoped to responsibilities.",
    },
    {
      qKey: "howItWorks.faq.q2.question",
      aKey: "howItWorks.faq.q2.answer",
      qFallback: "What can staff see vs doctors vs patients?",
      aFallback: "Each role has a permissioned view. Staff see operational data they need; clinical access is controlled.",
    },
    {
      qKey: "howItWorks.faq.q3.question",
      aKey: "howItWorks.faq.q3.answer",
      qFallback: "How do referrals link to scheduling?",
      aFallback: "Referrals create trackable tasks and can link directly into scheduling and facility queues when needed.",
    },
    {
      qKey: "howItWorks.faq.q4.question",
      aKey: "howItWorks.faq.q4.answer",
      qFallback: "How are results delivered?",
      aFallback: "Results are delivered securely to the right parties with role-based access and a logged audit trail.",
    },
    {
      qKey: "howItWorks.faq.q5.question",
      aKey: "howItWorks.faq.q5.answer",
      qFallback: "How do pharmacies confirm fulfillment?",
      aFallback: "Pharmacies update fulfillment statuses, which are visible to the patient and (when permitted) the ordering clinician.",
    },
    {
      qKey: "howItWorks.faq.q6.question",
      aKey: "howItWorks.faq.q6.answer",
      qFallback: "Is data secure?",
      aFallback: "Docito uses role-based access control, encrypted storage, and audit logs to help protect data.",
    },
    {
      qKey: "howItWorks.faq.q7.question",
      aKey: "howItWorks.faq.q7.answer",
      qFallback: "Can I use insurance?",
      aFallback: "Insurance support depends on provider configuration and region. You'll see supported options where available.",
    },
    {
      qKey: "howItWorks.faq.q8.question",
      aKey: "howItWorks.faq.q8.answer",
      qFallback: "Is a mobile app available?",
      aFallback: "Coming soon. The web experience is mobile-friendly and optimized for performance.",
    },
  ] as const;

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight">
                {t("howItWorks.faq.title", "FAQ")}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
                {t(
                  "howItWorks.faq.subtitle",
                  "Short answers to common questions from patients, providers, and operations teams."
                )}
              </p>
            </div>

            <div className="rounded-3xl border border-border/50 bg-background/40 backdrop-blur">
              <Accordion type="single" collapsible className="px-2 sm:px-4">
                {faqs.map((f, idx) => (
                  <AccordionItem key={idx} value={`faq-${idx}`} className="border-border/40">
                    <AccordionTrigger className="text-left text-sm sm:text-base">
                      {safeString(t(f.qKey, f.qFallback), f.qFallback)}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {safeString(t(f.aKey, f.aFallback), f.aFallback)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
