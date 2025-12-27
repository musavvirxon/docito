import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Stethoscope, 
  User, 
  Building2, 
  FlaskConical, 
  Scan, 
  Pill,
  Shield,
  UserCog
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

const roleConfig: Record<string, { label: string; icon: React.ElementType; variant: string }> = {
  patient: { label: 'Patient', icon: User, variant: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  doctor: { label: 'Doctor', icon: Stethoscope, variant: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  clinic_admin: { label: 'Clinic', icon: Building2, variant: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  lab_admin: { label: 'Lab', icon: FlaskConical, variant: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  lab_technician: { label: 'Lab Tech', icon: FlaskConical, variant: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  imaging_admin: { label: 'Imaging', icon: Scan, variant: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  radiologist: { label: 'Radiologist', icon: Scan, variant: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  pharmacy_admin: { label: 'Pharmacy', icon: Pill, variant: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
  pharmacist: { label: 'Pharmacist', icon: Pill, variant: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
  admin: { label: 'Admin', icon: UserCog, variant: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300' },
  super_admin: { label: 'Super Admin', icon: Shield, variant: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  receptionist: { label: 'Staff', icon: Building2, variant: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
};

const RoleBadge: React.FC<RoleBadgeProps> = ({ 
  role, 
  size = 'sm',
  showIcon = true,
  className 
}) => {
  const config = roleConfig[role] || { 
    label: role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
    icon: User, 
    variant: 'bg-muted text-muted-foreground' 
  };
  
  const Icon = config.icon;
  const isSmall = size === 'sm';

  return (
    <Badge 
      variant="secondary"
      className={cn(
        'font-medium border-0',
        config.variant,
        isSmall ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        className
      )}
    >
      {showIcon && (
        <Icon className={cn('mr-1', isSmall ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      )}
      {config.label}
    </Badge>
  );
};

export default RoleBadge;
