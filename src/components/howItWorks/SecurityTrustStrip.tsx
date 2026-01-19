// File: src/components/howItWorks/SecurityTrustStrip.tsx
import { useTranslation } from "react-i18next";
import Reveal from "./Reveal";
import {
  Shield,
  ClipboardCheck,
  BadgeCheck,
  LockKeyhole,
  FileLock2,
} from "lucide-react";

export default function SecurityTrustStrip() {
  const { t } = useTranslation(["howItWorks"]);

  const items = [
    { icon: Shield, label: t("howItWorks.security.items.rbac", "Role-based access control (RBAC)") },
    { icon: ClipboardCheck, label: t("howItWorks.security.items.audit", "Audit logs") },
    { icon: BadgeCheck, label: t("howItWorks.security.items.verification", "Verified providers/facilities") },
    { icon: LockKeyhole, label: t("howItWorks.security.items.encryption", "Encrypted file storage") },
    { icon: FileLock2, label: t("howItWorks.security.items.compliance", "HIPAA/GDPR-ready posture") },
  ];

  return (
    <section className="py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="rounded-3xl border border-border/50 bg-muted/20 p-7 sm:p-9">
            <div className="flex items-center justify-between gap-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-light tracking-tight">
                  {t("howItWorks.security.title", "Security & trust by design")}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                  {t(
                    "howItWorks.security.subtitle",
                    "Care workflows are permissioned, auditable, and scoped to the minimum necessary access."
                  )}
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-2xl border border-border/40 bg-background/40 px-4 py-3"
                >
                  <it.icon className="h-4 w-4 text-primary" />
                  <div className="text-xs sm:text-sm text-muted-foreground leading-snug">{it.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
