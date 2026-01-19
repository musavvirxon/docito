// File: src/components/howItWorks/PublicMetricsStrip.tsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getHowItWorksMetrics, type HowItWorksMetrics } from "./useHowItWorksMetrics";
import { Users, Building2, CalendarCheck2 } from "lucide-react";

type State =
  | { status: "idle" | "loading"; data: null; error: null }
  | { status: "success"; data: HowItWorksMetrics; error: null }
  | { status: "error"; data: null; error: string };

function safeString(v: unknown, fallback: string) {
  return typeof v === "string" ? v : fallback;
}

function formatCompact(n: number) {
  const num = Number.isFinite(n) ? n : 0;
  if (num >= 1_000_000) return `${Math.round(num / 100_000) / 10}M`;
  if (num >= 10_000) return `${Math.round(num / 100) / 10}K`;
  return `${Math.max(0, Math.round(num))}`;
}

export default function PublicMetricsStrip() {
  const { t } = useTranslation(["howItWorks"]);
  const [state, setState] = useState<State>({ status: "loading", data: null, error: null });

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await getHowItWorksMetrics();
        if (!alive) return;
        setState({ status: "success", data, error: null });
      } catch (e) {
        if (!alive) return;
        setState({ status: "error", data: null, error: String(e) });
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const items = useMemo(
    () => [
      {
        key: "verified_doctors",
        icon: Users,
        title: safeString(t("howItWorks.metrics.verifiedDoctors", "Verified doctors"), "Verified doctors"),
        value:
          state.status === "success"
            ? formatCompact(state.data.verified_doctors)
            : safeString(t("howItWorks.metrics.fallbackDoctors", "—"), "—"),
      },
      {
        key: "verified_facilities",
        icon: Building2,
        title: safeString(t("howItWorks.metrics.verifiedFacilities", "Verified facilities"), "Verified facilities"),
        value:
          state.status === "success"
            ? formatCompact(state.data.verified_facilities)
            : safeString(t("howItWorks.metrics.fallbackFacilities", "—"), "—"),
      },
      {
        key: "appointments_7d",
        icon: CalendarCheck2,
        title: safeString(t("howItWorks.metrics.appointments7d", "Bookings (7d)"), "Bookings (7d)"),
        value:
          state.status === "success"
            ? formatCompact(state.data.appointments_7d)
            : safeString(t("howItWorks.metrics.fallbackBookings", "—"), "—"),
      },
    ],
    [state, t]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-4 rounded-3xl border-border/50 bg-muted/15">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="rounded-full">
              {safeString(t("howItWorks.metrics.badge", "Live signals"), "Live signals")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {state.status === "loading"
                ? safeString(t("howItWorks.metrics.loading", "Loading…"), "Loading…")
                : state.status === "error"
                ? safeString(t("howItWorks.metrics.unavailable", "Unavailable"), "Unavailable")
                : safeString(t("howItWorks.metrics.updated", "Updated"), "Updated")}
            </span>
          </div>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            {safeString(
              t(
                "howItWorks.metrics.subtitle",
                "A small, privacy-safe snapshot — designed to prove the network is active without exposing sensitive data."
              ),
              "A small, privacy-safe snapshot — designed to prove the network is active without exposing sensitive data."
            )}
          </p>

          {state.status === "error" ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {safeString(t("howItWorks.metrics.errorNote", "Metrics are optional — the page works without them."), "Metrics are optional — the page works without them.")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="lg:col-span-8 grid gap-4 sm:grid-cols-3">
        {items.map((it) => (
          <Card key={it.key} className="rounded-3xl border-border/50 bg-background/40 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <it.icon className="h-5 w-5" />
                </div>

                {state.status === "loading" ? (
                  <div className="h-4 w-14 rounded bg-muted/30 animate-pulse" />
                ) : (
                  <span className="text-2xl font-light tracking-tight">{it.value}</span>
                )}
              </div>

              <p className="mt-4 text-sm text-muted-foreground">{it.title}</p>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
                <div className="h-full w-1/2 rounded-full bg-primary/30" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
