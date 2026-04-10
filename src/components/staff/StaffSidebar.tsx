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
import { useTranslation } from "react-i18next";
import type { StaffType, EntityInfo, StaffPermissions } from "@/hooks/useStaffContext";

type ClinicPermissions = Extract<StaffPermissions, { staffType: "clinic" }>;
type PharmacyPermissions = Extract<StaffPermissions, { staffType: "pharmacy" }>;
type LabPermissions = Extract<StaffPermissions, { staffType: "lab" }>;
type ImagingPermissions = Extract<StaffPermissions, { staffType: "imaging" }>;

interface StaffSidebarProps {
  staffType: StaffType;
  entityInfo: EntityInfo | null;
  permissions: StaffPermissions | null;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const STAFF_TYPE_ICONS: Record<StaffType, typeof Building2> = {
  clinic: Building2,
  pharmacy: Pill,
  lab: FlaskConical,
  imaging: ScanLine,
  unknown: Building2,
};

export const StaffSidebar = ({ 
  staffType,
  entityInfo,
  permissions, 
  activeSection, 
  onSectionChange 
}: StaffSidebarProps) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');

  const STAFF_TYPE_LABELS: Record<StaffType, string> = {
    clinic: t('staff.sidebar.types.clinic', 'Clinic'),
    pharmacy: t('staff.sidebar.types.pharmacy', 'Pharmacy'),
    lab: t('staff.sidebar.types.lab', 'Laboratory'),
    imaging: t('staff.sidebar.types.imaging', 'Imaging Center'),
    unknown: t('staff.sidebar.types.unknown', 'Organization'),
  };

  const ROLE_LABELS: Record<string, string> = {
    receptionist: t('staff.sidebar.roles.receptionist', 'Receptionist'),
    nurse: t('staff.sidebar.roles.nurse', 'Nurse'),
    billing_manager: t('staff.sidebar.roles.billing_manager', 'Billing Manager'),
    assistant: t('staff.sidebar.roles.assistant', 'Assistant'),
    technician: t('staff.sidebar.roles.technician', 'Technician'),
    hygienist: t('staff.sidebar.roles.hygienist', 'Hygienist'),
    manager: t('staff.sidebar.roles.manager', 'Manager'),
    clinic_staff: t('staff.sidebar.roles.clinic_staff', 'Clinic Staff'),
    clinic_admin: t('staff.sidebar.roles.clinic_admin', 'Clinic Admin'),
    pharmacist: t('staff.sidebar.roles.pharmacist', 'Pharmacist'),
    pharmacy_staff: t('staff.sidebar.roles.pharmacy_staff', 'Pharmacy Staff'),
    pharmacy_admin: t('staff.sidebar.roles.pharmacy_admin', 'Pharmacy Admin'),
    pharmacy_tech: t('staff.sidebar.roles.pharmacy_tech', 'Pharmacy Tech'),
    lab_technician: t('staff.sidebar.roles.lab_technician', 'Lab Technician'),
    lab_staff: t('staff.sidebar.roles.lab_staff', 'Lab Staff'),
    lab_admin: t('staff.sidebar.roles.lab_admin', 'Lab Admin'),
    internal_lab_tech: t('staff.sidebar.roles.internal_lab_tech', 'Lab Technician'),
    imaging_staff: t('staff.sidebar.roles.imaging_staff', 'Imaging Staff'),
    imaging_admin: t('staff.sidebar.roles.imaging_admin', 'Imaging Admin'),
    internal_imaging_tech: t('staff.sidebar.roles.internal_imaging_tech', 'Imaging Tech'),
    radiologist: t('staff.sidebar.roles.radiologist', 'Radiologist'),
    staff: t('staff.sidebar.roles.staff', 'Staff'),
    other: t('staff.sidebar.roles.other', 'Staff'),
  };

  const getClinicMenuItems = (perms: ClinicPermissions) => [
    { id: 'dashboard', label: t('staff.sidebar.menu.dashboard', 'Dashboard'), icon: Home, visible: true },
    { id: 'today', label: t('staff.sidebar.menu.today', "Today's Schedule"), icon: Clock, visible: perms.can_view_schedule },
    { id: 'appointments', label: t('staff.sidebar.menu.appointments', 'Appointments'), icon: Calendar, visible: perms.can_view_schedule },
    { id: 'patients', label: t('staff.sidebar.menu.patients', 'Patients'), icon: Users, visible: perms.can_manage_patients },
    { id: 'vitals', label: t('staff.sidebar.menu.vitals', 'Vitals & Notes'), icon: Stethoscope, visible: perms.can_view_medical_records },
    { id: 'billing', label: t('staff.sidebar.menu.billing', 'Billing & Payments'), icon: DollarSign, visible: perms.can_manage_billing },
    { id: 'intake', label: t('staff.sidebar.menu.intake', 'Patient Intake'), icon: ClipboardList, visible: perms.can_book_appointments },
    { id: 'records', label: t('staff.sidebar.menu.records', 'Medical Records'), icon: FileText, visible: perms.can_view_medical_records },
  ];

