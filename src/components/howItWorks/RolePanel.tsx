import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Reveal from "./Reveal";
import { ShieldCheck, Lock, ClipboardList, LayoutDashboard } from "lucide-react";

export type RolePanelContent = {
  whatYouDo: string[];
  automates: string[];
  features: Array<{ title: string; desc: string }>;
  trust: string;
};

function safeArray(v: unknown, fallback: string[]): string[] {
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v as string[];
  return fallback;
}

export default function RolePanel({
  title,
  content,
  whatYouDoTitle,
  automatesTitle,
  featuresTitle,
  dashboardPreviewTitle,
  trustTitle,
  loading = false,
}: {
  title: string;
  content: RolePanelContent;
  whatYouDoTitle: string;
  automatesTitle: string;
  featuresTitle: string;
  dashboardPreviewTitle: string;
  trustTitle: string;
  loading?: boolean;
}) {
  const whatYouDo = safeArray(content.whatYouDo, []);
  const automates = safeArray(content.automates, []);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7 space-y-6">
        <Reveal>
          <Card className="rounded-3xl border-border/50 bg-background/40 backdrop-blur p-6 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div className="text-base font-medium">{whatYouDoTitle}</div>
              <Badge variant="secondary" className="rounded-full">
                {title}
              </Badge>
            </div>

            {loading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-4 w-3/6" />
              </div>
            ) : (
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground leading-relaxed">
                {whatYouDo.map((x, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70 flex-shrink-0" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Reveal>

        <Reveal delay={0.03}>
          <Card className="rounded-3xl border-border/50 bg-background/40 backdrop-blur p-6 sm:p-7">
            <div className="flex items-center gap-2 text-base font-medium">
              <ClipboardList className="h-4 w-4 text-primary" />
              {automatesTitle}
            </div>

            {loading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-4 w-3/6" />
              </div>
            ) : (
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground leading-relaxed">
                {automates.map((x, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70 flex-shrink-0" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Reveal>

        <Reveal delay={0.05}>
          <div>
            <div className="mb-4 text-base font-medium">{featuresTitle}</div>
            <div className="grid gap-4 sm:grid-cols-2">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <Card
                      key={i}
                      className="rounded-3xl border-border/50 bg-background/40 backdrop-blur p-6"
                    >
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="mt-3 h-4 w-full" />
                      <Skeleton className="mt-2 h-4 w-5/6" />
                    </Card>
                  ))
                : content.features.map((f, i) => (
                    <Card
                      key={i}
                      className="rounded-3xl border-border/50 bg-background/40 backdrop-blur p-6 shadow-sm"
                    >
                      <div className="text-sm font-medium text-foreground">{f.title}</div>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </Card>
                  ))}
            </div>
          </div>
        </Reveal>
      </div>

      <div className="lg:col-span-5 space-y-6">
        <Reveal>
          <Card className="rounded-3xl border-border/50 bg-background/40 backdrop-blur p-6 sm:p-7 shadow-sm">
            <div className="flex items-center gap-2 text-base font-medium">
              <LayoutDashboard className="h-4 w-4 text-primary" />
              {dashboardPreviewTitle}
            </div>

            <div className="mt-5 rounded-2xl border border-border/50 bg-background/60 p-5">
              <DashboardPreviewMock title={title} loading={loading} />
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.04}>
          <Card className="rounded-3xl border-border/50 bg-muted/20 p-6 sm:p-7">
            <div className="flex items-center gap-2 text-base font-medium">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {trustTitle}
            </div>

            {loading ? (
              <div className="mt-4 space-y-3">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{content.trust}</p>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-3 py-1 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                RBAC
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-3 py-1 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Audit trails
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-3 py-1 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Scoped sharing
              </span>
            </div>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}

function DashboardPreviewMock({
  title,
  loading,
}: {
  title: string;
  loading?: boolean;
}) {
  // Generate mock dashboard rows based on role
  const rows = [
    { k: "Today's appointments", v: "12", tag: "Active" },
    { k: "Pending actions", v: "3" },
    { k: "New messages", v: "5" },
    { k: "Completed this week", v: "47" },
    { k: "Overall rating", v: "4.9" },
  ];

  return (
    <div className="select-none">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-foreground">{title} Dashboard</div>
        <span className="text-xs text-muted-foreground">Docito</span>
      </div>

      <div className="mt-4 grid gap-2">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-2"
              >
                <div className="w-1/2">
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="w-1/3 flex justify-end">
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))
          : rows.map((r) => (
              <div
                key={r.k}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-2"
              >
                <div className="text-xs text-muted-foreground">{r.k}</div>
                <div className="flex items-center gap-2">
                  {r.tag ? (
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                      {r.tag}
                    </span>
                  ) : null}
                  <div className="text-xs text-foreground">{r.v}</div>
                </div>
              </div>
            ))}
      </div>

      <div className="mt-4 rounded-xl border border-border/40 bg-background/50 p-3">
        <svg viewBox="0 0 420 56" className="w-full h-auto" aria-hidden>
          <rect x="0" y="0" width="420" height="56" rx="12" fill="hsl(var(--muted) / 0.25)" />
          <rect x="16" y="16" width="140" height="8" rx="4" fill="hsl(var(--foreground) / 0.12)" />
          <rect x="16" y="32" width="220" height="8" rx="4" fill="hsl(var(--foreground) / 0.08)" />
          <rect x="320" y="18" width="84" height="20" rx="10" fill="hsl(var(--primary) / 0.18)" />
        </svg>
      </div>
    </div>
  );
}
