// File: src/components/referrals/PublishSlotsDialog.tsx
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { Referral } from "@/hooks/useReferrals";
import { cn } from "@/lib/utils";

type DraftSlot = {
  slot_date: string; // yyyy-mm-dd
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  notes?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referral: Referral;
  onPublish: (slots: DraftSlot[]) => Promise<void>;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isValidTime(t: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(t);
}

export function PublishSlotsDialog({ open, onOpenChange, referral, onPublish }: Props) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [notes, setNotes] = useState("");

  const [slots, setSlots] = useState<DraftSlot[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const dateISO = useMemo(() => {
    if (!date) return todayISO();
    return format(date, "yyyy-MM-dd");
  }, [date]);

  const addSlot = () => {
    if (!dateISO) return;
    if (!isValidTime(startTime) || !isValidTime(endTime)) return;

    const slot: DraftSlot = {
      slot_date: dateISO,
      start_time: startTime,
      end_time: endTime,
      notes: notes.trim() ? notes.trim() : undefined,
    };

    setSlots((prev) => [...prev, slot]);
    setNotes("");
  };

  const removeSlot = (idx: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const canPublish = slots.length > 0 && !submitting;

  const handlePublish = async () => {
    if (!canPublish) return;

    setSubmitting(true);
    try {
      // Server-side will enforce receiver permissions.
      await onPublish(slots);
      onOpenChange(false);
      setSlots([]);
    } catch (e) {
      console.error("PublishSlotsDialog.onPublish error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Publish time slots</DialogTitle>
          <DialogDescription>
            Add availability for referral <span className="font-medium">{referral.referral_number}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">Date</div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < minDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">Start</div>
                <Input value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="HH:mm" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">End</div>
                <Input value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="HH:mm" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Notes (optional)</div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., bring previous reports"
                className="min-h-[70px]"
              />
            </div>

            <Button type="button" onClick={addSlot} variant="secondary">
              <Plus className="h-4 w-4 mr-2" />
              Add slot
            </Button>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium">Slots to publish</div>
            <div className="rounded-md border max-h-[290px] overflow-auto">
              {slots.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  Add at least one slot.
                </div>
              ) : (
                <div className="divide-y">
                  {slots.map((s, idx) => (
                    <div key={`${s.slot_date}-${s.start_time}-${idx}`} className="p-3 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {s.slot_date} • {s.start_time}-{s.end_time}
                        </div>
                        {s.notes ? (
                          <div className="text-xs text-muted-foreground line-clamp-2">{s.notes}</div>
                        ) : null}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeSlot(idx)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handlePublish} disabled={!canPublish}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Publish
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
