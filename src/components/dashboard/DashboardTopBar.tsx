import { Badge } from '@/components/ui/badge';
import ProfileMenu from './ProfileMenu';
import { AppRole } from '@/lib/rbac';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/home/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface DashboardTopBarProps {
  entityName?: string;
  entityStatus?: 'active' | 'pending' | 'verified' | 'suspended';
  role: AppRole;
}

const statusColors = {
  active: 'bg-green-500/10 text-green-600 border-green-500/30',
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  verified: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  suspended: 'bg-red-500/10 text-red-600 border-red-500/30',
};

const statusLabels: Record<NonNullable<DashboardTopBarProps["entityStatus"]>, string> = {
  active: 'Active',
  pending: 'Pending',
  verified: 'Verified',
  suspended: 'Suspended',
};

const roleLabels: Record<string, string> = {
  doctor: 'Doctor',
  patient: 'Patient',
  clinic_admin: 'Clinic Admin',
  admin: 'Clinic Admin',
  pharmacy_admin: 'Pharmacy Admin',
  lab_admin: 'Lab Admin',
  imaging_admin: 'Imaging Admin',
  super_admin: 'Super Admin',
  pharmacy_staff: 'Pharmacy Staff',
  pharmacist: 'Pharmacist',
  lab_staff: 'Lab Staff',
  lab_technician: 'Lab Technician',
  imaging_staff: 'Imaging Staff',
  internal_imaging_tech: 'Imaging Tech',
};

function getVerificationRouteByRole(role: AppRole) {
  // ✅ Route to the "respective/suitable" verification page
  if (role === 'lab_admin' || role === 'lab_staff' || role === 'lab_technician') return '/lab/verification';
  if (role === 'pharmacy_admin' || role === 'pharmacy_staff' || role === 'pharmacist') return '/pharmacy/verification';
  if (role === 'imaging_admin' || role === 'imaging_staff' || role === 'internal_imaging_tech') return '/imaging/verification';

  // clinic admin / admin practice verification
  if (role === 'admin' || role === 'clinic_admin') return '/dashboard/verify';

  // fallback
  return '/dashboard/verify';
}

export function DashboardTopBar({
  entityName,
  entityStatus = 'active',
  role,
}: DashboardTopBarProps) {
  const navigate = useNavigate();

  const handleVerificationClick = () => {
    navigate(getVerificationRouteByRole(role));
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left side - Entity info */}
        <div className="flex items-center gap-3 min-w-0">
          {entityName && (
            <h1 className="text-lg font-semibold truncate">{entityName}</h1>
          )}

          {/* ✅ CLICKABLE STATUS BADGE (any state) */}
          <button
            type="button"
            onClick={handleVerificationClick}
            className="focus:outline-none"
            aria-label="Open verification page"
          >
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 cursor-pointer hover:opacity-90 transition",
                statusColors[entityStatus]
              )}
            >
              {statusLabels[entityStatus]}
            </Badge>
          </button>

          <Badge variant="secondary" className="shrink-0 hidden sm:flex">
            {roleLabels[role] || role}
          </Badge>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />

          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              3
            </span>
          </Button>

          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
