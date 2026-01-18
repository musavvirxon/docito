// File: src/components/pricing/PricingMatrix.tsx

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PricingMatrixIllustration } from "@/components/Visuals/illustrations";

import { Check, Sparkles, Shield, Zap } from "lucide-react";

type Period = "monthly" | "yearly";

type Props = {
  period: Period;
  onChangePeriod: (p: Period) => void;
};

type PlanKey = "starter" | "plus" | "pro";
type RoleKey = "patient" | "doctor" | "clinic";

const plans: Array<{
  key: PlanKey;
  name: string;
  tagline: string;
  accent: "default" | "popular" | "pro";
  cta: string;
}> = [
  { key: "starter", name: "Starter", tagline: "Clean essentials, no clutter.", accent: "default", cta: "Choose Starter" },
  { key: "plus", name: "Plus", tagline: "Most popular for daily care.", accent: "popular", cta: "Choose Plus" },
  { key: "pro", name: "Pro", tagline: "Premium workflow + insights.", accent: "pro", cta: "Choose Pro" },
];

const roles: Array<{
  key: RoleKey;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "patient", label: "Patients", sublabel: "Appointments, records & payments.", icon: Sparkles },
  { key: "doctor", label: "Doctors", sublabel: "Scheduling, notes & billing.", icon: Zap },
  { key: "clinic", label: "Clinics", sublabel: "Teams, operations & analytics.", icon: Shield },
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
};

const featureBullets: Record<RoleKey, Record<PlanKey, string[]>> = {
  patient: {
    starter: ["Book appointments", "Basic records access", "Email reminders"],
    plus: ["Priority booking", "Smart reminders", "Digital receipts"],
    pro: ["Family profiles", "Premium support", "Advanced health timeline"],
  },
  doctor: {
    starter: ["Calendar + availability", "Patient notes", "Basic invoicing"],
    plus: ["Team inbox", "Templates", "Automated follow-ups"],
    pro: ["Scribe-ready flows", "Advanced billing rules", "Insights & exports"],
  },
  clinic: {
    starter: ["Staff roles", "Front-desk tools", "Core reporting"],
    plus: ["Multi-location", "Operational dashboards", "Automations"],
    pro: ["Custom analytics", "Audit trails", "Dedicated onboarding"],
  },
};

function money(n: number, period: Period) {
  if (n === 0) return "Free";
  if (period === "monthly") return `$${n}`;
  return `$${n}`;
}

function periodSuffix(period: Period) {
  return period === "monthly" ? "/mo" : "/yr";
}

function yearlyAsMonthly(yearly: number) {
  return Math.round((yearly / 12) * 10) / 10;
}

