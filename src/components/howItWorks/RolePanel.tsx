// File: src/components/howItWorks/RolePanel.tsx
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import FadeIn from "./FadeIn";
import { ShieldCheck, KeyRound } from "lucide-react";

export type RolePanelData = {
  roleId: string;
  roleLabelKey: string;
  roleLabelFallback: string;

  whatYouDo: { key: string; fallback: string }[];
  automates: { key: string; fallback: string }[];
  features: { titleKey: string; titleFallback: string; descKey: string; descFallback: string }[];

  dashboard: {
    titleKey: string;
    titleFallback: string;
    widgets: { labelKey: string; labelFallback: string; lines?: number }[];
  };

  trust: { key: string; fallback: string }[];
};

function safeString(v: unknown, fallback: string) {
  return typeof v === "string" ? v : fallback;
}

export default function RolePanel({ data }: { data: RolePanelData }) {
  const { t } = useTranslation(["howItWorks"]);

  const whatYouDoTitle = safeString(t("howItWorks.rolePanel.whatYouDoTitle", "What you do in Docito"), "What you do in Docito");
  const automatesTitle = safeString(t("howItWorks.rolePanel.automatesTitle", "What Docito automates"), "What Docito automates");
  const featuresTitle = safeString(t("howItWorks.rolePanel.featuresTitle", "Key features"), "Key features");
  const dashboardTitle = safeString(
    t("howItWorks.rolePanel.dashboardPreviewTitle", "Dashboard preview"),
    "Dashboard preview"
  );
  const trustTitle = safeString(t("howItWorks.rolePanel.trustTitle", "Trust & permissions"), "Trust & permissions");

  return (
    <FadeIn rootMargin="100px">
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full">
            {safeString(t(data.roleLabelKey, data.roleLabelFallback), data.roleLabelFallback)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {safeString(t("howItWorks.roles.subtitle", "What you see, what you do, and what Docito handles for you."), "What you see, what you do, and what Docito handles for you.")}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-3xl border-border/50 bg-background/40 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">{whatYouDoTitle}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {data.whatYouDo.map((x) => (
                  <li key={x.key} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/60" />
                    <span>{safeString(t(x.key, x.fallback), x.fallback)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/50 bg-background/40 backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">{automatesTitle}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {data.automates.map((x) => (
                  <li key={x.key} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/60" />
                    <span>{safeString(t(x.key, x.fallback), x.fallback)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-light">{featuresTitle}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.features.map((f) => (
              <Card key={f.titleKey} className="rounded-3xl border-border/50 bg-muted/15">
                <CardContent className="p-6">
                  <p className="text-sm font-medium">
                    {safeString(t(f.titleKey, f.titleFallback), f.titleFallback)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {safeString(t(f.descKey, f.descFallback), f.descFallback)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="rounded-3xl border-border/50 bg-background/40 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">{dashboardTitle}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-muted/10 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {safeString(t(data.dashboard.titleKey, data.dashboard.titleFallback), data.dashboard.titleFallback)}
                  </p>
                  <span className="text-xs text-muted-foreground">{safeString(t("howItWorks.dashboard.previewNote", "Vector UI mock"), "Vector UI mock")}</span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {data.dashboard.widgets.map((w) => (
                    <div key={w.labelKey} className="rounded-2xl border border-border/40 bg-background/40 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">
                          {safeString(t(w.labelKey, w.labelFallback), w.labelFallback)}
                        </p>
                        <span className="h-2 w-2 rounded-full bg-primary/40" />
                      </div>
                      <div className="mt-3 space-y-2">
                        {Array.from({ length: w.lines ?? 3 }).map((_, i) => (
                          <div key={i} className="h-2 rounded bg-muted/40" style={{ width: `${86 - i * 12}%` }} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-border/50 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                    {safeString(t("howItWorks.dashboard.tag1", "Work queues"), "Work queues")}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border/50 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                    {safeString(t("howItWorks.dashboard.tag2", "Tasks & approvals"), "Tasks & approvals")}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border/50 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                    {safeString(t("howItWorks.dashboard.tag3", "Audit-ready"), "Audit-ready")}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-muted/10 p-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">{trustTitle}</p>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {data.trust.map((x) => (
                    <li key={x.key} className="flex gap-3">
                      <KeyRound className="mt-0.5 h-4 w-4 text-primary/70" />
                      <span>{safeString(t(x.key, x.fallback), x.fallback)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}
