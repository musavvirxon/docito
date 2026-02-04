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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  type BookableProcedure = {
    id: string;
    name: string;
    category: string | null;
    price: number | null;
    default_cost: number | null;
    estimated_duration_minutes: number | null;
    duration_minutes: number | null;
  };

  const [bookableProcedures, setBookableProcedures] = useState<BookableProcedure[]>([]);
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [proceduresError, setProceduresError] = useState<string | null>(null);
  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(null);

  const selectedProcedure = useMemo(() => {
    if (!selectedProcedureId) return null;
    return bookableProcedures.find((p) => p.id === selectedProcedureId) || null;
  }, [bookableProcedures, selectedProcedureId]);

  const formatAmount = (amount: number | null | undefined) => {
    if (amount == null) return null;
    try {
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return String(amount);
    }
  };

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

  // Reset selection when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedProcedureId(null);
    }
  }, [open]);

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

  // Fetch doctor's bookable procedures for patient request (NO dental chart here)
  useEffect(() => {
    const run = async () => {
      if (!open) return;
      if (!providerId) return;

      setProceduresLoading(true);
      setProceduresError(null);

      try {
        const { data, error } = await supabase
          .from("procedures")
          .select("id, name, category, price, default_cost, estimated_duration_minutes, duration_minutes")
          .eq("dentist_id", providerId)
          .eq("is_active", true)
          .eq("is_bookable", true)
          .order("category", { ascending: true })
          .order("name", { ascending: true });

        if (error) throw error;

        setBookableProcedures((data as any) || []);
      } catch (e: any) {
        console.error(e);
        setBookableProcedures([]);
        setProceduresError(e?.message || "Failed to load procedures");
      } finally {
        setProceduresLoading(false);
      }
    };

    run();
  }, [open, providerId]);

  // Fetch availability when date range changes
  useEffect(() => {
    if (open && selectedDate) {
      const from = format(selectedDate, "yyyy-MM-dd");
      const to = format(addDays(selectedDate, 30), "yyyy-MM-dd"); // Fetch 30 days for calendar view
      fetchAvailability(from, to);
    }
  }, [open, selectedDate, fetchAvailability]);

  // Fetch blocked dates and working days for calendar UI
  useEffect(() => {
    const run = async () => {
      if (!open) return;
      if (!providerId) return;

      try {
        // Working days
        const { data: scheduleData } = await supabase
          .from("doctor_schedule_settings")
          .select("working_days")
          .eq("doctor_id", providerId)
          .maybeSingle();

        if ((scheduleData as any)?.working_days) {
          setWorkingDays((scheduleData as any).working_days as Record<string, boolean>);
        }

        // Blocked times -> blocked dates
        const { data: blocked } = await supabase
          .from("blocked_times")
          .select("blocked_date")
          .eq("doctor_id", providerId);

        const uniqueDates = Array.from(
          new Set((blocked || []).map((b: any) => b.blocked_date).filter(Boolean))
        ).map((d) => startOfDay(parseISO(String(d))));

        setBlockedDates(uniqueDates);
      } catch (e) {
        console.error(e);
      }
    };

    run();
  }, [open, providerId]);

  // Reset steps when opening
  useEffect(() => {
    if (open) {
      setStep("date");
      setSelectedDate(todayStart);
      setSelectedSlot(null);
      setNotes("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const availableSlotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return getAvailableSlotsForDate(selectedDate);
  }, [selectedDate, getAvailableSlotsForDate, slots]);

  const isDateBlocked = (date: Date) => {
    return blockedDates.some((d) => isSameDay(d, date));
  };

  const isNonWorkingDay = (date: Date) => {
    const day = format(date, "EEEE").toLowerCase();
    if (!workingDays || Object.keys(workingDays).length === 0) return false;
    return workingDays[day] === false;
  };

  const hasSlots = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    return Boolean((slots as any)?.[key]?.length);
  };

  const dateDisabled = (date: Date) => {
    // Past
    if (isBefore(date, todayStart)) return true;
    // Blocked
    if (isDateBlocked(date)) return true;
    // Non-working
    if (isNonWorkingDay(date)) return true;
    // No slots
    if (!hasSlots(date)) return true;
    return false;
  };

  const handleContinueFromDate = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!selectedDate) return;
    setStep("time");
  };

  const handleSelectTime = (slotIso: string) => {
    setSelectedSlot(slotIso);
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
      procedureId: selectedProcedureId,
    });

    if (res) {
      setStep("success");
      onSuccess?.(res.hold_id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
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
                <span className="w-3 h-3 rounded-full bg-muted" />
                <span>Unavailable</span>
              </div>
            </div>

            <div className="rounded-lg border p-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={dateDisabled}
                className={cn("w-full")}
                modifiers={{
                  today: (date) => isToday(date),
                  available: (date) => !dateDisabled(date),
                }}
                modifiersClassNames={{
                  today: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  available:
                    "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
                }}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleContinueFromDate} disabled={!selectedDate}>
                Continue
              </Button>
            </div>

            {!user && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border rounded-md p-3">
                <Lock className="h-4 w-4 mt-0.5" />
                <span>
                  You must be signed in to request an appointment. You’ll be redirected to sign in.
                </span>
              </div>
            )}
          </div>
        )}

        {step === "time" && selectedDate && (
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Select a Time</div>
                <div className="text-xs text-muted-foreground">{format(selectedDate, "EEEE, MMM d")}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep("date")}>
                Change date
              </Button>
            </div>

            {slotsLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading availability...
              </div>
            ) : availableSlotsForSelectedDate.length === 0 ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                No available slots for this date. Please select another date.
              </div>
            ) : (
              <ScrollArea className="h-[260px] pr-2">
                <div className="grid grid-cols-2 gap-2">
                  {availableSlotsForSelectedDate.map((slot: any) => {
                    const t = parseISO(String(slot.start_time));
                    const iso = slot.start_time;
                    return (
                      <Button
                        key={iso}
                        variant="outline"
                        className="justify-start"
                        onClick={() => handleSelectTime(iso)}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {format(t, "h:mm a")}
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
                <span className="font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
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
              <Label>Requested procedure (optional)</Label>

              {proceduresError ? (
                <div className="text-sm text-destructive">{proceduresError}</div>
              ) : (
                <Select
                  value={selectedProcedureId ?? "none"}
                  onValueChange={(v) => setSelectedProcedureId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={proceduresLoading ? "Loading procedures..." : "Select a procedure"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No preference</SelectItem>

                    {proceduresLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : bookableProcedures.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        No bookable procedures
                      </SelectItem>
                    ) : (
                      bookableProcedures.map((p) => {
                        const price = p.price ?? p.default_cost;
                        const duration = p.estimated_duration_minutes ?? p.duration_minutes;
                        const meta = [
                          p.category ? String(p.category) : null,
                          duration ? `${duration} min` : null,
                          price != null ? formatAmount(price) : null,
                        ].filter(Boolean);

                        return (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{p.name}</span>
                              {meta.length > 0 && (
                                <span className="text-xs text-muted-foreground">{meta.join(" • ")}</span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              )}

              {selectedProcedure && (
                <div className="text-xs text-muted-foreground">
                  Requested:{" "}
                  <span className="font-medium text-foreground">{selectedProcedure.name}</span>
                </div>
              )}
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
              <Button className="flex-1" onClick={handleConfirmBooking} disabled={bookingLoading}>
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
              <CheckCircle className="h-8 w-8 text-amber-600" />
            </div>
            <div className="text-lg font-semibold">Booking Hold Created</div>
            <div className="text-sm text-muted-foreground mt-1">
              Please confirm your appointment to finalize booking.
            </div>

            <div className="pt-6">
              <Button
                onClick={() => navigate(`/booking-confirmation/${result.hold_id}`)}
              >
                Continue to Confirmation
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
