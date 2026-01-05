import { useState } from "react";
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
import { LogOut, Settings, ArrowRightLeft, MessageSquareWarning } from "lucide-react";
import { getUserRoles, roleDashboardRoutes, roleLabels } from "@/lib/rbac";
import { supabase } from "@/integrations/supabase/client";

interface ProfileMenuProps {
  compact?: boolean;
}

const ProfileMenu = ({ compact = false }: ProfileMenuProps) => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const roles = getUserRoles(profile);
  const [selectedRole, setSelectedRole] = useState<string>(roles[0] || "patient");

  const handleRoleSwitch = (role: string) => {
    setSelectedRole(role);
    const dashboardRoute = roleDashboardRoutes[role] || "/dashboard";
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
          {compact ? "👤" : profile?.full_name || "Account"}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Signed in as
        </DropdownMenuLabel>

        <DropdownMenuItem onClick={() => navigate("/settings")}>
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
                {roleLabels[role as any] || role}
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
