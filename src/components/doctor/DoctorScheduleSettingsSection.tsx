import { useState, useEffect } from 'react';
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
import { Clock, Calendar as CalendarIcon, Plus, Trash2, Save, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useDoctorData } from '@/contexts/DoctorDataContext';
import { useTranslation } from 'react-i18next';

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

const DoctorScheduleSettingsSection = () => {
  const { t } = useTranslation("dashboard");
  const { toast } = useToast();
  const { scheduleSettings: contextScheduleSettings, updateScheduleSettings, scheduleLoading, refreshSchedule } = useDoctorData();
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

  // Convert context data to local format
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

  const getDayName = (day: string) => t(`doctor.schedule.days.${day}`);

  // Sync with context schedule settings
  useEffect(() => {
    if (contextScheduleSettings?.working_days) {
      const convertedSettings: ScheduleSettings = {
        workingDays: {
          monday: defaultWorkingHours,
          tuesday: defaultWorkingHours,
          wednesday: defaultWorkingHours,
          thursday: defaultWorkingHours,
          friday: defaultWorkingHours,
          saturday: defaultWeekendHours,
          sunday: defaultWeekendHours,
        },
        defaultBufferTime: contextScheduleSettings.buffer_time || 15,
        holidays: (contextScheduleSettings.holidays || []).map((h: string) => new Date(h))
      };

      Object.keys(contextScheduleSettings.working_days).forEach(day => {
        const dayData = contextScheduleSettings.working_days[day];
        convertedSettings.workingDays[day as keyof typeof convertedSettings.workingDays] = {
          enabled: dayData.enabled,
          startTime: dayData.start_time,
          endTime: dayData.end_time,
          breaks: (dayData.breaks || []).map((b: any, idx: number) => ({
            id: idx.toString(),
            name: b.name || 'Break',
            startTime: b.start_time,
            endTime: b.end_time
          }))
        };
      });

      setScheduleSettings(convertedSettings);
    }
  }, [contextScheduleSettings]);

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
      // Convert local format back to context format
      const convertedSettings = {
        working_days: {} as any,
        buffer_time: scheduleSettings.defaultBufferTime,
        holidays: scheduleSettings.holidays.map(h => h.toISOString().split('T')[0])
      };

      Object.keys(scheduleSettings.workingDays).forEach(day => {
        const dayData = scheduleSettings.workingDays[day as keyof typeof scheduleSettings.workingDays];
        convertedSettings.working_days[day] = {
          enabled: dayData.enabled,
          start_time: dayData.startTime,
          end_time: dayData.endTime,
          breaks: dayData.breaks.map(b => ({
            name: b.name,
            start_time: b.startTime,
            end_time: b.endTime
          }))
        };
      });

      const result = await updateScheduleSettings(convertedSettings);
      
      if (result.success) {
        toast({
          title: t("doctor.schedule.scheduleUpdated"),
          description: t("doctor.schedule.scheduleUpdatedDesc"),
        });
        
        // Refresh schedule data to ensure calendar is updated
        await refreshSchedule();
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: t("doctor.schedule.error"),
        description: t("doctor.schedule.saveFailed"),
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

  if (scheduleLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-foreground">{t("doctor.schedule.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t("doctor.schedule.title")}</h2>
          <p className="text-muted-foreground">{t("doctor.schedule.description")}</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("doctor.schedule.saving")}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {t("doctor.schedule.saveSettings")}
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Working Days */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t("doctor.schedule.workingHours")}
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
                      <Label className="text-base font-medium">{getDayName(day)}</Label>
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
                          <Label className="text-sm">{t("doctor.schedule.startTime")}</Label>
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
                          <Label className="text-sm">{t("doctor.schedule.endTime")}</Label>
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
                          <Label className="text-sm font-medium">{t("doctor.schedule.breaks")}</Label>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addBreak(day as keyof typeof scheduleSettings.workingDays)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            {t("doctor.schedule.addBreak")}
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          {hours.breaks.map((breakTime) => (
                            <div key={breakTime.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                              <Input
                                placeholder={t("doctor.schedule.breakName")}
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
              <CardTitle>{t("doctor.schedule.appointmentSettings")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>{t("doctor.schedule.bufferTime")}</Label>
                  <Select
                    value={scheduleSettings.defaultBufferTime.toString()}
                    onValueChange={(value) => setScheduleSettings(prev => ({ ...prev, defaultBufferTime: parseInt(value) }))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="5">5 {t("doctor.schedule.minutes")}</SelectItem>
                      <SelectItem value="10">10 {t("doctor.schedule.minutes")}</SelectItem>
                      <SelectItem value="15">15 {t("doctor.schedule.minutes")}</SelectItem>
                      <SelectItem value="30">30 {t("doctor.schedule.minutes")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("doctor.schedule.bufferTimeDesc")}
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
                {t("doctor.schedule.holidaysTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    {t("doctor.schedule.addHoliday")}
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
                      {t("doctor.schedule.addDayOff")}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              <div className="space-y-2">
                {scheduleSettings.holidays.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("doctor.schedule.noHolidays")}
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
              <CardTitle>{t("doctor.schedule.quickActions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full text-sm"
                onClick={() => {
                  // Copy Monday schedule to weekdays
                  const mondaySchedule = scheduleSettings.workingDays.monday;
                  const weekdays = ['tuesday', 'wednesday', 'thursday', 'friday'] as const;
                  
                  setScheduleSettings(prev => ({
                    ...prev,
                    workingDays: {
                      ...prev.workingDays,
                      ...weekdays.reduce((acc, day) => ({
                        ...acc,
                        [day]: { ...mondaySchedule }
                      }), {})
                    }
                  }));
                  
                  toast({
                    title: t("doctor.schedule.scheduleCopied"),
                    description: t("doctor.schedule.scheduleCopiedDesc"),
                  });
                }}
              >
                {t("doctor.schedule.copyMondayToWeekdays")}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full text-sm"
                onClick={() => {
                  setScheduleSettings(prev => ({
                    ...prev,
                    workingDays: {
                      ...prev.workingDays,
                      saturday: { ...defaultWeekendHours },
                      sunday: { ...defaultWeekendHours }
                    }
                  }));
                  
                  toast({
                    title: t("doctor.schedule.weekendsDisabled"),
                    description: t("doctor.schedule.weekendsDisabledDesc"),
                  });
                }}
              >
                {t("doctor.schedule.disableWeekends")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DoctorScheduleSettingsSection;