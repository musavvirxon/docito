import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Settings } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useDoctorData } from "@/contexts/DoctorDataContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BlockTimeModal from "./BlockTimeModal";
import SetAvailabilityModal from "./SetAvailabilityModal";
import ManualBookAppointmentModal from "./ManualBookAppointmentModal";
import GoogleCalendarSyncModal from "./GoogleCalendarSyncModal";

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

interface TimeSlot {
  id: string;
  time: string;
  patient?: string;
  service?: string;
  status: "available" | "booked" | "blocked";
  reason?: string; // Reason for being blocked/unavailable
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  
  // Modal states
  const [isBlockTimeOpen, setIsBlockTimeOpen] = useState(false);
  const [isSetAvailabilityOpen, setIsSetAvailabilityOpen] = useState(false);
  const [isBookAppointmentOpen, setIsBookAppointmentOpen] = useState(false);
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

  // Fetch doctor ID and practice ID on mount
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
      setBufferTime(scheduleSettings.buffer_time.toString());
    }
  }, [scheduleSettings]);
  
  const [slotDuration, setSlotDuration] = useState("60");
  const [bufferTime, setBufferTime] = useState("15");

  // Check if a time is within a break period
  const isTimeInBreak = (timeMinutes: number, breaks: any[]): { inBreak: boolean; breakName?: string } => {
    for (const breakTime of breaks) {
      const [breakStartHour, breakStartMinute] = breakTime.start_time.split(':').map(Number);
      const [breakEndHour, breakEndMinute] = breakTime.end_time.split(':').map(Number);
      const breakStartMinutes = breakStartHour * 60 + breakStartMinute;
      const breakEndMinutes = breakEndHour * 60 + breakEndMinute;
      
      if (timeMinutes >= breakStartMinutes && timeMinutes < breakEndMinutes) {
        return { inBreak: true, breakName: breakTime.name || 'Break' };
      }
    }
    return { inBreak: false };
  };

  // Check if selected date is a holiday
  const isHoliday = (date: Date | undefined): boolean => {
    if (!date || !scheduleSettings?.holidays) return false;
    const dateStr = date.toISOString().split('T')[0];
    return scheduleSettings.holidays.includes(dateStr);
  };

  // Convert today's appointments to time slots based on working hours
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const selectedDayName = selectedDate ? dayNames[selectedDate.getDay()] : dayNames[new Date().getDay()];
    const daySchedule = workingHours[selectedDayName];
    
    // Check if it's a holiday
    if (isHoliday(selectedDate)) {
      return slots; // Return empty - will show holiday message in UI
    }
    
    if (!daySchedule || !daySchedule.enabled) {
      return slots; // Return empty if day is disabled - will show closed message in UI
    }
    
    // Parse start and end times with minutes
    const [startHour, startMinute] = daySchedule.start.split(':').map(Number);
    const [endHour, endMinute] = daySchedule.end.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const slotDurationMinutes = parseInt(slotDuration);
    const bufferMinutes = parseInt(bufferTime);
    
    // Get breaks for this day
    const breaks = scheduleSettings?.working_days?.[selectedDayName]?.breaks || [];
    
    // Generate slots based on slot duration
    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDurationMinutes + bufferMinutes) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Check if this time is during a break
      const breakCheck = isTimeInBreak(minutes, breaks);
      
      if (breakCheck.inBreak) {
        slots.push({
          id: `break-${minutes}`,
          time: timeString,
          status: "blocked",
          reason: `Break: ${breakCheck.breakName}`
        });
        continue;
      }
      
      const appointment = todaysAppointments.find(apt => apt.start_time === timeString);
      
      if (appointment) {
        slots.push({
          id: appointment.id,
          time: timeString,
          patient: appointment.patient_name,
          service: "Consultation",
          status: appointment.status === 'confirmed' ? "booked" : appointment.status as any
        });
      } else {
        slots.push({
          id: `slot-${minutes}`,
          time: timeString,
          status: "available"
        });
      }
    }
    
    return slots;
  };

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Regenerate time slots when working hours, appointments, or selected date changes
  useEffect(() => {
    setTimeSlots(generateTimeSlots());
  }, [workingHours, todaysAppointments, selectedDate, slotDuration]);

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
      buffer_time: parseInt(bufferTime)
    });

    if (result.success) {
      toast.success("Availability settings saved successfully");
    } else {
      toast.error("Failed to save availability settings");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "booked":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "blocked":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-green-100 text-green-700 border-green-200";
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
            <div className="flex gap-6">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
              
              <div className="flex-1">
                <h3 className="font-medium mb-4">
                  {selectedDate?.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                
                {isHoliday(selectedDate) ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 mb-2">
                      Holiday / Day Off
                    </Badge>
                    <p className="text-muted-foreground">No appointments scheduled</p>
                  </div>
                ) : !workingHours[selectedDate ? ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][selectedDate.getDay()] : 'monday']?.enabled ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200 mb-2">
                      Not a Working Day
                    </Badge>
                    <p className="text-muted-foreground">Office is closed</p>
                  </div>
                ) : timeSlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-muted-foreground">No time slots available</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {timeSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`p-3 rounded-lg border ${getStatusColor(slot.status)} flex justify-between items-center`}
                      >
                        <div>
                          <div className="font-medium">{slot.time}</div>
                          {slot.patient && (
                            <div className="text-sm">
                              <div>{slot.patient}</div>
                              <div className="text-muted-foreground">{slot.service}</div>
                            </div>
                          )}
                          {slot.reason && (
                            <div className="text-sm text-muted-foreground">{slot.reason}</div>
                          )}
                        </div>
                        <Badge variant="outline" className={getStatusColor(slot.status)}>
                          {slot.status}
                        </Badge>
                      </div>
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
            onClose={() => setIsBlockTimeOpen(false)} 
          />
          <SetAvailabilityModal 
            isOpen={isSetAvailabilityOpen} 
            onClose={() => setIsSetAvailabilityOpen(false)}
            doctorId={doctorId}
            onSuccess={() => toast.success("Calendar updated")}
          />
          <ManualBookAppointmentModal
            isOpen={isBookAppointmentOpen}
            onClose={() => setIsBookAppointmentOpen(false)}
            doctorId={doctorId}
            practiceId={practiceId || undefined}
            onSuccess={() => toast.success("Appointment booked")}
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
          {/* Slot Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="slotDuration">Appointment Slot Duration</Label>
              <Select value={slotDuration} onValueChange={setSlotDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="bufferTime">Buffer Time Between Appointments</Label>
              <Select value={bufferTime} onValueChange={setBufferTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No buffer</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
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