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
  const { scheduleSettings, updateScheduleSettings, scheduleLoading } = useDoctorData();
  const { procedures } = useProcedures();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>("");
  const [bufferTime, setBufferTime] = useState(15);
  
  // Modal states
  const [isBlockTimeOpen, setIsBlockTimeOpen] = useState(false);
  const [isSetAvailabilityOpen, setIsSetAvailabilityOpen] = useState(false);
  const [isBookAppointmentOpen, setIsBookAppointmentOpen] = useState(false);
  const [isGoogleSyncOpen, setIsGoogleSyncOpen] = useState(false);
  
  // Prefilled modal data from slot clicks
  const [prefilledModalDate, setPrefilledModalDate] = useState<Date | undefined>();
  const [prefilledModalTime, setPrefilledModalTime] = useState<string>("");
  
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
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" }
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
      toast.success("Availability settings saved successfully");
    } else {
      toast.error("Failed to save availability settings");
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
                {doctorStatus === "clinic-member" ? "Clinic Calendar" : "My Calendar"}
              </CardTitle>
              <p className="text-muted-foreground">
                {doctorStatus === "clinic-member" 
                  ? "View your schedule synced with clinic bookings"
                  : "Manage your availability and appointments"
                }
              </p>
            </div>
            <Button>
              <Settings className="w-4 h-4 mr-2" />
              Calendar Settings
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Schedule Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Procedure Selector */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <Label className="flex items-center gap-2 mb-2">
                <Stethoscope className="h-4 w-4" />
                Select Procedure/Service
              </Label>
              <Select value={selectedProcedureId} onValueChange={setSelectedProcedureId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a procedure to see available time slots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Standard Appointment (30 min)</SelectItem>
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
                    <p className="text-muted-foreground">Loading slots...</p>
                  </div>
                ) : isHoliday(selectedDate) ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 mb-2">
                      Holiday / Day Off
                    </Badge>
                    <p className="text-muted-foreground">No appointments scheduled</p>
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border mb-2">
                      Not a Working Day
                    </Badge>
                    <p className="text-muted-foreground">Office is closed</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {timeSlots.map((slot, index) => (
                      <TimeSlotCard
                        key={`${slot.time}-${index}`}
                        slot={slot}
                        onBlockTime={(time) => {
                          setPrefilledModalDate(selectedDate);
                          setPrefilledModalTime(time);
                          setIsBlockTimeOpen(true);
                        }}
                        onBookAppointment={(time) => {
                          setPrefilledModalDate(selectedDate);
                          setPrefilledModalTime(time);
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
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => setIsBlockTimeOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Block Time
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => setIsSetAvailabilityOpen(true)}
            >
              <Clock className="w-4 h-4 mr-2" />
              Set Availability
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => setIsBookAppointmentOpen(true)}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
            {doctorStatus === "independent" && (
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => setIsGoogleSyncOpen(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Sync Google Calendar
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {doctorId && (
        <>
          <BlockTimeModal 
            isOpen={isBlockTimeOpen} 
            onClose={() => {
              setIsBlockTimeOpen(false);
              setPrefilledModalDate(undefined);
              setPrefilledModalTime("");
            }}
            prefilledDate={prefilledModalDate}
            prefilledTime={prefilledModalTime}
            onSuccess={() => {
              refetch();
              toast.success("Time blocked successfully");
            }}
          />
          <SetAvailabilityModal 
            isOpen={isSetAvailabilityOpen} 
            onClose={() => {
              setIsSetAvailabilityOpen(false);
              setPrefilledModalDate(undefined);
              setPrefilledModalTime("");
            }}
            doctorId={doctorId}
            onSuccess={() => {
              refetch();
              toast.success("Availability updated");
            }}
          />
          <ManualBookAppointmentModal
            isOpen={isBookAppointmentOpen}
            onClose={() => {
              setIsBookAppointmentOpen(false);
              setPrefilledModalDate(undefined);
              setPrefilledModalTime("");
            }}
            doctorId={doctorId}
            practiceId={practiceId || undefined}
            prefilledDate={prefilledModalDate}
            prefilledTime={prefilledModalTime}
            onSuccess={() => {
              refetch();
              toast.success("Appointment booked");
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
          <CardTitle>Availability Settings</CardTitle>
          <p className="text-muted-foreground">Configure your working hours and appointment settings</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Buffer Time Setting */}
          <div>
            <Label htmlFor="bufferTime">Buffer Time Between Appointments</Label>
            <Select value={bufferTime.toString()} onValueChange={(v) => setBufferTime(parseInt(v))}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No buffer</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Time added between appointments for preparation
            </p>
          </div>

          {/* Working Hours */}
          <div>
            <h3 className="font-medium mb-4">Weekly Schedule</h3>
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
                      <span className="text-muted-foreground">to</span>
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
                    <span className="text-muted-foreground">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSaveAvailability} disabled={scheduleLoading}>
            {scheduleLoading ? "Saving..." : "Save Availability Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorCalendarSection;