import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Video, Clock } from 'lucide-react';
import { format, addMinutes, setHours, setMinutes } from 'date-fns';
import { cn } from '@/lib/utils';

interface VideoConsultationSchedulerProps {
  doctorId: string;
  patientId: string;
  patientName: string;
  appointmentId?: string;
  onSchedule: (data: {
    doctor_id: string;
    patient_id: string;
    appointment_id?: string;
    scheduled_start: string;
    scheduled_end: string;
    notes?: string;
  }) => void;
  onCancel: () => void;
}

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8; // Start from 8 AM
  const minute = (i % 2) * 30;
  if (hour > 20) return null; // End at 8 PM
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
    label: format(setMinutes(setHours(new Date(), hour), minute), 'h:mm a'),
  };
}).filter(Boolean) as { value: string; label: string }[];

const durations = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
];

const VideoConsultationScheduler: React.FC<VideoConsultationSchedulerProps> = ({
  doctorId,
  patientId,
  patientName,
  appointmentId,
  onSchedule,
  onCancel,
}) => {
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState<string>('09:00');
  const [duration, setDuration] = useState<string>('30');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSchedule = async () => {
    if (!date || !time) return;

    setIsSubmitting(true);
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledStart = setMinutes(setHours(date, hours), minutes);
      const scheduledEnd = addMinutes(scheduledStart, parseInt(duration));

      await onSchedule({
        doctor_id: doctorId,
        patient_id: patientId,
        appointment_id: appointmentId,
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        notes: notes || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Schedule Video Consultation
        </CardTitle>
        <CardDescription>
          Schedule a video call with {patientName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Picker */}
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Picker */}
        <div className="space-y-2">
          <Label>Time</Label>
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger>
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((slot) => (
                <SelectItem key={slot.value} value={slot.value}>
                  {slot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label>Duration</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger>
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {durations.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this consultation..."
            className="resize-none"
            rows={3}
          />
        </div>

        {/* Summary */}
        {date && time && (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium">Summary</p>
            <div className="mt-1 space-y-1 text-muted-foreground">
              <p className="flex items-center gap-2">
                <CalendarIcon className="h-3 w-3" />
                {format(date, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                {timeSlots.find(s => s.value === time)?.label} ({duration} min)
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSchedule} 
            disabled={!date || !time || isSubmitting}
            className="flex-1 gap-2"
          >
            <Video className="h-4 w-4" />
            {isSubmitting ? 'Scheduling...' : 'Schedule'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoConsultationScheduler;
