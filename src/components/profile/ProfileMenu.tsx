import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LogOut,
  Settings,
  LifeBuoy,
  User,
  LayoutDashboard,
  MessageSquareWarning,
  ChevronRight,
  Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { roleLabels, DASHBOARD_ROUTES, type AppRole } from "@/lib/rbac";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import SettingsDialog from "./SettingsDialog";

type ProfileMenuProps = {
  displayName?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
};

export default function ProfileMenu({ displayName, avatarUrl, email }: ProfileMenuProps) {
  const navigate = useNavigate();
  const { allRoles, activeRole, switchRole, signOut } = useAuth();
  const [openSettings, setOpenSettings] = React.useState(false);

  const name = displayName || email || "User";

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleRoleSwitch = (role: AppRole) => {
    switchRole(role);
    const target = DASHBOARD_ROUTES[role] || "/dashboard";
    navigate(target, { replace: true });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarUrl || undefined} alt={name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {/* Header: name + email + active role */}
          <div className="px-3 py-2">
            <p className="text-sm font-medium leading-none text-foreground">{name}</p>
            {email && <p className="text-xs text-muted-foreground mt-1 truncate">{email}</p>}
            <p className="text-xs text-primary mt-1 font-medium">
              {roleLabels[activeRole] || activeRole}
            </p>
          </div>

          <DropdownMenuSeparator />

          {/* Dashboard */}
          <DropdownMenuItem asChild>
            <Link to="/dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>

          {/* Profile */}
          <DropdownMenuItem asChild>
            <Link to="/profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>

          {/* Settings */}
          <DropdownMenuItem onClick={() => setOpenSettings(true)} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </DropdownMenuItem>

          {/* Feedback / Bug Report */}
          <DropdownMenuItem asChild>
            <Link to="/feedback" className="flex items-center gap-2">
              <MessageSquareWarning className="h-4 w-4" />
              Feedback & Bug Report
            </Link>
          </DropdownMenuItem>

          {/* Help */}
          <DropdownMenuItem asChild>
            <Link to="/help" className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4" />
              Help
            </Link>
          </DropdownMenuItem>

          {/* Role Switcher — only if multiple roles */}
          {allRoles.length > 1 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Switch Role
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {allRoles.map((role) => (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => handleRoleSwitch(role)}
                      className="flex items-center justify-between gap-2"
                    >
                      <span>{roleLabels[role] || role}</span>
                      {role === activeRole && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}

          <DropdownMenuSeparator />

          {/* Sign out */}
          <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-destructive">
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsDialog open={openSettings} onOpenChange={setOpenSettings} />
    </>
  );
}