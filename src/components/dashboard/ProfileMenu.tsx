import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DASHBOARD_ROUTES, type AppRole } from "@/lib/rbac";
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

const roleLabel = (r: string) => r.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function ProfileMenu() {
  const nav = useNavigate();
  const { profile, allRoles, activeRole, switchRole, signOut, roleStatus } = useAuth();

  const initials = useMemo(() => {
    const name = profile?.full_name || "User";
    return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  }, [profile?.full_name]);

  const available = allRoles ?? ["patient"];

  const doSwitch = (r: AppRole) => {
    switchRole(r);
    const route = DASHBOARD_ROUTES[r] || "/patient-dashboard";
    nav(route);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 px-2 gap-2 justify-start">
          <Avatar className="h-7 w-7">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{profile?.full_name || "Account"}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" align="start">
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

        <DropdownMenuItem onClick={() => nav("/patient-dashboard")}>
          <User className="mr-2 h-4 w-4" />
          Patient Portal
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          Switch role
        </div>

        {available.length > 1 && (
  <>
    <DropdownMenuSeparator />

    <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
      <ArrowRightLeft className="h-4 w-4" />
      Switch role
    </div>

    {available.map((r) => (
      <DropdownMenuItem key={r} onClick={() => doSwitch(r as AppRole)}>
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
