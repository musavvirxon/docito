import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PricingMatrixIllustration } from "@/components/Visuals/illustrations";

import { Check, Sparkles, Shield, Zap, User, TestTube2, Pill, Scan } from "lucide-react";

type Period = "monthly" | "yearly";
type PlanKey = "starter" | "plus" | "pro";
type RoleKey = "patient" | "doctor" | "clinic" | "lab" | "pharmacy" | "imaging";

type Props = {
  period: Period;
  onChangePeriod: (p: Period) => void;
};

const planMeta: Array<{ key: PlanKey; accent: "default" | "popular" | "pro" }> = [
  { key: "starter", accent: "default" },
  { key: "plus", accent: "popular" },
  { key: "pro", accent: "pro" },
];

const roleMeta: Array<{ key: RoleKey; icon: ComponentType<{ className?: string }> }> = [
  { key: "patient", icon: User },
  { key: "doctor", icon: Zap },
  { key: "clinic", icon: Shield },
  { key: "lab", icon: TestTube2 },
  { key: "pharmacy", icon: Pill },
  { key: "imaging", icon: Scan },
];

const pricing: Record<RoleKey, Record<PlanKey, { monthly: number; yearly: number }>> = {
  patient: {
    starter: { monthly: 0, yearly: 0 },
    plus: { monthly: 9, yearly: 90 },
    pro: { monthly: 19, yearly: 190 },
  },
  doctor: {
    starter: { monthly: 29, yearly: 290 },
    plus: { monthly: 59, yearly: 590 },
    pro: { monthly: 99, yearly: 990 },
  },
  clinic: {
    starter: { monthly: 129, yearly: 1290 },
    plus: { monthly: 249, yearly: 2490 },
    pro: { monthly: 399, yearly: 3990 },
  },
  lab: {
    starter: { monthly: 79, yearly: 790 },
    plus: { monthly: 149, yearly: 1490 },
    pro: { monthly: 249, yearly: 2490 },
  },
  pharmacy: {
    starter: { monthly: 69, yearly: 690 },
    plus: { monthly: 139, yearly: 1390 },
    pro: { monthly: 229, yearly: 2290 },
  },
  imaging: {
    starter: { monthly: 99, yearly: 990 },
    plus: { monthly: 189, yearly: 1890 },
    pro: { monthly: 299, yearly: 2990 },
  },
};

function yearlyAsMonthly(yearly: number) {
  return Math.round((yearly / 12) * 10) / 10;
}

