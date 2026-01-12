import { 
  Home, Calendar, Users, DollarSign, Clock, Settings, 
  LogOut, Building2, ClipboardList, FileText, Stethoscope,
  Pill, FlaskConical, ScanLine, Package, TestTube, Image as ImageIcon,
  Microscope, Syringe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DashboardBranding } from "@/components/dashboard/DashboardBranding";
import type { 
  StaffType, 
  EntityInfo, 
  StaffPermissions,
  ClinicPermissions,
  PharmacyPermissions,
  LabPermissions,
  ImagingPermissions 
} from "@/hooks/useStaffContext";

interface StaffSidebarProps {
  staffType: StaffType;
  entityInfo: EntityInfo | null;
  permissions: StaffPermissions | null;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const STAFF_TYPE_LABELS: Record<StaffType, string> = {
  clinic: 'Clinic',
  pharmacy: 'Pharmacy',
  lab: 'Laboratory',
  imaging: 'Imaging Center',
  unknown: 'Organization',
};

const STAFF_TYPE_ICONS: Record<StaffType, typeof Building2> = {
  clinic: Building2,
  pharmacy: Pill,
  lab: FlaskConical,
  imaging: ScanLine,
  unknown: Building2,
};

const ROLE_LABELS: Record<string, string> = {
  // Clinic roles
  receptionist: 'Receptionist',
  nurse: 'Nurse',
  billing_manager: 'Billing Manager',
  assistant: 'Assistant',
  technician: 'Technician',
  hygienist: 'Hygienist',
  manager: 'Manager',
  clinic_staff: 'Clinic Staff',
  clinic_admin: 'Clinic Admin',
  // Pharmacy roles
  pharmacist: 'Pharmacist',
  pharmacy_staff: 'Pharmacy Staff',
  pharmacy_admin: 'Pharmacy Admin',
  pharmacy_tech: 'Pharmacy Tech',
  // Lab roles
  lab_technician: 'Lab Technician',
  lab_staff: 'Lab Staff',
  lab_admin: 'Lab Admin',
  internal_lab_tech: 'Lab Technician',
  // Imaging roles
  imaging_staff: 'Imaging Staff',
  imaging_admin: 'Imaging Admin',
  internal_imaging_tech: 'Imaging Tech',
  radiologist: 'Radiologist',
  // Default
  staff: 'Staff',
  other: 'Staff',
};

// Menu items for clinic staff
const getClinicMenuItems = (perms: ClinicPermissions) => [
  { id: 'dashboard', label: 'Dashboard', icon: Home, visible: true },
  { id: 'today', label: "Today's Schedule", icon: Clock, visible: perms.can_view_schedule },
  { id: 'appointments', label: 'Appointments', icon: Calendar, visible: perms.can_view_schedule },
  { id: 'patients', label: 'Patients', icon: Users, visible: perms.can_manage_patients },
  { id: 'vitals', label: 'Vitals & Notes', icon: Stethoscope, visible: perms.can_view_medical_records },
  { id: 'billing', label: 'Billing & Payments', icon: DollarSign, visible: perms.can_manage_billing },
  { id: 'intake', label: 'Patient Intake', icon: ClipboardList, visible: perms.can_book_appointments },
  { id: 'records', label: 'Medical Records', icon: FileText, visible: perms.can_view_medical_records },
];

// Menu items for pharmacy staff
const getPharmacyMenuItems = (perms: PharmacyPermissions) => [
  { id: 'dashboard', label: 'Dashboard', icon: Home, visible: true },
  { id: 'prescriptions', label: 'Prescriptions', icon: ClipboardList, visible: true },
  { id: 'dispensing', label: 'Dispensing Queue', icon: Pill, visible: perms.can_dispense },
  { id: 'inventory', label: 'Inventory', icon: Package, visible: perms.can_manage_inventory },
  { id: 'orders', label: 'Orders', icon: FileText, visible: perms.can_process_prescriptions },
  { id: 'patients', label: 'Patient History', icon: Users, visible: true },
];

// Menu items for lab staff
const getLabMenuItems = (perms: LabPermissions) => [
  { id: 'dashboard', label: 'Dashboard', icon: Home, visible: true },
  { id: 'orders', label: 'Lab Orders', icon: ClipboardList, visible: true },
  { id: 'samples', label: 'Sample Collection', icon: TestTube, visible: perms.can_process_samples },
  { id: 'processing', label: 'Processing', icon: FlaskConical, visible: perms.can_process_samples },
  { id: 'results', label: 'Results', icon: FileText, visible: perms.can_upload_results },
  { id: 'verification', label: 'Verification', icon: Microscope, visible: perms.can_verify_results },
  { id: 'equipment', label: 'Equipment', icon: Syringe, visible: perms.can_manage_equipment },
];

// Menu items for imaging staff
const getImagingMenuItems = (perms: ImagingPermissions) => [
  { id: 'dashboard', label: 'Dashboard', icon: Home, visible: true },
  { id: 'orders', label: 'Imaging Orders', icon: ClipboardList, visible: perms.can_view_orders },
  { id: 'scans', label: 'Scan Queue', icon: ScanLine, visible: perms.can_process_scans },
  { id: 'processing', label: 'Processing', icon: ImageIcon, visible: perms.can_process_scans },
  { id: 'results', label: 'Results Upload', icon: FileText, visible: perms.can_upload_results },
  { id: 'verification', label: 'Report Verification', icon: Microscope, visible: perms.can_verify_results },
  { id: 'equipment', label: 'Equipment', icon: Syringe, visible: perms.can_manage_equipment },
];

export const StaffSidebar = ({ 
  staffType,
  entityInfo,
  permissions, 
  activeSection, 
  onSectionChange 
}: StaffSidebarProps) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  // Get menu items based on staff type
  const getMenuItems = () => {
    if (!permissions) return [{ id: 'dashboard', label: 'Dashboard', icon: Home, visible: true }];

    switch (staffType) {
      case 'clinic':
        return getClinicMenuItems(permissions as ClinicPermissions & { staffType: 'clinic' });
      case 'pharmacy':
        return getPharmacyMenuItems(permissions as PharmacyPermissions & { staffType: 'pharmacy' });
      case 'lab':
        return getLabMenuItems(permissions as LabPermissions & { staffType: 'lab' });
      case 'imaging':
        return getImagingMenuItems(permissions as ImagingPermissions & { staffType: 'imaging' });
      default:
        return [{ id: 'dashboard', label: 'Dashboard', icon: Home, visible: true }];
    }
  };

  const menuItems = getMenuItems().filter(item => item.visible);
  const EntityIcon = STAFF_TYPE_ICONS[staffType];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full">
      {/* Logo Branding */}
      <div className="p-4 border-b border-border">
        <DashboardBranding size="md" />
      </div>

      {/* Entity Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <EntityIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground truncate">
              {entityInfo?.name || 'Loading...'}
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {ROLE_LABELS[permissions?.staff_role || 'other']}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {STAFF_TYPE_LABELS[staffType]}
              </Badge>
            </div>
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
