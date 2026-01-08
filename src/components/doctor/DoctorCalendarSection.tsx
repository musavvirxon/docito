import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Settings, Stethoscope } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useDoctorData } from "@/contexts/DoctorDataContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BlockTimeModal from "./BlockTimeModal";
import SetAvailabilityModal from "./SetAvailabilityModal";
import ManualBookAppointmentModal from "./ManualBookAppointmentModal";
import GoogleCalendarSyncModal from "./GoogleCalendarSyncModal";
import TimeSlotCard from "./TimeSlotCard";
import { useProcedures } from "@/hooks/useProcedures";
import { useTimeSlots } from "@/hooks/useTimeSlots";
import { useTranslation } from "react-i18next";

interface DoctorCalendarSectionProps {
  doctorStatus: "independent" | "clinic-member";
  todaysAppointments?: {
    id: string;
    start_time: string;
    end_time: string;
    patient_name?: string;
    status: string;
  }[];
  upcomingAppointments?: {
    id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    patient_name?: string;
    status: string;
  }[];
}

interface WorkingHours {
  [key: string]: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const DoctorCalendarSection = ({ doctorStatus, todaysAppointments = [], upcomingAppointments = [] }: DoctorCalendarSectionProps) => {
  const { t } = useTranslation("dashboard");
  const { scheduleSettings, updateScheduleSettings, scheduleLoading } = useDoctorData();
  const { procedures } = useProcedures();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>("");
  const [bufferTime, setBufferTime] = useState(15);
  
  // Direct modal state (no slot selection popup)
  const [isBlockTimeOpen, setIsBlockTimeOpen] = useState(false);
  const [isBookAppointmentOpen, setIsBookAppointmentOpen] = useState(false);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [selectedSlotForAction, setSelectedSlotForAction] = useState<{ date: Date; time: string } | null>(null);
  
  const [isGoogleSyncOpen, setIsGoogleSyncOpen] = useState(false);
  
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    monday: { enabled: true, start: "09:00", end: "17:00" },
    tuesday: { enabled: true, start: "09:00", end: "17:00" },
    wednesday: { enabled: true, start: "09:00", end: "17:00" },
    thursday: { enabled: true, start: "09:00", end: "17:00" },
    friday: { enabled: true, start: "09:00", end: "17:00" },
    saturday: { enabled: false, start: "09:00", end: "13:00" },
    sunday: { enabled: false, start: "09:00", end: "13:00" }
  });
  
  // Get selected procedure duration
  const selectedProcedure = procedures.find(p => p.id === selectedProcedureId);
  const procedureDuration = selectedProcedure?.duration_minutes || 30;
  
  // Use the new time slots hook
  const { timeSlots, loading: slotsLoading, refetch } = useTimeSlots({
    doctorId,
    selectedDate,
    procedureDuration,
    bufferTime
  });

  // Fetch doctor info
  useEffect(() => {
    const fetchDoctorInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('doctors')
          .select('id, practice_id')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setDoctorId(data.id);
          setPracticeId(data.practice_id);
        }
      }
    };
    
    fetchDoctorInfo();
  }, []);

  // Sync with schedule settings from context
  useEffect(() => {
    if (scheduleSettings?.working_days) {
      const newWorkingHours: WorkingHours = {};
      Object.keys(scheduleSettings.working_days).forEach(day => {
        const daySettings = scheduleSettings.working_days[day];
        newWorkingHours[day] = {
          enabled: daySettings.enabled,
          start: daySettings.start_time,
          end: daySettings.end_time
        };
      });
      setWorkingHours(newWorkingHours);
    }
    
    // Sync buffer time
    if (scheduleSettings?.buffer_time) {
      setBufferTime(scheduleSettings.buffer_time);
    }
  }, [scheduleSettings]);

  // Check if selected date is a holiday
  const isHoliday = (date: Date): boolean => {
    if (!scheduleSettings?.holidays) return false;
    const dateStr = date.toISOString().split('T')[0];
    return scheduleSettings.holidays.includes(dateStr);
  };

  const days = [
    { key: "monday", label: t("doctor.schedule.days.monday") },
    { key: "tuesday", label: t("doctor.schedule.days.tuesday") },
    { key: "wednesday", label: t("doctor.schedule.days.wednesday") },
    { key: "thursday", label: t("doctor.schedule.days.thursday") },
    { key: "friday", label: t("doctor.schedule.days.friday") },
    { key: "saturday", label: t("doctor.schedule.days.saturday") },
    { key: "sunday", label: t("doctor.schedule.days.sunday") }
  ];

  const timeOptions = Array.from({ length: 96 }, (_, i) => {
    const totalMinutes = i * 15; // 15-minute intervals
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    return { value: timeString, label: timeString };
  });

  const updateWorkingHours = (day: string, field: string, value: string | boolean) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSaveAvailability = async () => {
    // Convert local state to schedule settings format
    const updatedWorkingDays: any = {};
    Object.keys(workingHours).forEach(day => {
      updatedWorkingDays[day] = {
        enabled: workingHours[day].enabled,
        start_time: workingHours[day].start,
        end_time: workingHours[day].end,
        breaks: scheduleSettings?.working_days?.[day]?.breaks || []
      };
    });

    const result = await updateScheduleSettings({
      ...scheduleSettings,
      working_days: updatedWorkingDays,
      buffer_time: bufferTime
    });

    if (result.success) {
      toast.success(t("doctor.schedule.scheduleUpdated"));
    } else {
      toast.error(t("doctor.schedule.saveFailed"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {doctorStatus === "clinic-member" ? t("doctor.calendar.clinicCalendar") : t("doctor.calendar.myCalendar")}
              </CardTitle>
              <p className="text-muted-foreground">
                {doctorStatus === "clinic-member" 
                  ? t("doctor.calendar.clinicCalendarDesc")
                  : t("doctor.calendar.myCalendarDesc")
                }
              </p>
            </div>
            <Button>
              <Settings className="w-4 h-4 mr-2" />
              {t("doctor.calendar.calendarSettings")}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("doctor.calendar.scheduleOverview")}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Procedure Selector */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <Label className="flex items-center gap-2 mb-2">
                <Stethoscope className="h-4 w-4" />
                {t("doctor.calendar.selectProcedure")}
              </Label>
              <Select value={selectedProcedureId} onValueChange={setSelectedProcedureId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("doctor.calendar.selectProcedurePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t("doctor.calendar.standardAppointment")}</SelectItem>
                  {procedures.map((procedure) => (
                    <SelectItem key={procedure.id} value={procedure.id}>
                      {procedure.name} ({procedure.duration_minutes} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-6">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
              
              <div className="flex-1">
                <h3 className="font-medium mb-4">
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                
                {slotsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">{t("doctor.calendar.loadingSlots")}</p>
                  </div>
                ) : isHoliday(selectedDate) ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 mb-2">
                      {t("doctor.calendar.holidayDayOff")}
                    </Badge>
                    <p className="text-muted-foreground">{t("doctor.calendar.noAppointmentsScheduled")}</p>
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border mb-2">
                      {t("doctor.calendar.notWorkingDay")}
                    </Badge>
                    <p className="text-muted-foreground">{t("doctor.calendar.officeClosed")}</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {timeSlots.map((slot, index) => (
                      <TimeSlotCard
                        key={`${slot.time}-${index}`}
                        slot={slot}
                        onBlockTime={(time) => {
                          setSelectedSlotForAction({ date: selectedDate, time });
                          setIsBlockTimeOpen(true);
                        }}
                        onBookAppointment={(time) => {
                          setSelectedSlotForAction({ date: selectedDate, time });
                          setIsBookAppointmentOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t("doctor.calendar.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => {
                setSelectedSlotForAction(null);
                setIsBlockTimeOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("doctor.calendar.blockTime")}
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => setIsAvailabilityOpen(true)}
            >
              <Clock className="w-4 h-4 mr-2" />
              {t("doctor.calendar.setAvailability")}
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => {
                setSelectedSlotForAction(null);
                setIsBookAppointmentOpen(true);
              }}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t("doctor.calendar.bookAppointment")}
            </Button>
            {doctorStatus === "independent" && (
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => setIsGoogleSyncOpen(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                {t("doctor.calendar.syncGoogleCalendar")}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals - Direct action (no slot selection popup) */}
      {doctorId && (
        <>
          {/* Block Time Modal */}
          <BlockTimeModal 
            isOpen={isBlockTimeOpen}
            onClose={() => {
              setIsBlockTimeOpen(false);
              setSelectedSlotForAction(null);
            }}
            preselectedSlot={selectedSlotForAction}
            onSuccess={async () => {
              await refetch();
              toast.success(t("doctor.calendar.timeBlockedSuccess"));
              setIsBlockTimeOpen(false);
              setSelectedSlotForAction(null);
            }}
          />
          
          {/* Book Appointment Modal */}
          <ManualBookAppointmentModal
            isOpen={isBookAppointmentOpen}
            onClose={() => {
              setIsBookAppointmentOpen(false);
              setSelectedSlotForAction(null);
            }}
            doctorId={doctorId}
            practiceId={practiceId || undefined}
            // If opened from a specific slot, prefill date/time.
            // If opened from Quick Actions, default to the currently selected calendar date.
            prefilledDate={selectedSlotForAction?.date ?? selectedDate}
            prefilledTime={selectedSlotForAction?.time}
            onSuccess={async () => {
              await refetch();
              toast.success(t("doctor.calendar.appointmentBookedSuccess"));
              setIsBookAppointmentOpen(false);
              setSelectedSlotForAction(null);
            }}
          />
          
          {/* Set Availability Modal */}
          <SetAvailabilityModal 
            isOpen={isAvailabilityOpen}
            onClose={() => setIsAvailabilityOpen(false)}
            doctorId={doctorId}
            onSuccess={async () => {
              await refetch();
              toast.success(t("doctor.calendar.availabilityUpdated"));
              setIsAvailabilityOpen(false);
            }}
          />
          
          <GoogleCalendarSyncModal
            isOpen={isGoogleSyncOpen}
            onClose={() => setIsGoogleSyncOpen(false)}
            doctorId={doctorId}
          />
        </>
      )}

      {/* Availability Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("doctor.calendar.availabilitySettings")}</CardTitle>
          <p className="text-muted-foreground">{t("doctor.calendar.configureWorkingHours")}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Buffer Time Setting */}
          <div>
            <Label htmlFor="bufferTime">{t("doctor.calendar.bufferTime")}</Label>
            <Select value={bufferTime.toString()} onValueChange={(v) => setBufferTime(parseInt(v))}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t("doctor.calendar.noBuffer")}</SelectItem>
                <SelectItem value="15">{t("doctor.calendar.minutes15")}</SelectItem>
                <SelectItem value="30">{t("doctor.calendar.minutes30")}</SelectItem>
                <SelectItem value="45">{t("doctor.calendar.minutes45")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              {t("doctor.calendar.bufferTimeDesc")}
            </p>
          </div>

          {/* Working Hours */}
          <div>
            <h3 className="font-medium mb-4">{t("doctor.calendar.weeklySchedule")}</h3>
            <div className="space-y-4">
              {days.map((day) => (
                <div key={day.key} className="flex items-center gap-4">
                  <div className="w-20">
                    <Switch
                      checked={workingHours[day.key].enabled}
                      onCheckedChange={(checked) => updateWorkingHours(day.key, 'enabled', checked)}
                    />
                  </div>
                  <div className="w-24 text-sm font-medium">{day.label}</div>
                  
                  {workingHours[day.key].enabled ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={workingHours[day.key].start}
                        onValueChange={(value) => updateWorkingHours(day.key, 'start', value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">{t("doctor.calendar.to")}</span>
                      <Select
                        value={workingHours[day.key].end}
                        onValueChange={(value) => updateWorkingHours(day.key, 'end', value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{t("doctor.calendar.closed")}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSaveAvailability} disabled={scheduleLoading}>
            {scheduleLoading ? t("doctor.calendar.saving") : t("doctor.calendar.saveAvailabilitySettings")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorCalendarSection;