export const PricingMatrix = ({ period, onChangePeriod }: Props) => {
  const { t } = useTranslation("pricing_matrix");
  const [activeRole, setActiveRole] = useState<RoleKey>("patient");

  const getArray = (key: string): string[] => {
    const v = t(key, { returnObjects: true }) as unknown;
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  };

  const savingsPct = useMemo(() => {
    const m = pricing["clinic"]["plus"].monthly * 12;
    const y = pricing["clinic"]["plus"].yearly;
    if (m <= 0) return 0;
    return Math.max(0, Math.round(((m - y) / m) * 100));
  }, []);

  const activeRoleMeta = roleMeta.find((r) => r.key === activeRole)!;
  const RoleIcon = activeRoleMeta.icon;

  const money = (n: number) => {
    if (n === 0) return t("labels.free");
    return `$${n}`;
  };

  const periodSuffix = (p: Period) => (p === "monthly" ? t("labels.perMonth") : t("labels.perYear"));

  const bestValueHint = (p: Period) =>
    p === "yearly" ? t("matrix.roleCard.bestValueYearly") : t("matrix.roleCard.bestValueMonthly");

  return (
    <section className="relative">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-140px] bottom-[-140px] h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative rounded-3xl border border-border/60 bg-card/50 backdrop-blur-xl shadow-sm overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.25] [background:radial-gradient(circle_at_20%_15%,hsl(var(--primary))_0%,transparent_40%),radial-gradient(circle_at_80%_10%,hsl(var(--primary))_0%,transparent_40%)]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] [background-size:56px_56px]" />
        </div>

        <div className="relative p-6 md:p-8">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="px-3 py-1">
                <Sparkles className="mr-2 h-4 w-4" />
                {t("matrix.badge.premiumPricing")}
              </Badge>
              {period === "yearly" && savingsPct > 0 ? (
                <Badge className="bg-primary/10 text-primary border border-primary/20">
                  {t("matrix.badge.savePercent", { pct: savingsPct })}
                </Badge>
              ) : null}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{t("matrix.title")}</h2>
            <p className="text-muted-foreground max-w-2xl">{t("matrix.subtitle")}</p>
          </motion.div>

          {/* Illustration + context */}
          <div className="mt-6 md:mt-8 grid lg:grid-cols-[1fr_360px] gap-6 items-start">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="hidden lg:block"
            >
              <PricingMatrixIllustration className="w-full h-auto" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
              className="space-y-3"
            >
              <div className="rounded-2xl border border-border/60 bg-background/40 p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <RoleIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{t(`roles.${activeRole}.label`)}</div>
                      <div className="text-xs text-muted-foreground">{t(`roles.${activeRole}.sublabel`)}</div>
                    </div>
                  </div>
                  <Badge variant="secondary">{bestValueHint(period)}</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-3">{t("matrix.roleCard.securityLine")}</div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/40 p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{t("matrix.included.title")}</div>
                  <Badge variant="secondary">{t("matrix.included.badge")}</Badge>
                </div>
                <div className="mt-2 space-y-2">
                  {getArray("matrix.included.items").map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-3 w-3 text-primary" />
                      </span>
                      <span className="text-foreground/90">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Toggles (PLACED JUST ABOVE PLANS) */}
          <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <RoleSegment activeRole={activeRole} onChange={setActiveRole} />
            <BillingPeriodSegment period={period} onChange={onChangePeriod} />
          </div>

          {/* Plans for active role */}
          <div className="mt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeRole}-${period}`}
                initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="grid gap-4 lg:grid-cols-3"
              >
                {planMeta.map((p) => {
                  const price = pricing[activeRole][p.key][period];
                  const isPopular = p.accent === "popular";

                  const base = getArray(`featuresByPlan.${p.key}`);
                  const roleSpecific = getArray(`roleAddons.${activeRole}.${p.key}`);

                  return (
                    <motion.div
                      key={`${activeRole}-${p.key}`}
                      whileHover={{ y: -3 }}
                      transition={{ duration: 0.18 }}
                      className={cn(
                        "rounded-3xl border bg-background/45 backdrop-blur p-5 md:p-6",
                        "border-border/60 hover:border-primary/30 hover:shadow-sm",
                        isPopular && "border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-lg font-semibold text-foreground">{t(`plans.${p.key}.name`)}</div>
                            {isPopular ? (
                              <Badge className="bg-primary text-primary-foreground">{t("labels.mostPopular")}</Badge>
                            ) : null}
                            {p.accent === "pro" ? (
                              <Badge className="bg-background/40 border border-primary/20 text-primary">
                                {t("labels.premium")}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-sm text-muted-foreground">{t(`plans.${p.key}.tagline`)}</div>
                          <div className="text-xs text-muted-foreground">
                            {t("labels.bestFor", { value: t(`plans.${p.key}.bestFor`) })}
                          </div>
                        </div>

                        <div
                          className={cn(
                            "h-10 w-10 rounded-2xl flex items-center justify-center",
                            isPopular ? "bg-primary/10" : "bg-muted/40",
                          )}
                        >
                          <Sparkles className={cn("h-5 w-5", isPopular ? "text-primary" : "text-muted-foreground")} />
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="flex items-end gap-2">
                        <div className="text-4xl font-bold tracking-tight text-foreground">{money(price)}</div>
                          <div className="pb-1 text-sm text-muted-foreground">
                            {price === 0 ? "" : periodSuffix(period)}
                          </div>
                        </div>

                        {period === "yearly" && price > 0 ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t("labels.billedYearlyAsMonthly", { amount: yearlyAsMonthly(price) })}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-muted-foreground">&nbsp;</div>
                        )}
                      </div>

                      {/* Core inclusions */}
                      <div className="mt-5">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">{t("labels.core")}</div>
                        <div className="mt-2 space-y-2">
                          {base.map((b) => (
                            <div key={b} className="flex items-start gap-2 text-sm">
                              <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10">
                                <Check className="h-3 w-3 text-primary" />
                              </span>
                              <span className="text-foreground/90">{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Role-specific inclusions */}
                      <div className="mt-5">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          {t(`roles.${activeRole}.label`)}
                        </div>
                        <div className="mt-2 space-y-2">
                          {roleSpecific.map((b) => (
                            <div key={b} className="flex items-start gap-2 text-sm">
                              <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10">
                                <Check className="h-3 w-3 text-primary" />
                              </span>
                              <span className="text-foreground/90">{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6">
                        {(() => {
                          const checkoutUrl = activeRole === "patient" && p.key === "plus" && period === "monthly"
                            ? "https://artsydevelopers.lemonsqueezy.com/checkout/buy/4b62b538-2154-48e9-b97e-d5e9aefd13c5"
                            : null;

                          if (checkoutUrl) {
                            return (
                              <Button
                                asChild
                                className={cn(
                                  "w-full rounded-2xl",
                                  isPopular ? "" : "bg-foreground text-background hover:bg-foreground/90",
                                )}
                              >
                                <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                                  {t(`plans.${p.key}.cta`)}
                                </a>
                              </Button>
                            );
                          }

                          return (
                            <Button
                              asChild
                              className={cn(
                                "w-full rounded-2xl",
                                isPopular ? "" : "bg-foreground text-background hover:bg-foreground/90",
                              )}
                            >
                              <Link to="/auth">{t(`plans.${p.key}.cta`)}</Link>
                            </Button>
                          );
                        })()}

                        <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between">
                          <span className="capitalize">{t(`roles.${activeRole}.key`)}</span>
                          <span>{t("labels.cancelAnytime")}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            <div className="mt-4 text-xs text-muted-foreground">{t("labels.placeholderNote")}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

function RoleSegment({
  activeRole,
  onChange,
}: {
  activeRole: RoleKey;
  onChange: (r: RoleKey) => void;
}) {
  const { t } = useTranslation("pricing_matrix");

  const roleButtons: Array<{ key: RoleKey; label: string }> = [
    { key: "patient", label: t("roles.patient.button") },
    { key: "doctor", label: t("roles.doctor.button") },
    { key: "clinic", label: t("roles.clinic.button") },
    { key: "lab", label: t("roles.lab.button") },
    { key: "pharmacy", label: t("roles.pharmacy.button") },
    { key: "imaging", label: t("roles.imaging.button") },
  ];

  return (
    <div className="flex items-center justify-center md:justify-start">
      <div className="rounded-2xl border border-border/60 bg-background/40 backdrop-blur p-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {roleButtons.map((r) => {
            const active = activeRole === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => onChange(r.key)}
                className={cn(
                  "h-10 px-4 rounded-xl text-sm font-semibold transition-all",
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-foreground/80 hover:text-foreground hover:bg-muted/40",
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BillingPeriodSegment({
  period,
  onChange,
}: {
  period: Period;
  onChange: (p: Period) => void;
}) {
  const { t } = useTranslation("pricing_matrix");

  return (
    <div className="flex items-center justify-center md:justify-end">
      <div className="relative rounded-2xl border border-border/60 bg-background/40 backdrop-blur px-2 py-2">
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className={cn(
            "absolute top-2 bottom-2 w-[calc(50%-8px)] rounded-xl bg-foreground",
            period === "monthly" ? "left-2" : "left-[calc(50%+6px)]",
          )}
        />
        <div className="relative z-10 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange("monthly")}
            className={cn(
              "h-10 px-5 rounded-xl text-sm font-semibold transition-colors",
              period === "monthly" ? "text-background" : "text-foreground/80 hover:text-foreground",
            )}
          >
            {t("billing.monthly")}
          </button>
          <button
            type="button"
            onClick={() => onChange("yearly")}
            className={cn(
              "h-10 px-5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2",
              period === "yearly" ? "text-background" : "text-foreground/80 hover:text-foreground",
            )}
          >
            {t("billing.yearly")}
            <span
              className={cn(
                "text-[11px] px-2 py-0.5 rounded-full border",
                period === "yearly"
                  ? "border-background/30 bg-background/10 text-background"
                  : "border-primary/30 bg-primary/10 text-primary",
              )}
            >
              {t("billing.save")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
