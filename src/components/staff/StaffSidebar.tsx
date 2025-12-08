import { 
  Home, Calendar, Users, DollarSign, Clock, Settings, 
  LogOut, Building2, ClipboardList, FileText, Stethoscope 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import type { StaffPermissions, PracticeInfo } from "@/hooks/useStaffDashboard";

interface StaffSidebarProps {
  permissions: StaffPermissions | null;
  practice: PracticeInfo | null;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const ROLE_LABELS: Record<string, string> = {
  receptionist: 'Receptionist',
  nurse: 'Nurse',
  billing_manager: 'Billing Manager',
  assistant: 'Assistant',
  technician: 'Technician',
  hygienist: 'Hygienist',
  manager: 'Manager',
  other: 'Staff',
};

export const StaffSidebar = ({ 
  permissions, 
  practice, 
  activeSection, 
  onSectionChange 
}: StaffSidebarProps) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: Home, 
      visible: true 
    },
    { 
      id: 'today', 
      label: "Today's Schedule", 
      icon: Clock, 
      visible: permissions?.can_view_schedule 
    },
    { 
      id: 'appointments', 
      label: 'Appointments', 
      icon: Calendar, 
      visible: permissions?.can_view_schedule 
    },
    { 
      id: 'patients', 
      label: 'Patients', 
      icon: Users, 
      visible: permissions?.can_manage_patients 
    },
    { 
      id: 'vitals', 
      label: 'Vitals & Notes', 
      icon: Stethoscope, 
      visible: permissions?.can_view_medical_records 
    },
    { 
      id: 'billing', 
      label: 'Billing & Payments', 
      icon: DollarSign, 
      visible: permissions?.can_manage_billing 
    },
    { 
      id: 'intake', 
      label: 'Patient Intake', 
      icon: ClipboardList, 
      visible: permissions?.can_book_appointments 
    },
    { 
      id: 'records', 
      label: 'Medical Records', 
      icon: FileText, 
      visible: permissions?.can_view_medical_records 
    },
  ].filter(item => item.visible);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full">
      {/* Practice Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground truncate">
              {practice?.name || 'Loading...'}
            </h2>
            <Badge variant="secondary" className="text-xs">
              {ROLE_LABELS[permissions?.staff_role || 'other']}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  activeSection === item.id && "bg-primary/10 text-primary"
                )}
                onClick={() => onSectionChange(item.id)}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </nav>

      <Separator />

      {/* User Profile */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback>
              {profile?.full_name?.charAt(0) || 'S'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {profile?.full_name || 'Staff Member'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.email}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onSectionChange('settings')}
          >
            <Settings className="w-4 h-4 mr-1" />
            Settings
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
