import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import ManualBookAppointmentModal from "@/components/doctor/ManualBookAppointmentModal";
import { useTimeSlots } from "@/hooks/useTimeSlots";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type SlotAction = {
  date: Date;
  time?: string;
};

interface DoctorCalendarSectionProps {
  doctorId?: string; // optional because some code passes it, otherwise derived from user
  practiceId?: string;
}

const DoctorCalendarSection = ({ doctorId: doctorIdProp, practiceId }: DoctorCalendarSectionProps) => {
  const { user } = useAuth();

  const [doctorId, setDoctorId] = useState<string | null>(doctorIdProp || null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlotForAction, setSelectedSlotForAction] = useState<SlotAction | null>(null);

  const [isBookAppointmentOpen, setIsBookAppointmentOpen] = useState(false);

  // Load doctorId from authenticated user if not provided
  useEffect(() => {
    const loadDoctor = async () => {
      if (doctorIdProp) {
        setDoctorId(doctorIdProp);
        return;
      }
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error(error);
        toast.error("Failed to load doctor profile");
        return;
      }

      setDoctorId(data?.id ?? null);
    };

    loadDoctor();
  }, [doctorIdProp, user?.id]);

  // Slots: default 30 min
  const procedureDuration = 30;

  const { timeSlots, loading, refetch } = useTimeSlots({
    doctorId,
    selectedDate,
    procedureDuration,
    bufferTime: 0,
  });

  const dayLabel = useMemo(() => format(selectedDate, "EEEE, MMM d, yyyy"), [selectedDate]);

  const goPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const goNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const openManualBookingFromSlot = (time: string) => {
    setSelectedSlotForAction({ date: selectedDate, time });
    setIsBookAppointmentOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-xl">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg">Calendar</CardTitle>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={goPrevDay}>
              Prev
            </Button>

            <div className="text-sm font-medium px-2">{dayLabel}</div>

            <Button variant="outline" size="sm" onClick={goNextDay}>
              Next
            </Button>

            {/* ✅ FIX 1: Booking without selecting a slot uses the CURRENT VIEWED selectedDate */}
            <Button
              size="sm"
              onClick={() => {
                // Use the currently viewed date; leave time empty so user must pick time manually
                setSelectedSlotForAction({ date: selectedDate });
                setIsBookAppointmentOpen(true);
              }}
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              Book appointment
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Loading schedule...</div>
          ) : timeSlots.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No working hours configured for this day.
            </div>
          ) : (
            <div className="grid gap-2">
              {timeSlots.map((slot) => (
                <div
                  key={`${slot.time}-${slot.endTime}-${slot.status}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20"
                >
                  <div className="flex flex-col">
                    <div className="font-medium text-sm">
                      {slot.time} - {slot.endTime}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {slot.status}
                      {slot.patient ? ` • ${slot.patient}` : ""}
                      {slot.reason ? ` • ${slot.reason}` : ""}
                    </div>
                  </div>

                  {slot.status === "available" && (
                    <Button size="sm" variant="outline" onClick={() => openManualBookingFromSlot(slot.time)}>
                      Book
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Booking Modal */}
      {doctorId && (
        <ManualBookAppointmentModal
          isOpen={isBookAppointmentOpen}
          onClose={() => setIsBookAppointmentOpen(false)}
          doctorId={doctorId}
          practiceId={practiceId}
          onSuccess={() => refetch()}
          // ✅ FIX 1: Ensure modal ALWAYS books on currently viewed date
          prefilledDate={selectedSlotForAction?.date || selectedDate}
          prefilledTime={selectedSlotForAction?.time || undefined}
        />
      )}
    </div>
  );
};

export default DoctorCalendarSection;
