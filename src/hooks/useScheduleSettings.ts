import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BreakTime {
  start_time: string;
  end_time: string;
  name: string;
}

export interface WorkingHours {
  enabled: boolean;
  start_time: string;
  end_time: string;
  breaks: BreakTime[];
}

export interface ScheduleSettings {
  working_days: Record<string, WorkingHours>;
  buffer_time: number;
  holidays: string[];
}

const DEFAULT_WORKING_HOURS: WorkingHours = {
  enabled: true,
  start_time: '09:00',
  end_time: '17:00',
  breaks: [
    {
      start_time: '12:00',
      end_time: '13:00',
      name: 'Lunch Break'
    }
  ]
};

const DEFAULT_WEEKEND_HOURS: WorkingHours = {
  enabled: false,
  start_time: '10:00',
  end_time: '14:00',
  breaks: []
};

export const useScheduleSettings = () => {
  const { user, profile } = useAuth();
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>({
    working_days: {
      monday: DEFAULT_WORKING_HOURS,
      tuesday: DEFAULT_WORKING_HOURS,
      wednesday: DEFAULT_WORKING_HOURS,
      thursday: DEFAULT_WORKING_HOURS,
      friday: DEFAULT_WORKING_HOURS,
      saturday: DEFAULT_WEEKEND_HOURS,
      sunday: DEFAULT_WEEKEND_HOURS
    },
    buffer_time: 15,
    holidays: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Use denormalized doctor_id from profile - no extra query
  const doctorId = (profile as any)?.doctor_id;

  const fetchScheduleSettings = useCallback(async () => {
    if (!user || !doctorId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch schedule settings from backend using doctor_id directly
      const { data, error } = await supabase
        .from('schedule_settings')
        .select('*')
        .eq('doctor_id', doctorId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setScheduleSettings({
          working_days: (data.working_days as unknown) as Record<string, WorkingHours>,
          buffer_time: data.buffer_time,
          holidays: data.holidays || []
        });
      }
    } catch (error) {
      console.error('Error loading schedule settings:', error);
      toast.error('Failed to load schedule settings');
    } finally {
      setLoading(false);
    }
  }, [user, doctorId]);

  const updateScheduleSettings = async (newSettings: ScheduleSettings) => {
    if (!user || !doctorId) return { error: 'User not authenticated or doctor profile missing' };

    try {
      setSaving(true);

      // Upsert schedule settings to backend using doctor_id directly
      const { error } = await supabase
        .from('schedule_settings')
        .upsert({
          doctor_id: doctorId,
          working_days: newSettings.working_days as any,
          buffer_time: newSettings.buffer_time,
          holidays: newSettings.holidays || []
        } as any, {
          onConflict: 'doctor_id'
        });

      if (error) throw error;

      setScheduleSettings(newSettings);
      toast.success('Schedule settings saved successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error saving schedule settings:', error);
      toast.error('Failed to save schedule settings');
      return { error: error.message };
    } finally {
      setSaving(false);
    }
  };

  const updateWorkingDay = (day: string, hours: WorkingHours) => {
    setScheduleSettings(prev => ({
      ...prev,
      working_days: {
        ...prev.working_days,
        [day]: hours
      }
    }));
  };

  const addBreak = (day: string, breakTime: BreakTime) => {
    setScheduleSettings(prev => ({
      ...prev,
      working_days: {
        ...prev.working_days,
        [day]: {
          ...prev.working_days[day],
          breaks: [...prev.working_days[day].breaks, breakTime]
        }
      }
    }));
  };

  const updateBreak = (day: string, index: number, breakTime: BreakTime) => {
    setScheduleSettings(prev => ({
      ...prev,
      working_days: {
        ...prev.working_days,
        [day]: {
          ...prev.working_days[day],
          breaks: prev.working_days[day].breaks.map((b, i) => 
            i === index ? breakTime : b
          )
        }
      }
    }));
  };

  const removeBreak = (day: string, index: number) => {
    setScheduleSettings(prev => ({
      ...prev,
      working_days: {
        ...prev.working_days,
        [day]: {
          ...prev.working_days[day],
          breaks: prev.working_days[day].breaks.filter((_, i) => i !== index)
        }
      }
    }));
  };

  const addHoliday = (date: string) => {
    setScheduleSettings(prev => ({
      ...prev,
      holidays: [...prev.holidays, date]
    }));
  };

  const removeHoliday = (date: string) => {
    setScheduleSettings(prev => ({
      ...prev,
      holidays: prev.holidays.filter(h => h !== date)
    }));
  };

  const copyMondayToWeekdays = () => {
    const mondayHours = scheduleSettings.working_days.monday;
    setScheduleSettings(prev => ({
      ...prev,
      working_days: {
        ...prev.working_days,
        tuesday: { ...mondayHours },
        wednesday: { ...mondayHours },
        thursday: { ...mondayHours },
        friday: { ...mondayHours }
      }
    }));
    toast.success('Monday schedule copied to weekdays');
  };

  const disableWeekends = () => {
    setScheduleSettings(prev => ({
      ...prev,
      working_days: {
        ...prev.working_days,
        saturday: { ...prev.working_days.saturday, enabled: false },
        sunday: { ...prev.working_days.sunday, enabled: false }
      }
    }));
    toast.success('Weekends disabled');
  };

  useEffect(() => {
    fetchScheduleSettings();
  }, [fetchScheduleSettings]);

  return {
    scheduleSettings,
    loading,
    saving,
    updateScheduleSettings,
    updateWorkingDay,
    addBreak,
    updateBreak,
    removeBreak,
    addHoliday,
    removeHoliday,
    copyMondayToWeekdays,
    disableWeekends,
    refetch: fetchScheduleSettings
  };
};