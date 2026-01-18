// File: src/components/dashboard/DashboardTopNav.tsx
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ShieldCheck, Settings, LayoutDashboard } from "lucide-react";
import { useDashboardTopBar } from "@/hooks/useDashboardTopBar";
import type { AppRole } from "@/lib/rbac";
import { toast } from "sonner";

function verificationRouteForFacility(facilityType: string) {
  if (facilityType === "practice") return "/dashboard/verify";
  if (facilityType === "lab") return "/lab/verification";
  if (facilityType === "imaging") return "/imaging/verification";
  if (facilityType === "pharmacy") return "/pharmacy/verification";
  return "/dashboard/verify";
}

function settingsRouteForFacility(facilityType: string) {
  if (facilityType === "practice") return "/dashboard/settings";
  if (facilityType === "lab") return "/lab/settings";
  if (facilityType === "imaging") return "/imaging/settings";
  if (facilityType === "pharmacy") return "/pharmacy/settings";
  return "/dashboard/settings";
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

  return (
    <div className="w-full border-b bg-background">
      <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <LayoutDashboard className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold truncate">{entityName || "Dashboard"}</div>
            <div className="text-xs text-muted-foreground truncate">
              {loading ? "Loading…" : facilityType === "none" ? "Platform" : facilityType}
            </div>
          </div>

          <Button
            variant="ghost"
            className="h-9 px-3"
            onClick={() => nav(verificationRoute)}
            title="Open verification page"
          >
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
          <Button asChild variant="ghost" className="h-9 px-3" title="Notifications">
            <Link to="/notifications">
              <Bell className="h-4 w-4 mr-2" />
              {unreadCount > 0 ? (
                <Badge variant="default" className="ml-1">
                  {unreadCount}
                </Badge>
              ) : (
                <span className="text-sm">Notifications</span>
              )}
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
        </div>
      </div>
    </div>
  );
}
