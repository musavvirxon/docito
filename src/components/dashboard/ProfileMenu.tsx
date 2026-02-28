// src/components/dashboard/ProfileMenu.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
  Building2,
} from "lucide-react";
import { DASHBOARD_ROUTES, getDashboardRoute, roleLabels, normalizeRole, type AppRole } from "@/lib/rbac";

interface ProfileMenuProps {
  compact?: boolean;
}

const ProfileMenu = React.forwardRef<HTMLDivElement, ProfileMenuProps>(({ compact = false }, ref) => {
  const navigate = useNavigate();
  const { profile, user, allRoles, activeRole, switchRole, signOut } = useAuth();
  const [practiceName, setPracticeName] = useState<string | null>(null);

  const roles: AppRole[] = useMemo(() => {
    const metaRole = (normalizeRole((user as any)?.user_metadata?.role) || null) as AppRole | null;
    const merged = [
      ...(Array.isArray(allRoles) ? allRoles : []),
      ...(metaRole ? [metaRole] : []),
      activeRole || "patient",
    ]
      .map((r) => normalizeRole(r))
      .filter(Boolean) as AppRole[];

    const deduped = Array.from(new Set(merged));
    return deduped.length > 0 ? deduped : ["patient"];
  }, [allRoles, activeRole, user?.id]);

  // Fetch practice name for admin/staff users
  const isAdminOrStaff = roles.includes("admin") || roles.includes("staff");
  useEffect(() => {
    if (!isAdminOrStaff || !user?.id) {
      setPracticeName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      // Try admin_id first
      const { data: owned } = await supabase
        .from("practices")
        .select("name")
        .eq("admin_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (owned?.name) { setPracticeName(owned.name); return; }

      // Try clinic_staff
      const { data: staffRow } = await supabase
        .from("clinic_staff")
        .select("practice_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (staffRow?.practice_id) {
        const { data: p } = await supabase
          .from("practices")
          .select("name")
          .eq("id", staffRow.practice_id)
          .maybeSingle();
        if (!cancelled && p?.name) setPracticeName(p.name);
      }
    })();
    return () => { cancelled = true; };
  }, [isAdminOrStaff, user?.id]);

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
    navigate("/");
  };

  return (
    <DropdownMenu>
      {/* ref anchor for parent forwardRef */}
      <DropdownMenuTrigger asChild>
        <Button
          variant={compact ? "ghost" : "outline"}
          size={compact ? "icon" : "sm"}
          className={compact ? "h-9 w-9 rounded-xl" : "h-9 rounded-full text-sm font-medium text-foreground"}
        >
          {compact ? <User className="h-4 w-4" /> : <span className="text-foreground">{profile?.full_name || user?.user_metadata?.full_name || user?.email || "Account"}</span>}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">{profile?.full_name || user?.user_metadata?.full_name || user?.email || "Account"}</span>
          <span className="text-xs text-muted-foreground">{user?.email}</span>
          {practiceName && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3" />
              {practiceName}
            </span>
          )}
          {roles.length > 0 && (
            <span className="text-xs text-primary font-medium mt-0.5">
              {roleLabels[effectiveActiveRole] || effectiveActiveRole}
            </span>
          )}
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
});
ProfileMenu.displayName = "ProfileMenu";

export default ProfileMenu;
