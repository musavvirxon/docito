// File: src/components/booking/AppointmentBookingPopup.tsx
import { useEffect, useMemo, useState } from "react";
import { format, addDays, parseISO, startOfDay, isBefore } from "date-fns";
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
  Video,
  MessageSquare,
  MapPin,
  Stethoscope,
  Building2,
} from "lucide-react";
import { useAvailability } from "@/hooks/useAvailability";
import { useBookAppointment } from "@/hooks/useBookAppointment";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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

type AppointmentTypeKey = "video" | "messaging" | "in-person" | "consultation" | "appointment";

function normalizeAppointmentType(v?: string): AppointmentTypeKey {
  const s = String(v || "").toLowerCase().trim();
  if (s === "video" || s === "video_call" || s === "videocall") return "video";
  if (s === "messaging" || s === "message" || s === "chat") return "messaging";
  if (s === "in-person" || s === "in_person" || s === "inperson") return "in-person";
  if (s === "consultation") return "consultation";
  return "appointment";
}

function appointmentTypeMeta(t: AppointmentTypeKey) {
  switch (t) {
    case "video":
      return { label: "Video call", Icon: Video };
    case "messaging":
      return { label: "Messaging", Icon: MessageSquare };
    case "in-person":
      return { label: "In-person", Icon: MapPin };
    case "consultation":
      return { label: "Consultation", Icon: Stethoscope };
    default:
      return { label: "Appointment", Icon: Stethoscope };
  }
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

  const typeKey = useMemo(() => normalizeAppointmentType(appointmentType), [appointmentType]);
  const typeMeta = useMemo(() => appointmentTypeMeta(typeKey), [typeKey]);

  const [resolvedProviderName, setResolvedProviderName] = useState<string>(providerName || "");
  const [providerClinicName, setProviderClinicName] = useState<string>("");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"date" | "time" | "confirm" | "success">("date");

  const { loading: slotsLoading, fetchAvailability, getAvailableSlotsForDate } = useAvailability({
    entityId,
    providerId,
    appointmentType,
  });

  const { bookAppointment, loading: bookingLoading, result } = useBookAppointment();

  // Keep providerName prop in sync if parent passes it later
  useEffect(() => {
    setResolvedProviderName(providerName || "");
  }, [providerName]);

  // If providerName is missing, fetch it from DB using providerId
  useEffect(() => {
    const loadProviderName = async () => {
      if (!open) return;
      if (resolvedProviderName) return;
      if (!providerId) return;

      try {
        const { data, error } = await supabase
          .from("doctors")
          .select(
            `
            id,
            practices:practice_id ( name ),
            profiles:user_id ( full_name )
          `,
          )
          .eq("id", providerId)
          .maybeSingle();

        if (error) throw error;
        const fullName = (data as any)?.profiles?.full_name || "";
        const clinicName = (data as any)?.practices?.name || "";
        if (fullName) setResolvedProviderName(fullName);
        if (clinicName) setProviderClinicName(clinicName);
      } catch {
        // ignore; fallback to "Doctor"
      }
    };

    loadProviderName();
  }, [open, providerId, resolvedProviderName]);

  // Fetch availability when date range changes
  useEffect(() => {
    if (open && selectedDate) {
      const from = format(selectedDate, "yyyy-MM-dd");
      const to = format(addDays(selectedDate, 7), "yyyy-MM-dd");
      fetchAvailability(from, to);
    }
  }, [open, selectedDate, fetchAvailability]);

  // Reset state when popup closes
  useEffect(() => {
    if (!open) {
      setSelectedSlot(null);
      setNotes("");
      setStep("date");
      setSelectedDate(startOfDay(new Date()));
    }
  }, [open]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date ? startOfDay(date) : undefined);
    setSelectedSlot(null);
    if (date) setStep("time");
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    setStep("confirm");
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;

    const booked = await bookAppointment({
      entityId,
      providerId,
      slotStart: selectedSlot,
      appointmentType,
      notes: notes.trim() || undefined,
    });

    if (booked) {
      setStep("success");
      onSuccess?.(booked.appointment_id);
    }
  };

  const handleLoginRedirect = () => {
    onOpenChange(false);
    navigate("/auth?redirect=" + encodeURIComponent(window.location.pathname));
  };

  const availableSlots = selectedDate ? getAvailableSlotsForDate(format(selectedDate, "yyyy-MM-dd")) : [];

  // Check if user is logged in
  if (!user && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              Please sign in to book an appointment{" "}
              {resolvedProviderName ? `with ${resolvedProviderName}` : "with the doctor"}.
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

  const TypeIcon = typeMeta.Icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{step === "success" ? "Appointment Confirmed!" : "Book Appointment"}</DialogTitle>
          <DialogDescription>
            <span className="inline-flex items-center gap-2">
              <TypeIcon className="h-4 w-4" />
              <span>{typeMeta.label}</span>
              <span className="text-muted-foreground">•</span>
              {resolvedProviderName ? (
                <span className="inline-flex items-center gap-2">
                  <Badge variant="outline">Dr. {resolvedProviderName}</Badge>
                  <span className="text-muted-foreground">at</span>
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{providerClinicName || entityName}</span>
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{entityName}</span>
                </span>
              )}
            </span>
          </DialogDescription>
        </DialogHeader>

        {step === "date" && (
          <div className="py-4">
            <Label className="text-sm font-medium mb-3 block">Date &amp; Duration</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              weekStartsOn={1}
              disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
              className="rounded-md border mx-auto"
            />
          </div>
        )}

        {step === "time" && selectedDate && (
          <div className="py-4">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
              <Button variant="ghost" size="sm" onClick={() => setStep("date")} className="ml-auto">
                Change
              </Button>
            </div>

            {slotsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading available times...</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No available slots for this date</p>
                <Button variant="outline" onClick={() => setStep("date")} className="mt-4">
                  Select Another Date
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot) => {
                    const time = parseISO(slot.start_at);
                    return (
                      <Button
                        key={slot.start_at}
                        variant={selectedSlot === slot.start_at ? "default" : "outline"}
                        size="sm"
                        className="justify-center"
                        onClick={() => handleSlotSelect(slot.start_at)}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {format(time, "h:mm a")}
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
                <TypeIcon className="h-4 w-4 text-primary" />
                <span className="font-medium">{typeMeta.label}</span>
                {resolvedProviderName ? <Badge variant="outline" className="ml-2">Dr. {resolvedProviderName}</Badge> : null}
              </div>

              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <span className="font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>{format(parseISO(selectedSlot), "h:mm a")}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{providerClinicName || entityName}</span>
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
              <Button variant="outline" className="flex-1" onClick={() => setStep("time")} disabled={bookingLoading}>
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
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Your appointment is confirmed!</h3>
            <p className="text-muted-foreground mb-4">
              {format(parseISO(`${result.appointment_date}T${result.start_time}`), "EEEE, MMMM d, yyyy")} at{" "}
              {format(parseISO(`${result.appointment_date}T${result.start_time}`), "h:mm a")}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => navigate(`/booking-confirmation/${result.appointment_id}`)}>View Details</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AppointmentBookingPopup;
