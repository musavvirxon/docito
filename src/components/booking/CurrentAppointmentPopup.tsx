import { useState, useEffect } from 'react';
import { format, parseISO, isFuture, isPast } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  FileText,
  Video,
  Phone,
  X,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AppointmentDetails {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  doctor?: {
    id: string;
    specialty: string;
    user?: {
      full_name: string;
      avatar_url?: string;
    };
  };
  practice?: {
    id: string;
    name: string;
    address?: string;
    city?: string;
  };
}

interface CurrentAppointmentPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  onCancelled?: () => void;
  onRescheduled?: () => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  canceled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  no_show: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export function CurrentAppointmentPopup({
  open,
  onOpenChange,
  appointmentId,
  onCancelled,
  onRescheduled,
}: CurrentAppointmentPopupProps) {
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const { toast } = useToast();

  // Fetch appointment details
  useEffect(() => {
    if (!open || !appointmentId) return;

    const fetchAppointment = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            start_time,
            end_time,
            status,
            notes,
            doctor:doctors(
              id,
              specialty,
              user:profiles!doctors_user_id_fkey(full_name, avatar_url)
            ),
            practice:practices(
              id,
              name,
              address,
              city
            )
          `)
          .eq('id', appointmentId)
          .single();

        if (error) throw error;
        
        // Transform the data to handle the nested structure
        const transformedData = {
          ...data,
          doctor: data.doctor ? {
            ...data.doctor,
            user: Array.isArray(data.doctor.user) ? data.doctor.user[0] : data.doctor.user
          } : undefined,
          practice: Array.isArray(data.practice) ? data.practice[0] : data.practice
        };
        
        setAppointment(transformedData as any);
      } catch (err: any) {
        console.error('Error fetching appointment:', err);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load appointment details',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();

    // Set up realtime subscription
    const channel = supabase
      .channel(`appointment-${appointmentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'appointments',
        filter: `id=eq.${appointmentId}`,
      }, (payload) => {
        setAppointment(prev => prev ? { ...prev, ...payload.new } : null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, appointmentId, toast]);

  const handleCancel = async () => {
    if (!appointment) return;

    setCancelling(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'canceled' })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: 'Appointment Cancelled',
        description: 'Your appointment has been cancelled successfully.',
      });
      
      setAppointment(prev => prev ? { ...prev, status: 'canceled' } : null);
      onCancelled?.();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to cancel appointment',
      });
    } finally {
      setCancelling(false);
    }
  };

  const canCancel = appointment && 
    ['pending', 'confirmed'].includes(appointment.status) &&
    isFuture(parseISO(`${appointment.appointment_date}T${appointment.start_time}`));

  const canReschedule = appointment && 
    ['pending', 'confirmed'].includes(appointment.status) &&
    isFuture(parseISO(`${appointment.appointment_date}T${appointment.start_time}`));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
          <DialogDescription>
            {loading ? 'Loading...' : appointment?.practice?.name || 'Your upcoming appointment'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !appointment ? (
          <div className="text-center py-8">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Appointment not found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <Badge className={cn('capitalize', statusColors[appointment.status])}>
                {appointment.status.replace('_', ' ')}
              </Badge>
              {isPast(parseISO(`${appointment.appointment_date}T${appointment.end_time}`)) && 
                appointment.status === 'confirmed' && (
                <Badge variant="outline">Past</Badge>
              )}
            </div>

            {/* Date & Time */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium">
                    {format(parseISO(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium">
                    {format(parseISO(`2000-01-01T${appointment.start_time}`), 'h:mm a')} -{' '}
                    {format(parseISO(`2000-01-01T${appointment.end_time}`), 'h:mm a')}
                  </p>
                </div>
              </div>
            </div>

            {/* Provider Info */}
            {appointment.doctor && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    Dr. {appointment.doctor.user?.full_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-muted-foreground">{appointment.doctor.specialty}</p>
                </div>
              </div>
            )}

            {/* Location */}
            {appointment.practice && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{appointment.practice.name}</p>
                  {appointment.practice.address && (
                    <p className="text-sm text-muted-foreground">
                      {appointment.practice.address}
                      {appointment.practice.city && `, ${appointment.practice.city}`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {appointment.notes && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Notes</p>
                  <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                </div>
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {canReschedule && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    onRescheduled?.();
                    // TODO: Implement reschedule flow
                  }}
                >
                  Reschedule
                </Button>
              )}
              {canCancel && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </>
                  )}
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CurrentAppointmentPopup;
