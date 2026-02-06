// File: src/components/referrals/ReferralSlotPicker.tsx
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar, Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Referral, ReferralSlot } from "@/hooks/useReferrals";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referral: Referral;
  slots: ReferralSlot[];
  loading: boolean;
  onBookSlot: (slotId: string, appointmentData: any) => Promise<void>;
};

export function ReferralSlotPicker({ open, onOpenChange, referral, slots, loading, onBookSlot }: Props) {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const grouped = useMemo(() => {
    const byDate: Record<string, ReferralSlot[]> = {};
    (slots || []).forEach((s) => {
      const d = s.slot_date;
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(s);
    });

    Object.keys(byDate).forEach((d) => {
      byDate[d].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
    });

    return Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]));
  }, [slots]);

  const canConfirm = !!selectedSlotId && !submitting;

  const handleConfirm = async () => {
    if (!selectedSlotId) return;

    setSubmitting(true);
    try {
      await onBookSlot(selectedSlotId, { notes });
      onOpenChange(false);
      setSelectedSlotId(null);
      setNotes("");
    } catch (e) {
      console.error("ReferralSlotPicker.book error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Book appointment</DialogTitle>
          <DialogDescription>
            Choose a time slot for referral <span className="font-medium">{referral.referral_number}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading slots...
          </div>
        ) : grouped.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            No available slots right now.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="max-h-[320px] overflow-auto rounded-md border">
              <div className="divide-y">
                {grouped.map(([date, daySlots]) => (
                  <div key={date} className="p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(date), "PPP")}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {daySlots.map((s) => {
                        const disabled = !s.is_available || s.is_reserved;
                        const selected = selectedSlotId === s.id;
                        const label = `${s.start_time} - ${s.end_time}`;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => setSelectedSlotId(s.id)}
                            className={cn(
                              "px-3 py-2 rounded-md border text-sm flex items-center gap-2 transition-colors",
                              "hover:bg-muted/50",
                              selected && "border-primary bg-primary/10",
                              disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
                            )}
                          >
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Notes (optional)</div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any note for the provider..."
                className="min-h-[70px]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={!canConfirm}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Confirm booking
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
