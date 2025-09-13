import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Calendar as CalendarIcon, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';

interface WorkingHours {
  enabled: boolean;
  startTime: string;
  endTime: string;
  breaks: BreakTime[];
}

interface BreakTime {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface ScheduleSettings {
  workingDays: {
    monday: WorkingHours;
    tuesday: WorkingHours;
    wednesday: WorkingHours;
    thursday: WorkingHours;
    friday: WorkingHours;
    saturday: WorkingHours;
    sunday: WorkingHours;
  };
  defaultBufferTime: number;
  holidays: Date[];
}

const DoctorScheduleSettings = () => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Default settings for new doctors
  const defaultWorkingHours: WorkingHours = {
    enabled: true,
    startTime: '09:00',
    endTime: '17:00',
    breaks: [
      {
        id: '1',
        name: 'Lunch Break',
        startTime: '12:00',
        endTime: '13:00'
      }
    ]
  };

  const defaultWeekendHours: WorkingHours = {
    enabled: false,
    startTime: '09:00',
    endTime: '17:00',
    breaks: []
  };

  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>({
    workingDays: {
      monday: defaultWorkingHours,
      tuesday: defaultWorkingHours,
      wednesday: defaultWorkingHours,
      thursday: defaultWorkingHours,
      friday: defaultWorkingHours,
      saturday: defaultWeekendHours,
      sunday: defaultWeekendHours,
    },
    defaultBufferTime: 15,
    holidays: []
  });

  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday', 
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  const updateWorkingDay = (day: keyof typeof scheduleSettings.workingDays, updates: Partial<WorkingHours>) => {
    setScheduleSettings(prev => ({
      ...prev,
      workingDays: {
        ...prev.workingDays,
        [day]: {
          ...prev.workingDays[day],
          ...updates
        }
      }
    }));
  };

  const addBreak = (day: keyof typeof scheduleSettings.workingDays) => {
    const newBreak: BreakTime = {
      id: Date.now().toString(),
      name: 'Break',
      startTime: '10:00',
      endTime: '10:15'
    };

    updateWorkingDay(day, {
      breaks: [...scheduleSettings.workingDays[day].breaks, newBreak]
    });
  };

  const updateBreak = (day: keyof typeof scheduleSettings.workingDays, breakId: string, updates: Partial<BreakTime>) => {
    const updatedBreaks = scheduleSettings.workingDays[day].breaks.map(b => 
      b.id === breakId ? { ...b, ...updates } : b
    );
    updateWorkingDay(day, { breaks: updatedBreaks });
  };

  const removeBreak = (day: keyof typeof scheduleSettings.workingDays, breakId: string) => {
    const updatedBreaks = scheduleSettings.workingDays[day].breaks.filter(b => b.id !== breakId);
    updateWorkingDay(day, { breaks: updatedBreaks });
  };

  const addHoliday = (date: Date | undefined) => {
    if (date && !scheduleSettings.holidays.some(h => h.getTime() === date.getTime())) {
      setScheduleSettings(prev => ({
        ...prev,
        holidays: [...prev.holidays, date]
      }));
      setSelectedDate(undefined);
    }
  };

