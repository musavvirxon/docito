import { useState } from 'react';
import { format, addDays, setHours, setMinutes, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Trash2, Loader2, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { Referral } from '@/hooks/useReferrals';

interface SlotInput {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
}

interface PublishSlotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referral: Referral;
  onPublish: (slots: { slot_date: string; start_time: string; end_time: string }[]) => Promise<void>;
}

export const PublishSlotsDialog = ({
  open,
  onOpenChange,
  referral,
  onPublish
}: PublishSlotsDialogProps) => {
  const [slots, setSlots] = useState<SlotInput[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isPublishing, setIsPublishing] = useState(false);

  const validFrom = parseISO(referral.valid_from);
  const validUntil = parseISO(referral.valid_until);

  const addSlot = () => {
    if (!selectedDate) return;

    const duration = referral.estimated_duration_minutes || 30;
    const defaultStart = '09:00';
    const [hours, minutes] = defaultStart.split(':').map(Number);
    const endTime = format(
      setMinutes(setHours(new Date(), hours), minutes + duration),
      'HH:mm'
    );

    setSlots([
      ...slots,
      {
        id: `slot-${Date.now()}`,
        date: selectedDate,
        startTime: defaultStart,
        endTime
      }
    ]);
  };

  const updateSlot = (id: string, field: 'startTime' | 'endTime', value: string) => {
    setSlots(slots.map(slot => {
      if (slot.id === id) {
        const updated = { ...slot, [field]: value };
        
        // Auto-calculate end time if start time changes
        if (field === 'startTime') {
          const [hours, minutes] = value.split(':').map(Number);
          const duration = referral.estimated_duration_minutes || 30;
          updated.endTime = format(
            setMinutes(setHours(new Date(), hours), minutes + duration),
            'HH:mm'
          );
        }
        
        return updated;
      }
      return slot;
    }));
  };

  const removeSlot = (id: string) => {
    setSlots(slots.filter(slot => slot.id !== id));
  };

  const handlePublish = async () => {
    if (slots.length === 0) return;

    setIsPublishing(true);
    try {
      const formattedSlots = slots.map(slot => ({
        slot_date: format(slot.date, 'yyyy-MM-dd'),
        start_time: slot.startTime,
        end_time: slot.endTime
      }));

      await onPublish(formattedSlots);
      onOpenChange(false);
      setSlots([]);
    } catch (error) {
      console.error('Error publishing slots:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    const dateKey = format(slot.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, SlotInput[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Publish Available Slots</DialogTitle>
          <DialogDescription>
            Add available time slots for the patient to book their referral appointment
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Referral Info */}
          <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{referral.referral_number}</Badge>
              <Badge variant={referral.priority === 'stat' ? 'destructive' : referral.priority === 'urgent' ? 'default' : 'secondary'}>
                {referral.priority}
              </Badge>
            </div>
            <p className="text-sm">{referral.reason}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Duration: {referral.estimated_duration_minutes || 30} min</span>
              <span>Valid: {format(validFrom, 'MMM d')} - {format(validUntil, 'MMM d, yyyy')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Calendar Section */}
            <div className="space-y-3">
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < validFrom || date > validUntil || date < new Date()}
                className="rounded-md border"
              />
              <Button
                onClick={addSlot}
                disabled={!selectedDate}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Time Slot
              </Button>
            </div>

            {/* Slots List */}
            <div className="space-y-3">
              <Label>Added Slots ({slots.length})</Label>
              <ScrollArea className="h-[320px] border rounded-md p-3">
                {slots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Select a date and add time slots
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(slotsByDate).map(([dateKey, dateSlots]) => (
                      <div key={dateKey} className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          {format(parseISO(dateKey), 'EEEE, MMMM d')}
                        </p>
                        {dateSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className="flex items-center gap-2 p-2 bg-muted/30 rounded-md"
                          >
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateSlot(slot.id, 'startTime', e.target.value)}
                              className="w-24 h-8"
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateSlot(slot.id, 'endTime', e.target.value)}
                              className="w-24 h-8"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeSlot(slot.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={slots.length === 0 || isPublishing}>
            {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publish {slots.length} Slot{slots.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
