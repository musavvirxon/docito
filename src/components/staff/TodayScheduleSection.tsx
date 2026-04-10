import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Clock, Phone, Mail, CheckCircle, XCircle, PlayCircle, 
  PauseCircle, User, ChevronRight, RefreshCw 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { StaffAppointment } from '@/hooks/useStaffDashboard';

interface TodayScheduleSectionProps {
  appointments: StaffAppointment[];
  onStatusUpdate: (appointmentId: string, status: string) => Promise<boolean>;
  onRefresh: () => void;
  canUpdateAppointments: boolean;
}

export const TodayScheduleSection = ({ 
  appointments, 
  onStatusUpdate, 
  onRefresh,
  canUpdateAppointments 
}: TodayScheduleSectionProps) => {
  const { t } = useTranslation('dashboard');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: t('staff.schedule.status.pending', 'Pending'), color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    confirmed: { label: t('staff.schedule.status.confirmed', 'Confirmed'), color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
    arrived: { label: t('staff.schedule.status.arrived', 'Arrived'), color: 'bg-green-100 text-green-800 border-green-200', icon: User },
    in_progress: { label: t('staff.schedule.status.inProgress', 'In Progress'), color: 'bg-purple-100 text-purple-800 border-purple-200', icon: PlayCircle },
    completed: { label: t('staff.schedule.status.completed', 'Completed'), color: 'bg-gray-100 text-gray-800 border-gray-200', icon: CheckCircle },
    canceled: { label: t('staff.schedule.status.canceled', 'Canceled'), color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    no_show: { label: t('staff.schedule.status.noShow', 'No Show'), color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  };

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    setUpdatingId(appointmentId);
    await onStatusUpdate(appointmentId, newStatus);
    setUpdatingId(null);
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch {
      return time;
    }
  };

  const getNextActions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return [
          { status: 'confirmed', label: t('staff.schedule.actions.confirm', 'Confirm'), variant: 'default' as const },
          { status: 'canceled', label: t('staff.schedule.actions.cancel', 'Cancel'), variant: 'destructive' as const },
        ];
      case 'confirmed':
        return [
          { status: 'arrived', label: t('staff.schedule.actions.markArrived', 'Mark Arrived'), variant: 'default' as const },
          { status: 'no_show', label: t('staff.schedule.actions.noShow', 'No Show'), variant: 'outline' as const },
        ];
      case 'arrived':
        return [
          { status: 'in_progress', label: t('staff.schedule.actions.start', 'Start'), variant: 'default' as const },
        ];
      case 'in_progress':
        return [
          { status: 'completed', label: t('staff.schedule.actions.complete', 'Complete'), variant: 'default' as const },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('staff.schedule.title', "Today's Schedule")}</h2>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} • {t('staff.schedule.appointmentCount', '{{count}} appointments', { count: appointments.length })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('staff.schedule.refresh', 'Refresh')}
        </Button>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">{t('staff.schedule.noAppointments', 'No Appointments Today')}</h3>
            <p className="text-muted-foreground">{t('staff.schedule.scheduleClear', 'The schedule is clear for today.')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => {
            const statusConfig = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;
            const actions = canUpdateAppointments ? getNextActions(apt.status) : [];

            return (
              <Card key={apt.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="text-center min-w-[80px]">
                      <p className="text-lg font-bold text-foreground">
                        {formatTime(apt.start_time)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(apt.end_time)}
                      </p>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {apt.patient_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-foreground">{apt.patient_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {t('staff.schedule.withDr', 'with Dr. {{name}}', { name: apt.doctor_name })}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {apt.patient_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {apt.patient_phone}
                          </span>
                        )}
                        {apt.patient_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {apt.patient_email}
                          </span>
                        )}
                      </div>

                      {apt.notes && (
                        <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                          {apt.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right space-y-2">
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>

                      {actions.length > 0 && (
                        <div className="flex gap-2 justify-end">
                          {actions.map((action) => (
                            <Button
                              key={action.status}
                              size="sm"
                              variant={action.variant}
                              disabled={updatingId === apt.id}
                              onClick={() => handleStatusUpdate(apt.id, action.status)}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
