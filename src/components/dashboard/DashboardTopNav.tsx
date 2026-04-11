// File: src/components/dashboard/DashboardTopNav.tsx
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ShieldCheck, Settings, LayoutDashboard } from "lucide-react";
import ThemeToggle from "@/components/home/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import ProfileMenu from "@/components/dashboard/ProfileMenu";
import { useDashboardTopBar } from "@/hooks/useDashboardTopBar";
import type { AppRole } from "@/lib/rbac";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

function verificationRouteForFacility(facilityType: string) {
  if (facilityType === "practice") return "/practice-verification";
  if (facilityType === "lab") return "/lab/verification";
  if (facilityType === "imaging") return "/imaging/verification";
  if (facilityType === "pharmacy") return "/pharmacy/verification";
  return "/practice-verification";
}

function settingsRouteForFacility(facilityType: string) {
  if (facilityType === "practice") return "/practice-settings";
  if (facilityType === "lab") return "/lab/settings";
  if (facilityType === "imaging") return "/imaging/settings";
  if (facilityType === "pharmacy") return "/pharmacy/settings";
  return "/";
}

function statusBadgeVariant(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "verified") return "default";
  if (s === "pending") return "secondary";
  if (s === "suspended") return "destructive";
  return "outline";
}

function canRequestVerification(status: string) {
  const s = String(status || "").toLowerCase();
  return s !== "verified" && s !== "suspended";
}

export default function DashboardTopNav(props: { role: AppRole; showSettings?: boolean }) {
  const { role, showSettings = true } = props;
  const nav = useNavigate();
  const { t } = useTranslation('dashboard');

  const { loading, entityName, entityStatus, unreadCount, facilityType, requestVerification } = useDashboardTopBar(role);

  const verificationRoute = useMemo(() => verificationRouteForFacility(facilityType), [facilityType]);
  const settingsRoute = useMemo(() => settingsRouteForFacility(facilityType), [facilityType]);

  const statusLabel = useMemo(() => {
    const s = String(entityStatus || "unknown").toLowerCase();
    if (s === "verified") return t("topNav.statusLabels.verified");
    if (s === "pending") return t("topNav.statusLabels.pending");
    if (s === "suspended") return t("topNav.statusLabels.suspended");
    if (s === "active") return t("topNav.statusLabels.active");
    return t("topNav.statusLabels.unknown");
  }, [entityStatus, t]);

  const badgeCount = Math.min(Math.max(0, unreadCount || 0), 99);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <LayoutDashboard className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold truncate">{entityName || t("topNav.dashboard")}</div>
            <div className="text-xs text-muted-foreground truncate">
              {loading ? t("topNav.loading") : facilityType === "none" ? t("topNav.platform") : facilityType}
            </div>
          </div>

          <Button variant="ghost" className="h-9 px-3" onClick={() => nav(verificationRoute)} title={t("topNav.verification")}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            {t("topNav.verification")}
            <Badge className="ml-2" variant={statusBadgeVariant(entityStatus)}>
              {statusLabel}
            </Badge>
          </Button>

          {canRequestVerification(entityStatus) ? (
            <Button
              variant="outline"
              className="h-9 px-3"
              onClick={async () => {
                try {
                  await requestVerification();
                  toast.success(t("topNav.verificationRequestSubmitted"));
                  nav(verificationRoute);
                } catch (e: any) {
                  toast.error(e?.message || t("topNav.verificationRequestFailed"));
                }
              }}
              title={t("topNav.requestReview")}
            >
              {t("topNav.requestReview")}
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <LanguageSwitcher />

          <Button asChild variant="ghost" size="icon" className="relative" title={t("topNav.notifications")}>
            <Link to="/notifications" aria-label={t("topNav.notifications")}>
              <Bell className="h-5 w-5" />
              {badgeCount > 0 ? (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                  {badgeCount}
                </span>
              ) : null}
            </Link>
          </Button>

          {showSettings && facilityType !== "none" ? (
            <Button asChild variant="ghost" className="h-9 px-3" title={t("topNav.settings")}>
              <Link to={settingsRoute}>
                <Settings className="h-4 w-4 mr-2" />
                {t("topNav.settings")}
              </Link>
            </Button>
          ) : null}

          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