  const removeHoliday = (date: Date) => {
    setScheduleSettings(prev => ({
      ...prev,
      holidays: prev.holidays.filter(h => h.getTime() !== date.getTime())
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call to save schedule settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Schedule settings saved:', scheduleSettings);
      
      toast({
        title: "Schedule Updated",
        description: "Your schedule settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save schedule settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const timeOptions = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <BackButton />
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Schedule Settings</h1>
            <p className="text-muted-foreground">Manage your working hours, breaks, and availability</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Working Days */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Working Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Object.entries(scheduleSettings.workingDays).map(([day, hours]) => (
                    <div key={day} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Switch
                            checked={hours.enabled}
                            onCheckedChange={(enabled) => updateWorkingDay(day as keyof typeof scheduleSettings.workingDays, { enabled })}
                          />
                          <Label className="text-base font-medium">{dayNames[day as keyof typeof dayNames]}</Label>
                        </div>
                        {hours.enabled && (
                          <Badge variant="outline" className="text-xs">
                            {hours.startTime} - {hours.endTime}
                          </Badge>
                        )}
                      </div>
                      
                      {hours.enabled && (
                        <div className="ml-8 space-y-4 border-l-2 border-muted pl-4">
                          {/* Working Hours */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm">Start Time</Label>
                              <Select
                                value={hours.startTime}
                                onValueChange={(time) => updateWorkingDay(day as keyof typeof scheduleSettings.workingDays, { startTime: time })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-background">
                                  {timeOptions.map(time => (
                                    <SelectItem key={time} value={time}>{time}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-sm">End Time</Label>
                              <Select
                                value={hours.endTime}
                                onValueChange={(time) => updateWorkingDay(day as keyof typeof scheduleSettings.workingDays, { endTime: time })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-background">
                                  {timeOptions.map(time => (
                                    <SelectItem key={time} value={time}>{time}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Breaks */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <Label className="text-sm font-medium">Breaks</Label>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addBreak(day as keyof typeof scheduleSettings.workingDays)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add Break
                              </Button>
                            </div>
                            
                            <div className="space-y-2">
                              {hours.breaks.map((breakTime) => (
                                <div key={breakTime.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                                  <Input
                                    placeholder="Break name"
                                    value={breakTime.name}
                                    onChange={(e) => updateBreak(day as keyof typeof scheduleSettings.workingDays, breakTime.id, { name: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                  <Select
                                    value={breakTime.startTime}
                                    onValueChange={(time) => updateBreak(day as keyof typeof scheduleSettings.workingDays, breakTime.id, { startTime: time })}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background">
                                      {timeOptions.map(time => (
                                        <SelectItem key={time} value={time}>{time}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={breakTime.endTime}
                                    onValueChange={(time) => updateBreak(day as keyof typeof scheduleSettings.workingDays, breakTime.id, { endTime: time })}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background">
                                      {timeOptions.map(time => (
                                        <SelectItem key={time} value={time}>{time}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeBreak(day as keyof typeof scheduleSettings.workingDays, breakTime.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {day !== 'sunday' && <Separator />}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Buffer Time Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Appointment Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Default Buffer Time Between Appointments</Label>
                      <Select
                        value={scheduleSettings.defaultBufferTime.toString()}
                        onValueChange={(value) => setScheduleSettings(prev => ({ ...prev, defaultBufferTime: parseInt(value) }))}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          <SelectItem value="5">5 minutes</SelectItem>
                          <SelectItem value="10">10 minutes</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Time between appointments for preparation and notes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Holidays and Days Off */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    Holidays & Days Off
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Holiday/Day Off
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        disabled={(date) => date < new Date()}
                      />
                      <div className="p-3 border-t">
                        <Button 
                          onClick={() => addHoliday(selectedDate)}
                          disabled={!selectedDate}
                          className="w-full"
                        >
                          Add Day Off
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <div className="space-y-2">
                    {scheduleSettings.holidays.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No holidays scheduled
                      </p>
                    ) : (
                      scheduleSettings.holidays.map((holiday, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <span className="text-sm">{format(holiday, 'PPP')}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeHoliday(holiday)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                    )}
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
                    variant="outline" 
                    className="w-full text-sm"
                    onClick={() => {
                      // Copy Monday schedule to weekdays
                      const mondaySchedule = scheduleSettings.workingDays.monday;
                      ['tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
                        updateWorkingDay(day as keyof typeof scheduleSettings.workingDays, {
                          enabled: mondaySchedule.enabled,
                          startTime: mondaySchedule.startTime,
                          endTime: mondaySchedule.endTime,
                          breaks: [...mondaySchedule.breaks]
                        });
                      });
                      toast({
                        title: "Schedule Copied",
                        description: "Monday schedule applied to all weekdays",
                      });
                    }}
                  >
                    Copy Monday to Weekdays
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full text-sm"
                    onClick={() => {
                      // Disable weekends
                      updateWorkingDay('saturday', { enabled: false });
                      updateWorkingDay('sunday', { enabled: false });
                      toast({
                        title: "Weekends Disabled",
                        description: "Saturday and Sunday are now disabled",
                      });
                    }}
                  >
                    Disable Weekends
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              size="lg"
              className="px-8"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Schedule Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorScheduleSettings;