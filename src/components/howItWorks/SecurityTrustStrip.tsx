// File: src/components/howItWorks/SecurityTrustStrip.tsx
import { useTranslation } from "react-i18next";
import FadeIn from "./FadeIn";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, ListChecks, BadgeCheck, Lock, Scale } from "lucide-react";

const items = [
  { key: "rbac", icon: Shield, fallback: "Role-based access control (RBAC)" },
  { key: "audit", icon: ListChecks, fallback: "Audit logs" },
  { key: "verification", icon: BadgeCheck, fallback: "Verified providers/facilities" },
  { key: "encryption", icon: Lock, fallback: "Encrypted file storage" },
  { key: "compliance", icon: Scale, fallback: "HIPAA/GDPR-ready posture" },
] as const;

function safeString(v: unknown, fallback: string) {
  return typeof v === "string" ? v : fallback;
}

export default function SecurityTrustStrip() {
  const { t } = useTranslation(["howItWorks"]);

  return (
    <FadeIn rootMargin="120px">
      <Card className="rounded-3xl border-border/50 bg-muted/15">
        <CardContent className="p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight">
                {t("howItWorks.security.title", "Security & trust by design")}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-3xl">
                {t(
                  "howItWorks.security.subtitle",
                  "Docito is built with permissions, verification, and traceability — so teams can move fast without losing control."
                )}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:min-w-[340px]">
              {items.map((it) => (
                <div
                  key={it.key}
                  className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/40 p-4"
                >
                  <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <it.icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {safeString(
                      t(`howItWorks.security.items.${it.key}`, it.fallback),
                      it.fallback
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
