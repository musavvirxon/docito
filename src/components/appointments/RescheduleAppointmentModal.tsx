import { useState, useEffect } from 'react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { Calendar, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface RescheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  doctorId: string;
  patientName?: string;
  currentDate: string;
  currentTime: string;
  onRescheduled?: () => void;
}

export function RescheduleAppointmentModal({
  isOpen,
  onClose,
  appointmentId,
  doctorId,
  patientName,
  currentDate,
  currentTime,
  onRescheduled,
}: RescheduleAppointmentModalProps) {
  const { t } = useTranslation('dashboard');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [reason, setReason] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingSlots, setFetchingSlots] = useState(false);

  // Generate time slots (9 AM to 6 PM, 30-minute intervals)
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 9; hour < 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  // Fetch available slots when date changes
  useEffect(() => {
    if (!selectedDate || !doctorId) return;

    const fetchAvailableSlots = async () => {
      setFetchingSlots(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        // Fetch existing appointments for this doctor on this date
        const { data: existingAppointments, error } = await supabase
          .from('appointments')
          .select('start_time, end_time')
          .eq('doctor_id', doctorId)
          .eq('appointment_date', dateStr)
          .neq('id', appointmentId)
          .not('status', 'eq', 'canceled');

        if (error) throw error;

        const bookedTimes = new Set(
          (existingAppointments || []).map(apt => apt.start_time?.slice(0, 5))
        );

        const allSlots = generateTimeSlots();
        const now = new Date();
        const isToday = format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');

        setTimeSlots(
          allSlots.map(time => ({
            time,
            available: !bookedTimes.has(time) && 
              !(isToday && time <= format(now, 'HH:mm')),
          }))
        );
      } catch (error) {
        console.error('Error fetching slots:', error);
        toast.error('Failed to fetch available slots');
      } finally {
        setFetchingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDate, doctorId, appointmentId]);

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select a date and time');
      return;
    }

    setLoading(true);
    try {
      const newDate = format(selectedDate, 'yyyy-MM-dd');
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const endTime = `${hours.toString().padStart(2, '0')}:${(minutes + 30).toString().padStart(2, '0')}`;

      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: newDate,
          start_time: selectedTime,
          end_time: endTime,
          notes: reason 
            ? `[Rescheduled: ${format(new Date(), 'MMM d, yyyy')}] ${reason}`
            : undefined,
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast.success(t('reschedule.success', 'Appointment rescheduled successfully'));
      onRescheduled?.();
      onClose();
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast.error('Failed to reschedule appointment');
    } finally {
      setLoading(false);
    }
  };

  const minDate = startOfDay(addDays(new Date(), 1));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {t('reschedule.title', 'Reschedule Appointment')}
          </DialogTitle>
          <DialogDescription>
            {patientName && (
              <span>
                {t('reschedule.for', 'Rescheduling appointment for')} <strong>{patientName}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current appointment info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              {t('reschedule.currentSlot', 'Current slot')}:
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <Calendar className="h-3 w-3 mr-1" />
                {format(new Date(currentDate), 'MMM d, yyyy')}
              </Badge>
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {currentTime}
              </Badge>
            </div>
          </div>

          {/* Date selection */}
          <div className="space-y-2">
            <Label>{t('reschedule.selectDate', 'Select new date')}</Label>
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => isBefore(date, minDate)}
              className="rounded-md border mx-auto"
            />
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div className="space-y-2">
              <Label>{t('reschedule.selectTime', 'Select new time')}</Label>
              {fetchingSlots ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {timeSlots.map(({ time, available }) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? 'default' : 'outline'}
                      size="sm"
                      disabled={!available}
                      onClick={() => setSelectedTime(time)}
                      className={cn(
                        'text-sm',
                        !available && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">{t('reschedule.reason', 'Reason for rescheduling')} ({t('common.optional', 'optional')})</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('reschedule.reasonPlaceholder', 'Enter reason for rescheduling...')}
              rows={2}
            />
          </div>

          {selectedDate && selectedTime && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                {t('reschedule.newSlot', 'New slot')}:
              </p>
              <p className="text-sm mt-1">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTime}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleReschedule} 
            disabled={loading || !selectedDate || !selectedTime}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('reschedule.confirm', 'Confirm Reschedule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
