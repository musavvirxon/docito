import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useInView } from "framer-motion";
import { useRef } from "react";
import {
  CalendarCheck,
  FileText,
  RefreshCw,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const automationCards = [
  {
    icon: CalendarCheck,
    key: "scheduling",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: FileText,
    key: "documentation",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: RefreshCw,
    key: "referrals",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Lock,
    key: "records",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

export default function DocitoAutomatesSection() {
  const { t, i18n } = useTranslation(["doctors", "common"]);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const isRTL = i18n.language === "ar";

  return (
    <section
      ref={ref}
      className={cn(
        "py-16 lg:py-20 bg-gradient-to-b from-background to-muted/30",
        isRTL && "rtl"
      )}
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-3">
            {t("doctors:publicProfile.automates.headline", "Less admin. More care.")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t(
              "doctors:publicProfile.automates.subheadline",
              "Docito handles the busywork so providers can focus on what matters."
            )}
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {automationCards.map((card, index) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              whileHover={{ y: -4, boxShadow: "0 12px 40px -12px hsl(var(--primary) / 0.15)" }}
              className={cn(
                "relative p-6 rounded-2xl border border-border/50 bg-card",
                "transition-shadow duration-300 cursor-default"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                  card.bgColor
                )}
              >
                <card.icon className={cn("w-6 h-6", card.color)} />
              </div>

              {/* Title */}
              <h3 className="font-semibold text-foreground mb-2">
                {t(`doctors:publicProfile.automates.${card.key}.title`, getDefaultTitle(card.key))}
              </h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`doctors:publicProfile.automates.${card.key}.description`, getDefaultDescription(card.key))}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function getDefaultTitle(key: string): string {
  const titles: Record<string, string> = {
    scheduling: "Auto Scheduling & Reminders",
    documentation: "Visit Documentation",
    referrals: "Referrals & Follow-ups",
    records: "Secure Records & Sharing",
  };
  return titles[key] || key;
}

function getDefaultDescription(key: string): string {
  const descriptions: Record<string, string> = {
    scheduling: "Reduce no-shows with automated confirmations and smart reminders.",
    documentation: "From diagnosis to treatment, prescriptions, and notes — all captured.",
    referrals: "Seamless coordination across labs, imaging, and pharmacies.",
    records: "Patient files, reports, and results — all in one secure place.",
  };
  return descriptions[key] || "";
}
