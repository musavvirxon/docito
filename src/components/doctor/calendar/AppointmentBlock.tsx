import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Home, MessageSquare, User, Clock, Phone, Mail, FileText, ArrowRightLeft, Stethoscope } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import type { CalendarAppointment, AppointmentType } from './types';

interface AppointmentBlockProps {
  appointment: CalendarAppointment;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

const typeIcons: Record<AppointmentType, typeof Video> = {
  'in-person': User,
  'in_person': User,
  'video': Video,
  'home': Home,
  'home_visit': Home,
  'chat': MessageSquare,
  'messaging': MessageSquare,
  'follow_up': User,
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  confirmed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  completed: 'bg-muted text-muted-foreground border-border',
  canceled: 'bg-destructive/10 text-destructive border-destructive/20',
  no_show: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
};

const fallbackStatusClass = 'bg-muted/40 text-muted-foreground border-border';

const AppointmentBlock = memo(({ appointment, compact = false, onClick, className }: AppointmentBlockProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const TypeIcon = typeIcons[appointment.appointment_type || 'in-person'];
  const statusColor = statusColors[String(appointment.status)] || fallbackStatusClass;

  const initials =
    appointment.patient_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'P';

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.15 }}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          onClick={onClick}
          className={cn(
            'group relative rounded-lg border cursor-pointer transition-all duration-200',
            'bg-card hover:shadow-lg hover:shadow-primary/5',
            statusColor,
            compact ? 'p-2' : 'p-3',
            className
          )}
        >
          <div className="flex items-start gap-3">
            {!compact && (
              <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                <AvatarImage src={appointment.patient_avatar || ''} />
                <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('font-medium truncate', compact ? 'text-xs' : 'text-sm')}>
                  {appointment.patient_name}
                </span>
                {appointment.source === 'referral' && (
                  <ArrowRightLeft className="h-3 w-3 text-primary shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={cn(
                    'text-muted-foreground flex items-center gap-1 truncate',
                    compact ? 'text-[10px]' : 'text-xs'
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {appointment.start_time} - {appointment.end_time}
                </span>
                <TypeIcon className="h-3 w-3 text-muted-foreground" />
              </div>

              {/* ✅ Procedure visible even in compact blocks (week view, etc.) */}
              {compact && appointment.procedure_name && (
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground min-w-0">
                  <Stethoscope className="h-3 w-3 shrink-0" />
                  <span className="truncate">{appointment.procedure_name}</span>
                </div>
              )}

              {/* Existing badge for non-compact */}
              {!compact && appointment.procedure_name && (
                <Badge variant="outline" className="mt-1.5 text-[10px] h-5 w-fit max-w-full">
                  <span className="truncate">{appointment.procedure_name}</span>
                </Badge>
              )}
            </div>

            <Badge variant="outline" className={cn('capitalize shrink-0 text-[10px] h-5', compact && 'hidden')}>
              {appointment.status}
            </Badge>
          </div>

          <motion.div
            initial={false}
            animate={{ scaleX: isHovered ? 1 : 0 }}
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary origin-left"
          />
        </motion.div>
      </HoverCardTrigger>

      <HoverCardContent align="start" className="w-80">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={appointment.patient_avatar || ''} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h4 className="font-semibold truncate">{appointment.patient_name}</h4>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                {appointment.patient_phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {appointment.patient_phone}
                  </span>
                )}
                {appointment.patient_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {appointment.patient_email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium">{appointment.start_time} - {appointment.end_time}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="capitalize flex items-center gap-1.5">
                <TypeIcon className="h-3.5 w-3.5" />
                {appointment.appointment_type || 'In-Person'}
              </span>
            </div>

            {/* ✅ Procedure in hover details */}
            {appointment.procedure_name && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                  <Stethoscope className="h-3.5 w-3.5" />
                  Procedure
                </span>
                <span className="font-medium truncate text-right">{appointment.procedure_name}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="capitalize">{appointment.status}</Badge>
            </div>

            {appointment.source === 'referral' && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Source</span>
                <Badge variant="secondary" className="text-xs">
                  <ArrowRightLeft className="h-3 w-3 mr-1" />
                  Referral
                </Badge>
              </div>
            )}
          </div>

          {appointment.notes && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <FileText className="h-3 w-3" />
                Notes
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{appointment.notes}</p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
});

AppointmentBlock.displayName = 'AppointmentBlock';

export default AppointmentBlock;
