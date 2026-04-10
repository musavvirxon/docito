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

  const { loading, entityName, entityStatus, unreadCount, facilityType, requestVerification } = useDashboardTopBar(role);

  const verificationRoute = useMemo(() => verificationRouteForFacility(facilityType), [facilityType]);
  const settingsRoute = useMemo(() => settingsRouteForFacility(facilityType), [facilityType]);

  const statusLabel = useMemo(() => {
    const s = String(entityStatus || "unknown").toLowerCase();
    if (s === "verified") return "Verified";
    if (s === "pending") return "Pending";
    if (s === "suspended") return "Suspended";
    if (s === "active") return "Active";
    return "Unknown";
  }, [entityStatus]);

  const badgeCount = Math.min(Math.max(0, unreadCount || 0), 99);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <LayoutDashboard className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold truncate">{entityName || "Dashboard"}</div>
            <div className="text-xs text-muted-foreground truncate">
              {loading ? "Loading…" : facilityType === "none" ? "Platform" : facilityType}
            </div>
          </div>

          <Button variant="ghost" className="h-9 px-3" onClick={() => nav(verificationRoute)} title="Open verification page">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Verification
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
                  toast.success("Verification request submitted");
                  nav(verificationRoute);
                } catch (e: any) {
                  toast.error(e?.message || "Failed to request verification");
                }
              }}
              title="Request verification review"
            >
              Request review
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <LanguageSwitcher />

          <Button asChild variant="ghost" size="icon" className="relative" title="Notifications">
            <Link to="/notifications" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {badgeCount > 0 ? (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                  {badgeCount}
                </span>
              ) : null}
            </Link>
          </Button>

          {showSettings && facilityType !== "none" ? (
            <Button asChild variant="ghost" className="h-9 px-3" title="Settings">
              <Link to={settingsRoute}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          ) : null}

          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
