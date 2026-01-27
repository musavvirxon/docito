// File: src/components/booking/AppointmentBookingPopup.tsx
import { useState, useEffect, useMemo } from "react";
import { format, addDays, parseISO, startOfDay, isBefore, isToday, isSameDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  Lock,
  User,
  Building2,
} from "lucide-react";
import { useAvailability } from "@/hooks/useAvailability";
import { useBookAppointment } from "@/hooks/useBookAppointment";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AppointmentBookingPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityName: string;
  providerId?: string;
  providerName?: string;
  appointmentType?: string;
  onSuccess?: (appointmentId: string) => void;
}

export function AppointmentBookingPopup({
  open,
  onOpenChange,
  entityId,
  entityName,
  providerId,
  providerName,
  appointmentType = "consultation",
  onSuccess,
}: AppointmentBookingPopupProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const todayStart = startOfDay(new Date());

  const [resolvedProviderName, setResolvedProviderName] = useState<string>(providerName || "");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(todayStart);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"date" | "time" | "confirm" | "success">("date");
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [workingDays, setWorkingDays] = useState<Record<string, boolean>>({});

  const { loading: slotsLoading, fetchAvailability, getAvailableSlotsForDate, slots } = useAvailability({
    entityId,
    providerId,
    appointmentType,
  });

  const { bookAppointment, loading: bookingLoading, result } = useBookAppointment();

  // Keep prop in sync (if parent updates it later)
  useEffect(() => {
    setResolvedProviderName(providerName || "");
  }, [providerName]);

  // If providerName isn't provided, fetch it using providerId (doctor -> profiles full_name)
  useEffect(() => {
    const run = async () => {
      if (!open) return;
      if (resolvedProviderName) return;
      if (!providerId) return;

      const { data, error } = await supabase
        .from("doctors")
        .select("id, profiles:user_id(full_name)")
        .eq("id", providerId)
        .maybeSingle();

      if (error) return;

      const fullName =
        (data as any)?.profiles?.full_name && String((data as any).profiles.full_name).trim()
          ? String((data as any).profiles.full_name).trim()
          : "";

      if (fullName) setResolvedProviderName(fullName);
    };

    run().catch(() => undefined);
  }, [open, providerId, resolvedProviderName]);

  // Fetch availability when date range changes
  useEffect(() => {
    if (open && selectedDate) {
      const from = format(selectedDate, "yyyy-MM-dd");
      const to = format(addDays(selectedDate, 30), "yyyy-MM-dd"); // Fetch 30 days for calendar view
      fetchAvailability(from, to);
    }
  }, [open, selectedDate, fetchAvailability]);

  // Fetch blocked times and working days for the doctor
  useEffect(() => {
    if (!open || !providerId) return;

    const fetchScheduleData = async () => {
      try {
        // Fetch blocked times
        const { data: blocked } = await supabase
          .from("blocked_times")
          .select("blocked_date")
          .eq("doctor_id", providerId)
          .gte("blocked_date", format(todayStart, "yyyy-MM-dd"));

        if (blocked) {
          setBlockedDates(blocked.map(b => new Date(b.blocked_date + "T00:00:00")));
        }

        // Fetch schedule settings for working days
        const { data: scheduleData } = await supabase
          .from("schedule_settings")
          .select("working_days")
          .eq("doctor_id", providerId)
          .maybeSingle();

        if (scheduleData?.working_days) {
          const wd = scheduleData.working_days as Record<string, { enabled: boolean }>;
          const days: Record<string, boolean> = {};
          Object.keys(wd).forEach(day => {
            days[day.toLowerCase()] = wd[day]?.enabled || false;
          });
          setWorkingDays(days);
        }
      } catch (err) {
        console.error("Failed to fetch schedule data:", err);
      }
    };

    fetchScheduleData();
  }, [open, providerId, todayStart]);

  // Compute which dates have available slots
  const datesWithAvailability = useMemo(() => {
    const dates = new Set<string>();
    slots.forEach(slot => {
      if (slot.available) {
        const dateStr = slot.start_at.split("T")[0];
        dates.add(dateStr);
      }
    });
    return dates;
  }, [slots]);

  // Reset state when popup closes
  useEffect(() => {
    if (!open) {
      setSelectedSlot(null);
      setNotes("");
      setStep("date");
      setSelectedDate(todayStart);
    }
  }, [open, todayStart]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const d = startOfDay(date);
    setSelectedDate(d);
    setSelectedSlot(null);
    setStep("time");
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    setStep("confirm");
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;

    const res = await bookAppointment({
      entityId,
      providerId,
      slotStart: selectedSlot,
      appointmentType,
      notes: notes.trim() || undefined,
    });

    if (res) {
      setStep("success");
      onSuccess?.(res.hold_id);
    }
  };

  const handleLoginRedirect = () => {
    onOpenChange(false);
    navigate("/auth?redirect=" + encodeURIComponent(window.location.pathname));
  };

  // Get available slots for selected date
  const availableSlots = selectedDate
    ? getAvailableSlotsForDate(format(selectedDate, "yyyy-MM-dd"))
    : [];

  const nowWithBufferMs = Date.now() + 60_000; // 1 minute buffer
  const isSlotPast = (iso: string) => {
    const t = parseISO(iso).getTime();
    return !Number.isFinite(t) || t <= nowWithBufferMs;
  };

  // Check if user is logged in
  if (!user && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              Please sign in to book an appointment{" "}
              {resolvedProviderName ? `with Dr. ${resolvedProviderName}` : ""} at {entityName}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <Button onClick={handleLoginRedirect}>Sign In to Continue</Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {step === "success" ? "Appointment Confirmed!" : "Book Appointment"}
          </DialogTitle>
          <DialogDescription>
            <span className="inline-flex items-center gap-2 flex-wrap">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{entityName}</span>
              {resolvedProviderName ? (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="inline-flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Dr. {resolvedProviderName}</span>
                  </span>
                </>
              ) : null}
            </span>
          </DialogDescription>
        </DialogHeader>

        {step === "date" && (
          <div className="py-4 space-y-4">
            <Label className="text-sm font-medium mb-3 block">Select a Date</Label>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                <span>Past/Unavailable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Day Off</span>
              </div>
            </div>
            
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              weekStartsOn={1}
              disabled={(date) => {
                const d = startOfDay(date);
                // Past dates
                if (isBefore(d, todayStart)) return true;
                // Blocked dates
                if (blockedDates.some(bd => isSameDay(bd, d))) return true;
                // Non-working days (if schedule configured)
                if (Object.keys(workingDays).length > 0) {
                  const dayName = format(d, "EEEE").toLowerCase();
                  if (!workingDays[dayName]) return true;
                }
                return false;
              }}
              modifiers={{
                today: (date) => isToday(date),
                available: (date) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  return datesWithAvailability.has(dateStr) && !isBefore(startOfDay(date), todayStart);
                },
                blocked: (date) => blockedDates.some(bd => isSameDay(bd, date)),
                dayOff: (date) => {
                  if (Object.keys(workingDays).length === 0) return false;
                  const dayName = format(date, "EEEE").toLowerCase();
                  return !workingDays[dayName] && !isBefore(startOfDay(date), todayStart);
                },
                past: (date) => isBefore(startOfDay(date), todayStart),
              }}
              modifiersClassNames={{
                today: "!bg-primary !text-primary-foreground font-bold",
                available: "!bg-emerald-100 dark:!bg-emerald-900/30 !text-emerald-700 dark:!text-emerald-300 hover:!bg-emerald-200 dark:hover:!bg-emerald-900/50",
                blocked: "!bg-destructive/20 !text-destructive line-through",
                dayOff: "!bg-amber-100 dark:!bg-amber-900/30 !text-amber-600 dark:!text-amber-400",
                past: "!bg-muted !text-muted-foreground opacity-50",
              }}
              className="rounded-md border mx-auto pointer-events-auto"
            />
          </div>
        )}

        {step === "time" && selectedDate && (
          <div className="py-4">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("date")}
                className="ml-auto"
              >
                Change
              </Button>
            </div>

            {slotsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">
                  Loading available times...
                </span>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  No available slots for this date
                </p>
                <Button
                  variant="outline"
                  onClick={() => setStep("date")}
                  className="mt-4"
                >
                  Select Another Date
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="grid grid-cols-3 gap-2 pr-2">
                  {availableSlots.map((slot) => {
                    const time = parseISO(slot.start_at);
                    const locked = isSlotPast(slot.start_at);

                    return (
                      <Button
                        key={slot.start_at}
                        variant={selectedSlot === slot.start_at ? "default" : "outline"}
                        size="sm"
                        className="justify-center"
                        onClick={() => handleSlotSelect(slot.start_at)}
                        disabled={locked} // ✅ Old times locked (not bookable)
                      >
                        {locked ? (
                          <span className="inline-flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5" />
                            {format(time, "h:mm a")}
                          </span>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            {format(time, "h:mm a")}
                          </>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {step === "confirm" && selectedDate && selectedSlot && (
          <div className="py-4 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <span className="font-medium">
                  {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>{format(parseISO(selectedSlot), "h:mm a")}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge variant="secondary" className="inline-flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  {entityName}
                </Badge>

                {resolvedProviderName ? (
                  <Badge variant="outline" className="inline-flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    Dr. {resolvedProviderName}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special requests or information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("time")}
                disabled={bookingLoading}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmBooking}
                disabled={bookingLoading}
              >
                {bookingLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "success" && result && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Almost there!
            </h3>
            <p className="text-muted-foreground mb-4">
              Your slot is reserved for{" "}
              {format(
                parseISO(`${result.appointment_date}T${result.start_time}`),
                "EEEE, MMMM d"
              )}{" "}
              at{" "}
              {format(
                parseISO(`${result.appointment_date}T${result.start_time}`),
                "h:mm a"
              )}
              . Please confirm to finalize your appointment.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  navigate(`/booking-confirmation/${result.hold_id}`)
                }
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Appointment
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AppointmentBookingPopup;
