import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DASHBOARD_ROUTES, type AppRole, PATIENT_DASHBOARD_ROUTE } from "@/lib/rbac";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, ArrowRightLeft, User } from "lucide-react";

const roleLabel = (r: string) =>
  r.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function ProfileAvatarMenu({
  showRoleSwitch = true,
  showPatientPortal = true,
}: {
  showRoleSwitch?: boolean;
  showPatientPortal?: boolean;
}) {
  const nav = useNavigate();
  const { profile, allRoles, activeRole, switchRole, signOut, roleStatus } = useAuth();

  const initials = useMemo(() => {
    const name = profile?.full_name || "User";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile?.full_name]);

  const roles = (allRoles?.length ? allRoles : ["patient"]) as AppRole[];

  const doSwitch = (r: AppRole) => {
    switchRole(r);
    const route = DASHBOARD_ROUTES[r] || PATIENT_DASHBOARD_ROUTE;
    nav(route);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 w-9 rounded-full p-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72" align="end">
        <div className="px-3 py-2">
          <div className="text-sm font-semibold">{profile?.full_name || "Account"}</div>
          <div className="text-xs text-muted-foreground">{profile?.email}</div>
          <div className="mt-2 text-xs">
            Active role: <span className="font-medium">{roleLabel(activeRole)}</span>
          </div>
          {roleStatus?.[activeRole] && roleStatus[activeRole] !== "verified" && (
            <div className="mt-1 text-xs text-amber-600">
              {roleLabel(activeRole)} is {roleStatus[activeRole]}
            </div>
          )}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => nav("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>

        {showPatientPortal && (
          <DropdownMenuItem onClick={() => nav("/patient-dashboard")}>
            <User className="mr-2 h-4 w-4" />
            Patient Portal
          </DropdownMenuItem>
        )}

        {showRoleSwitch && roles.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Switch role
            </div>
            {roles.map((r) => (
              <DropdownMenuItem key={r} onClick={() => doSwitch(r)}>
                <span className="flex-1">{roleLabel(r)}</span>
                {r === activeRole ? <span className="text-xs text-primary">Active</span> : null}
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
