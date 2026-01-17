// File: src/components/dashboard/DashboardTopBar.tsx

import { Badge } from "@/components/ui/badge";
import ProfileMenu from "./ProfileMenu";
import { AppRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/home/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useDashboardTopBar, type EntityStatus } from "@/hooks/useDashboardTopBar";

interface DashboardTopBarProps {
  entityName?: string;
  entityStatus?: EntityStatus;
  role: AppRole;
}

const statusColors: Record<EntityStatus, string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/30",
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  verified: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  suspended: "bg-red-500/10 text-red-600 border-red-500/30",
};

const statusLabels: Record<EntityStatus, string> = {
  active: "Active",
  pending: "Pending",
  verified: "Verified",
  suspended: "Suspended",
};

const roleLabels: Record<string, string> = {
  doctor: "Doctor",
  patient: "Patient",
  clinic_admin: "Clinic Admin",
  admin: "Clinic Admin",
  pharmacy_admin: "Pharmacy Admin",
  lab_admin: "Lab Admin",
  imaging_admin: "Imaging Admin",
  super_admin: "Super Admin",
  pharmacy_staff: "Pharmacy Staff",
  pharmacist: "Pharmacist",
  lab_staff: "Lab Staff",
  lab_technician: "Lab Technician",
  imaging_staff: "Imaging Staff",
  internal_imaging_tech: "Imaging Tech",
  clinic_staff: "Clinic Staff",
  staff: "Staff",
  receptionist: "Receptionist",
  nurse: "Nurse",
};

function getVerificationRouteByRole(role: AppRole) {
  if (role === "lab_admin" || role === "lab_staff" || role === "lab_technician") return "/lab/verification";
  if (role === "pharmacy_admin" || role === "pharmacy_staff" || role === "pharmacist") return "/pharmacy/verification";
  if (role === "imaging_admin" || role === "imaging_staff" || role === "internal_imaging_tech") return "/imaging/verification";
  if (role === "admin" || role === "clinic_admin") return "/dashboard/verify";
  if (role === "clinic_staff" || role === "staff" || role === "receptionist" || role === "nurse") return "/dashboard/verify";
  return "/dashboard/verify";
}

export function DashboardTopBar({ entityName, entityStatus = "active", role }: DashboardTopBarProps) {
  const navigate = useNavigate();

  // If caller doesn't pass entity info (e.g. StaffDashboard), fetch it from backend (Edge Function).
  const ctx = useDashboardTopBar(role);

  const finalEntityName = entityName ?? ctx.entityName;
  const finalStatus = (entityStatus ?? ctx.entityStatus) as EntityStatus;
  const unreadCount = ctx.unreadCount;

  const handleVerificationClick = () => {
    navigate(getVerificationRouteByRole(role));
  };

  const badgeCount = Math.min(unreadCount, 99);

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {finalEntityName ? <h1 className="text-lg font-semibold truncate">{finalEntityName}</h1> : null}

          <button
            type="button"
            onClick={handleVerificationClick}
            className="focus:outline-none"
            aria-label="Open verification page"
          >
            <Badge
              variant="outline"
              className={cn("shrink-0 cursor-pointer hover:opacity-90 transition", statusColors[finalStatus])}
            >
              {statusLabels[finalStatus]}
            </Badge>
          </button>

          <Badge variant="secondary" className="shrink-0 hidden sm:flex">
            {roleLabels[role] || role}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />

          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/notifications")} aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {badgeCount > 0 ? (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                {badgeCount}
              </span>
            ) : null}
          </Button>

          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
