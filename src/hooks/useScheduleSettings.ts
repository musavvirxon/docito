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
  const { user } = useAuth();
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

  const fetchScheduleSettings = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // For now, load from localStorage as a fallback
      // In the future, this would connect to a schedule_settings table
      const saved = localStorage.getItem(`schedule_settings_${user.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setScheduleSettings(parsed);
      }
    } catch (error) {
      console.error('Error loading schedule settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateScheduleSettings = async (newSettings: ScheduleSettings) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      setSaving(true);
      
      // Save to localStorage for now
      localStorage.setItem(`schedule_settings_${user.id}`, JSON.stringify(newSettings));
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