  const getPharmacyMenuItems = (perms: PharmacyPermissions) => [
    { id: 'dashboard', label: t('staff.sidebar.menu.dashboard', 'Dashboard'), icon: Home, visible: true },
    { id: 'prescriptions', label: t('staff.sidebar.menu.prescriptions', 'Prescriptions'), icon: ClipboardList, visible: true },
    { id: 'dispensing', label: t('staff.sidebar.menu.dispensing', 'Dispensing Queue'), icon: Pill, visible: perms.can_dispense },
    { id: 'inventory', label: t('staff.sidebar.menu.inventory', 'Inventory'), icon: Package, visible: perms.can_manage_inventory },
    { id: 'orders', label: t('staff.sidebar.menu.orders', 'Orders'), icon: FileText, visible: perms.can_process_prescriptions },
    { id: 'patients', label: t('staff.sidebar.menu.patientHistory', 'Patient History'), icon: Users, visible: true },
  ];

  const getLabMenuItems = (perms: LabPermissions) => [
    { id: 'dashboard', label: t('staff.sidebar.menu.dashboard', 'Dashboard'), icon: Home, visible: true },
    { id: 'orders', label: t('staff.sidebar.menu.labOrders', 'Lab Orders'), icon: ClipboardList, visible: true },
    { id: 'samples', label: t('staff.sidebar.menu.sampleCollection', 'Sample Collection'), icon: TestTube, visible: perms.can_process_samples },
    { id: 'processing', label: t('staff.sidebar.menu.processing', 'Processing'), icon: FlaskConical, visible: perms.can_process_samples },
    { id: 'results', label: t('staff.sidebar.menu.results', 'Results'), icon: FileText, visible: perms.can_upload_results },
    { id: 'verification', label: t('staff.sidebar.menu.verification', 'Verification'), icon: Microscope, visible: perms.can_verify_results },
    { id: 'equipment', label: t('staff.sidebar.menu.equipment', 'Equipment'), icon: Syringe, visible: perms.can_manage_equipment },
  ];

  const getImagingMenuItems = (perms: ImagingPermissions) => [
    { id: 'dashboard', label: t('staff.sidebar.menu.dashboard', 'Dashboard'), icon: Home, visible: true },
    { id: 'orders', label: t('staff.sidebar.menu.imagingOrders', 'Imaging Orders'), icon: ClipboardList, visible: perms.can_view_orders },
    { id: 'scans', label: t('staff.sidebar.menu.scanQueue', 'Scan Queue'), icon: ScanLine, visible: perms.can_process_scans },
    { id: 'processing', label: t('staff.sidebar.menu.processing', 'Processing'), icon: ImageIcon, visible: perms.can_process_scans },
    { id: 'results', label: t('staff.sidebar.menu.resultsUpload', 'Results Upload'), icon: FileText, visible: perms.can_upload_results },
    { id: 'verification', label: t('staff.sidebar.menu.reportVerification', 'Report Verification'), icon: Microscope, visible: perms.can_verify_results },
    { id: 'equipment', label: t('staff.sidebar.menu.equipment', 'Equipment'), icon: Syringe, visible: perms.can_manage_equipment },
  ];

  const getMenuItems = () => {
    if (!permissions) return [{ id: 'dashboard', label: t('staff.sidebar.menu.dashboard', 'Dashboard'), icon: Home, visible: true }];

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
        return [{ id: 'dashboard', label: t('staff.sidebar.menu.dashboard', 'Dashboard'), icon: Home, visible: true }];
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
      <div className="p-4 border-b border-border">
        <DashboardBranding size="md" />
      </div>

      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <EntityIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground truncate">
              {entityInfo?.name || t('staff.sidebar.loading', 'Loading...')}
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
              {profile?.full_name || t('staff.sidebar.staffMember', 'Staff Member')}
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
            {t('staff.sidebar.settings', 'Settings')}
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
