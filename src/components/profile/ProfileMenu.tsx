import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings, LifeBuoy, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  const { toast } = useToast();
  const [openSettings, setOpenSettings] = React.useState(false);

  const initials =
    (displayName || email || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: "destructive", title: "Sign out failed", description: error.message });
      return;
    }
    navigate("/auth");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarUrl || undefined} alt={displayName || "User"} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <div className="px-3 py-2">
            <p className="text-sm font-medium leading-none">{displayName || "Account"}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{email || ""}</p>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link to="/dashboard" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setOpenSettings(true)} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link to="/help" className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4" />
              Help
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-destructive">
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsDialog open={openSettings} onOpenChange={setOpenSettings} />
    </>
  );
}
