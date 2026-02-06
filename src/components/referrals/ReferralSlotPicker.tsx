// File: src/components/referrals/ReferralSlotPicker.tsx

import { useEffect, useMemo, useState } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TimezoneNotice } from '@/components/time/TimezoneNotice';
import { cn } from '@/lib/utils';
import {
  formatFullDateInTimeZone,
  formatTimeInTimeZone,
  getEffectiveTimeZone,
  zonedLocalToUtcDate,
} from '@/lib/timezone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ReferralSlot, Referral } from '@/hooks/useReferrals';

interface ReferralSlotPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referral: Referral;
  slots: ReferralSlot[];
  loading: boolean;
  onBookSlot: (
    slotId: string,
    appointmentData: {
      appointment_date: string;
      start_time: string;
      end_time: string;
    }
  ) => Promise<void>;
}

const receiverEntityTypeMap: Record<string, string> = {
  clinic: 'clinic',
  lab: 'lab',
  imaging_center: 'imaging',
  pharmacy: 'pharmacy',
};

export const ReferralSlotPicker = ({
  open,
  onOpenChange,
  referral,
  slots,
  loading,
  onBookSlot,
}: ReferralSlotPickerProps) => {
  const { profile } = useAuth();
  const viewerTimezone = getEffectiveTimeZone(profile?.timezone);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    referral.preferred_date ? parseISO(referral.preferred_date) : undefined
  );
  const [selectedSlot, setSelectedSlot] = useState<ReferralSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const [receiverTimezone, setReceiverTimezone] = useState<string>('UTC');
  const [receiverTzLoading, setReceiverTzLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadReceiverTimezone = async () => {
      setReceiverTzLoading(true);
      try {
        let tz: string | null | undefined;

        if (referral.receiver_type === 'doctor' && referral.receiver_entity_id) {
          const { data: doctorRow, error: doctorErr } = await supabase
            .from('doctors')
            .select('user_id')
            .eq('id', referral.receiver_entity_id)
            .maybeSingle();
          if (doctorErr) throw doctorErr;

          if (doctorRow?.user_id) {
            const { data: profRow, error: profErr } = await supabase
              .from('profiles')
              .select('timezone')
              .eq('user_id', doctorRow.user_id)
              .maybeSingle();
            if (profErr) throw profErr;
            tz = profRow?.timezone;
          }
        } else if (referral.receiver_entity_id) {
          const mapped = receiverEntityTypeMap[referral.receiver_type];
          if (mapped) {
            const { data: entityRow, error: entityErr } = await (supabase as any)
              .from('entity_settings')
              .select('timezone')
              .eq('entity_type', mapped)
              .eq('entity_id', referral.receiver_entity_id)
              .maybeSingle();
            if (entityErr) throw entityErr;
            tz = (entityRow as any)?.timezone;
          }
        }

        if (!cancelled) setReceiverTimezone(getEffectiveTimeZone(tz));
      } catch (e) {
        console.warn('Failed to resolve receiver timezone, defaulting to UTC.', e);
        if (!cancelled) setReceiverTimezone('UTC');
      } finally {
        if (!cancelled) setReceiverTzLoading(false);
      }
    };

    if (open) loadReceiverTimezone();

    return () => {
      cancelled = true;
    };
  }, [open, referral.receiver_type, referral.receiver_entity_id]);

  const availableDates = useMemo(() => {
    return [
      ...new Set(
        slots
          .filter((s) => s.is_available && !s.is_reserved)
          .map((s) => s.slot_date)
      ),
    ];
  }, [slots]);

  const slotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    return slots.filter(
      (s) => s.is_available && !s.is_reserved && isSameDay(parseISO(s.slot_date), selectedDate)
    );
  }, [slots, selectedDate]);

  const hasSlots = (date: Date) => {
    return availableDates.some((d) => isSameDay(parseISO(d), date));
  };

  const isWithinValidity = (date: Date) => {
    const validFrom = parseISO(referral.valid_from);
    const validUntil = parseISO(referral.valid_until);
    return date >= validFrom && date <= validUntil;
  };

  const formatSlotRange = (slot: ReferralSlot) => {
    if (!receiverTimezone || receiverTzLoading) {
      return `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`;
    }

    const startUtc = zonedLocalToUtcDate(slot.slot_date, slot.start_time, receiverTimezone);
    let endUtc = zonedLocalToUtcDate(slot.slot_date, slot.end_time, receiverTimezone);

    if (endUtc.getTime() <= startUtc.getTime()) {
      endUtc = new Date(endUtc.getTime() + 24 * 60 * 60 * 1000);
    }

    return `${formatTimeInTimeZone(startUtc, viewerTimezone)} - ${formatTimeInTimeZone(endUtc, viewerTimezone)}`;
  };

  const getSelectedSlotStartUtc = () => {
    if (!selectedSlot || receiverTzLoading) return null;
    return zonedLocalToUtcDate(selectedSlot.slot_date, selectedSlot.start_time, receiverTimezone);
  };

  const handleBook = async () => {
    if (!selectedSlot) return;

    setIsBooking(true);
    try {
      await onBookSlot(selectedSlot.id, {
        appointment_date: selectedSlot.slot_date,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error booking slot:', error);
    } finally {
      setIsBooking(false);
    }
  };

  const selectedStartUtc = getSelectedSlotStartUtc();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Book Referral Appointment</DialogTitle>
          <DialogDescription>
            Select an available time slot for your referral appointment
          </DialogDescription>
          <div className="pt-2">
            <TimezoneNotice timezone={viewerTimezone} />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Referral</span>
              <Badge variant="outline">{referral.referral_number}</Badge>
            </div>
            <p className="font-medium">{referral.reason}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>Valid until {format(parseISO(referral.valid_until), 'MMMM d, yyyy')}</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No available slots at this time. Please check back later.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Select Date</p>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  disabled={(date) => !hasSlots(date) || !isWithinValidity(date)}
                  modifiers={{
                    hasSlots: (date) => hasSlots(date) && isWithinValidity(date),
                  }}
                  modifiersStyles={{
                    hasSlots: {
                      backgroundColor: 'hsl(var(--primary) / 0.1)',
                      fontWeight: 'bold',
                    },
                  }}
                  className="rounded-md border"
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">
                  {selectedDate
                    ? `Available Times for ${format(selectedDate, 'MMM d')}`
                    : 'Select a date first'}
                </p>
                <ScrollArea className="h-[280px] border rounded-md">
                  {slotsForDate.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      {selectedDate
                        ? 'No slots available for this date'
                        : 'Please select a date to see available times'}
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {slotsForDate.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            'w-full flex items-center justify-between p-3 rounded-md border transition-colors',
                            selectedSlot?.id === slot.id
                              ? 'border-primary bg-primary/10'
                              : 'hover:bg-muted/50'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{formatSlotRange(slot)}</span>
                          </div>
                          {selectedSlot?.id === slot.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          {selectedSlot && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm">
                <span className="text-muted-foreground">Selected: </span>
                <span className="font-medium">
                  {selectedStartUtc
                    ? `${formatFullDateInTimeZone(selectedStartUtc, viewerTimezone)} at ${formatTimeInTimeZone(selectedStartUtc, viewerTimezone)}`
                    : `${format(parseISO(selectedSlot.slot_date), 'MMMM d, yyyy')} at ${selectedSlot.start_time.slice(0, 5)}`}
                </span>
              </div>
              <Button onClick={handleBook} disabled={isBooking}>
                {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Booking
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
