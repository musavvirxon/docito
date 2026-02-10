// src/components/dashboard/ProfileMenu.tsx
// File: src/components/dashboard/ProfileMenu.tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  Settings,
  ArrowRightLeft,
  MessageSquareWarning,
  User,
  LayoutDashboard,
  Shield,
} from "lucide-react";
import { DASHBOARD_ROUTES, getDashboardRoute, getUserRolesFromProfile, roleLabels, type AppRole } from "@/lib/rbac";

interface ProfileMenuProps {
  compact?: boolean;
}

const ProfileMenu = ({ compact = false }: ProfileMenuProps) => {
  const navigate = useNavigate();
  const { profile, user, allRoles, activeRole, switchRole, signOut } = useAuth();

  const roles: AppRole[] = useMemo(() => {
    const fromContext = Array.isArray(allRoles) ? allRoles : [];
    const fallback = getUserRolesFromProfile(profile);
    const merged = fromContext.length > 0 ? fromContext : fallback;
    return Array.from(new Set((merged || []).filter(Boolean) as AppRole[]));
  }, [allRoles, profile]);

  const canShowRoleSwitch = roles.length > 1;

  const effectiveActiveRole: AppRole = useMemo(() => {
    if (roles.length === 0) return activeRole;
    return roles.includes(activeRole) ? activeRole : roles[0];
  }, [activeRole, roles]);

  const dashboardRoute = useMemo(() => {
    if (roles.length > 0) return getDashboardRoute([effectiveActiveRole]);
    return "/dashboard";
  }, [effectiveActiveRole, roles.length]);

  const dashboardLabel = useMemo(() => {
    if (roles.length === 1) return `${roleLabels[roles[0]] || roles[0]} Dashboard`;
    return "Dashboard";
  }, [roles]);

  const superAdminRoute = useMemo(() => {
    return DASHBOARD_ROUTES.super_admin || getDashboardRoute(["super_admin"]);
  }, []);

  const showSuperAdminLink = useMemo(() => {
    return roles.includes("super_admin") && effectiveActiveRole !== "super_admin";
  }, [roles, effectiveActiveRole]);

  const handleRoleSwitch = (role: AppRole) => {
    switchRole(role);
    navigate(DASHBOARD_ROUTES[role] || getDashboardRoute([role]));
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={compact ? "ghost" : "outline"}
          size={compact ? "icon" : "sm"}
          className={compact ? "h-9 w-9 rounded-xl" : "h-9 rounded-full text-sm font-medium text-foreground"}
        >
          {compact ? <User className="h-4 w-4" /> : <span className="text-foreground">{profile?.full_name || "Account"}</span>}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Signed in as {profile?.full_name || user?.email}
        </DropdownMenuLabel>

        <DropdownMenuItem onClick={() => navigate(dashboardRoute)}>
          <LayoutDashboard className="mr-2 h-4 w-4" />
          {dashboardLabel}
        </DropdownMenuItem>

        {showSuperAdminLink ? (
          <DropdownMenuItem onClick={() => handleRoleSwitch("super_admin")}>
            <Shield className="mr-2 h-4 w-4" />
            Super Admin
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuItem onClick={() => navigate("/profile")}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigate("/dashboard/feedback")}>
          <MessageSquareWarning className="mr-2 h-4 w-4" />
          Bug / Feature Request
        </DropdownMenuItem>

        {canShowRoleSwitch ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Role</DropdownMenuLabel>

            {roles.map((role) => (
              <DropdownMenuItem
                key={role}
                onClick={() => handleRoleSwitch(role)}
                className={`flex items-center justify-between ${role === effectiveActiveRole ? "bg-accent/50" : ""}`}
              >
                <span className="flex items-center">
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  {roleLabels[role] || role}
                </span>
                {role === effectiveActiveRole ? <span className="text-xs text-muted-foreground">Current</span> : null}
              </DropdownMenuItem>
            ))}
          </>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileMenu;
