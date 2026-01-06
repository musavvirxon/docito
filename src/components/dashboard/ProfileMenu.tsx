import { useState, useEffect } from "react";
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
import { LogOut, Settings, ArrowRightLeft, MessageSquareWarning, User } from "lucide-react";
import { getUserRolesFromProfile, roleLabels, DASHBOARD_ROUTES, AppRole } from "@/lib/rbac";
import { supabase } from "@/integrations/supabase/client";

interface ProfileMenuProps {
  compact?: boolean;
}

const ProfileMenu = ({ compact = false }: ProfileMenuProps) => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<AppRole>("patient");

  useEffect(() => {
    const userRoles = getUserRolesFromProfile(profile);
    setRoles(userRoles);
    if (userRoles.length > 0) {
      setSelectedRole(userRoles[0]);
    }
  }, [profile]);

  const handleRoleSwitch = (role: AppRole) => {
    setSelectedRole(role);
    const dashboardRoute = DASHBOARD_ROUTES[role] || "/dashboard";
    navigate(dashboardRoute);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const canShowRoleSwitch = roles.length > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={compact ? "ghost" : "outline"}
          size={compact ? "icon" : "sm"}
          className={compact ? "h-9 w-9 rounded-xl" : "h-9 rounded-full"}
        >
          {compact ? <User className="h-4 w-4" /> : profile?.full_name || "Account"}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Signed in as {profile?.full_name || user?.email}
        </DropdownMenuLabel>

        <DropdownMenuItem onClick={() => navigate("/profile")}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigate("/dashboard/feedback")}>
          <MessageSquareWarning className="mr-2 h-4 w-4" />
          Bug / Feature Request
        </DropdownMenuItem>

        {canShowRoleSwitch && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch Role
            </DropdownMenuLabel>

            {roles.map((role) => (
              <DropdownMenuItem
                key={role}
                onClick={() => handleRoleSwitch(role)}
                className={role === selectedRole ? "bg-accent/50" : ""}
              >
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                {roleLabels[role] || role}
              </DropdownMenuItem>
            ))}
          </>
        )}

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