export const PricingMatrix = ({ period, onChangePeriod }: Props) => {
  const savingsPct = useMemo(() => {
    // simple “up to” savings vs 12x monthly
    const sampleRole: RoleKey = "doctor";
    const samplePlan: PlanKey = "plus";
    const m = pricing[sampleRole][samplePlan].monthly * 12;
    const y = pricing[sampleRole][samplePlan].yearly;
    if (m <= 0) return 0;
    return Math.max(0, Math.round(((m - y) / m) * 100));
  }, []);

  return (
    <section className="relative">
      {/* Premium glass background + illustration */}
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
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-3 py-1">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Apple-style pricing
                </Badge>
                {period === "yearly" && savingsPct > 0 ? (
                  <Badge className="bg-primary/10 text-primary border border-primary/20">Save ~{savingsPct}%</Badge>
                ) : null}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Pick a plan. Choose your role.</h2>
              <p className="text-muted-foreground max-w-2xl">
                Three premium tiers across patients, doctors, and clinics — presented as one clean comparison.
              </p>
            </motion.div>

            <BillingPeriodSegment period={period} onChange={onChangePeriod} />
          </div>

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
                <div className="text-sm font-medium">Billed {period === "monthly" ? "monthly" : "yearly"}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {period === "yearly" ? "Best value for teams and long-term use." : "Flexible month-to-month."}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/40 p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Security</div>
                  <Badge variant="secondary">RLS + Auth</Badge>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Data access is locked to accounts and roles. Payments are tokenized by Stripe.
                </div>
              </div>
            </motion.div>
          </div>

          {/* Matrix */}
          <div className="mt-8">
            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                {/* Header row: plans (3) on top */}
                <div className="grid grid-cols-[280px_repeat(3,minmax(0,1fr))] gap-3">
                  <div className="px-4 py-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Roles</div>
                  </div>

                  {plans.map((p, i) => (
                    <motion.div
                      key={p.key}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.45, ease: "easeOut", delay: 0.06 * i }}
                      className={cn(
                        "rounded-2xl border bg-background/40 backdrop-blur p-4",
                        "border-border/60",
                        p.accent === "popular" && "border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]",
                        p.accent === "pro" && "border-primary/30",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="text-lg font-semibold">{p.name}</div>
                            {p.accent === "popular" ? (
                              <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                            ) : null}
                          </div>
                          <div className="text-sm text-muted-foreground">{p.tagline}</div>
                        </div>
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button asChild className={cn("w-full", p.accent === "popular" ? "" : "bg-foreground text-background hover:bg-foreground/90")}>
                          <Link to="/auth">{p.cta}</Link>
                        </Button>
                        <div className="mt-2 text-xs text-muted-foreground text-center">
                          {period === "yearly" ? "Cancel anytime · yearly billing" : "Cancel anytime · monthly billing"}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Rows: roles on left */}
                <div className="mt-3 space-y-3">
                  {roles.map((role, rIdx) => {
                    const RoleIcon = role.icon;
                    return (
                      <motion.div
                        key={role.key}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 * rIdx }}
                        className="grid grid-cols-[280px_repeat(3,minmax(0,1fr))] gap-3"
                      >
                        {/* Left column: role */}
                        <div className="rounded-2xl border border-border/60 bg-background/40 backdrop-blur p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <RoleIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <div className="font-semibold">{role.label}</div>
                              <div className="text-sm text-muted-foreground">{role.sublabel}</div>
                            </div>
                          </div>
                          <div className="mt-4 text-xs text-muted-foreground">
                            Compare what each plan unlocks for this role.
                          </div>
                        </div>

                        {plans.map((plan) => {
                          const value = pricing[role.key][plan.key][period];
                          const bullets = featureBullets[role.key][plan.key];
                          const isPopular = plan.accent === "popular";

                          return (
                            <motion.div
                              key={`${role.key}-${plan.key}`}
                              whileHover={{ y: -2 }}
                              transition={{ duration: 0.18 }}
                              className={cn(
                                "rounded-2xl border bg-background/40 backdrop-blur p-4",
                                "border-border/60 hover:border-primary/30 hover:shadow-sm",
                                isPopular && "border-primary/25",
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="text-sm text-muted-foreground">Price</div>
                                  <div className="flex items-baseline gap-2">
                                    <AnimatePresence mode="popLayout">
                                      <motion.div
                                        key={`${role.key}-${plan.key}-${period}-${value}`}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ duration: 0.18 }}
                                        className="text-2xl font-bold tracking-tight"
                                      >
                                        {money(value, period)}
                                      </motion.div>
                                    </AnimatePresence>
                                    <div className="text-sm text-muted-foreground">{value === 0 ? "" : periodSuffix(period)}</div>
                                  </div>

                                  {period === "yearly" && value > 0 ? (
                                    <div className="text-xs text-muted-foreground">
                                      ~${yearlyAsMonthly(value)}/mo billed yearly
                                    </div>
                                  ) : null}
                                </div>

                                {isPopular ? (
                                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                  </div>
                                ) : (
                                  <div className="h-9 w-9 rounded-xl bg-muted/40 flex items-center justify-center">
                                    <Check className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                              </div>

                              <div className="mt-3 space-y-2">
                                {bullets.map((b) => (
                                  <div key={b} className="flex items-start gap-2 text-sm">
                                    <span className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10">
                                      <Check className="h-3 w-3 text-primary" />
                                    </span>
                                    <span className="text-foreground/90">{b}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-4 flex items-center justify-between">
                                <Badge variant="secondary" className="bg-background/40">
                                  {plan.name}
                                </Badge>

                                <Button asChild size="sm" variant={isPopular ? "default" : "outline"} className="rounded-xl">
                                  <Link to="/auth">Start</Link>
                                </Button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Prices shown are example tiers. You can later connect real billing rules (Stripe) per role/plan.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

function BillingPeriodSegment({
  period,
  onChange,
}: {
  period: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="flex items-center justify-center lg:justify-end">
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
            Monthly
          </button>
          <button
            type="button"
            onClick={() => onChange("yearly")}
            className={cn(
              "h-10 px-5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2",
              period === "yearly" ? "text-background" : "text-foreground/80 hover:text-foreground",
            )}
          >
            Yearly
            <span
              className={cn(
                "text-[11px] px-2 py-0.5 rounded-full border",
                period === "yearly"
                  ? "border-background/30 bg-background/10 text-background"
                  : "border-primary/30 bg-primary/10 text-primary",
              )}
            >
              Save
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
