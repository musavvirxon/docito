import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, Settings } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

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
}

interface WorkingHours {
  [key: string]: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const DoctorCalendarSection = ({ doctorStatus, todaysAppointments = [], upcomingAppointments = [] }: DoctorCalendarSectionProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    monday: { enabled: true, start: "09:00", end: "17:00" },
    tuesday: { enabled: true, start: "09:00", end: "17:00" },
    wednesday: { enabled: true, start: "09:00", end: "17:00" },
    thursday: { enabled: true, start: "09:00", end: "17:00" },
    friday: { enabled: true, start: "09:00", end: "17:00" },
    saturday: { enabled: false, start: "09:00", end: "13:00" },
    sunday: { enabled: false, start: "09:00", end: "13:00" }
  });
  
  // Convert today's appointments to time slots
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 9;
    const endHour = 17;
    
    for (let hour = startHour; hour < endHour; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
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
          id: `slot-${hour}`,
          time: timeString,
          status: "available"
        });
      }
    }
    
    return slots;
  };

  const [timeSlots] = useState<TimeSlot[]>(generateTimeSlots());

  const [slotDuration, setSlotDuration] = useState("60");
  const [bufferTime, setBufferTime] = useState("15");

  const days = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" }
  ];

  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return { value: `${hour}:00`, label: `${hour}:00` };
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
                      </div>
                      <Badge variant="outline" className={getStatusColor(slot.status)}>
                        {slot.status}
                      </Badge>
                    </div>
                  ))}
                </div>
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
            <Button className="w-full justify-start" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Block Time
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Clock className="w-4 h-4 mr-2" />
              Set Availability
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
            {doctorStatus === "independent" && (
              <Button className="w-full justify-start" variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Sync Google Calendar
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

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

          <Button>Save Availability Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorCalendarSection;