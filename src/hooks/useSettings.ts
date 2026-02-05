// File: src/hooks/useSettings.ts

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationSettings {
  emailBookings: boolean;
  emailReminders: boolean;
  emailCancellations: boolean;
  smsBookings: boolean;
  smsReminders: boolean;
  smsCancellations: boolean;
  pushNotifications: boolean;
}

interface CalendarSyncSettings {
  googleCalendar: boolean;
  outlookCalendar: boolean;
  appleCalendar: boolean;
}

interface AccountSettings {
  email: string;
  phone: string;
  timezone: string;
  language: string;
}

interface PrivacySettings {
  profileVisibility: boolean;
  shareAnalytics: boolean;
  marketingCommunications: boolean;
}

export const useSettings = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [accountSettings, setAccountSettings] = useState<AccountSettings>({
    email: '',
    phone: '',
    timezone: 'UTC',
    language: 'en'
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailBookings: true,
    emailReminders: true,
    emailCancellations: true,
    smsBookings: false,
    smsReminders: true,
    smsCancellations: true,
    pushNotifications: true
  });

  const [calendarSync, setCalendarSync] = useState<CalendarSyncSettings>({
    googleCalendar: false,
    outlookCalendar: false,
    appleCalendar: false
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profileVisibility: true,
    shareAnalytics: true,
    marketingCommunications: false
  });

  // Load settings from backend
  useEffect(() => {
    const loadSettings = async () => {
      if (!user || !profile) return;

      try {
        setLoading(true);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;

        setAccountSettings({
          email: profileData.email || '',
          phone: profileData.phone || '',
          timezone: profileData.timezone || 'UTC',
          language: profileData.language || 'en'
        });

        if (profileData.notification_settings) {
          setNotifications(profileData.notification_settings as unknown as NotificationSettings);
        }

        if (profileData.privacy_settings) {
          setPrivacySettings(profileData.privacy_settings as unknown as PrivacySettings);
        }

        if (profile.role === 'doctor') {
          const { data: doctorData } = await supabase
            .from('doctors')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (doctorData) {
            const { data: calendarData } = await supabase
              .from('google_calendar_sync')
              .select('sync_enabled')
              .eq('doctor_id', doctorData.id)
              .maybeSingle();

            if (calendarData) {
              setCalendarSync(prev => ({
                ...prev,
                googleCalendar: calendarData.sync_enabled
              }));
            }
          }
        }
      } catch (error: any) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user, profile]);

  // Update account settings
  const updateAccountSettings = async (newSettings: Partial<AccountSettings>) => {
    if (!user) return;

    try {
      setSaving(true);

      const patch: any = {
        email: newSettings.email,
        phone: newSettings.phone,
        timezone: newSettings.timezone,
        language: newSettings.language,
        updated_at: new Date().toISOString(),
      };

      if (typeof newSettings.timezone === "string" && newSettings.timezone.length) {
        patch.timezone_source = "manual";
        patch.timezone_updated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('user_id', user.id);

      if (error) throw error;

      setAccountSettings(prev => ({ ...prev, ...newSettings }));
      toast.success('Account settings updated successfully');
    } catch (error: any) {
      console.error('Error updating account settings:', error);
      toast.error('Failed to update account settings');
    } finally {
      setSaving(false);
    }
  };

  // Update notification settings
  const updateNotificationSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!user) return;

    try {
      setSaving(true);

      const updatedNotifications = { ...notifications, ...newSettings };

      const { error } = await supabase
        .from('profiles')
        .update({
          notification_settings: updatedNotifications,
          updated_at: new Date().toISOString()
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(updatedNotifications);
      toast.success('Notification preferences updated');
    } catch (error: any) {
      console.error('Error updating notifications:', error);
      toast.error('Failed to update notification preferences');
    } finally {
      setSaving(false);
    }
  };

  // Update calendar sync
  const updateCalendarSync = async (service: keyof CalendarSyncSettings, enabled: boolean) => {
    if (!user) return;

    try {
      setSaving(true);

      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!doctorData) throw new Error('Doctor profile not found');

      if (service === 'googleCalendar') {
        const { error } = await supabase
          .from('google_calendar_sync')
          .upsert({
            doctor_id: doctorData.id,
            sync_enabled: enabled,
            updated_at: new Date().toISOString()
          } as any);

        if (error) throw error;
      }

      setCalendarSync(prev => ({ ...prev, [service]: enabled }));
      toast.success(`${service} sync ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error('Error updating calendar sync:', error);
      toast.error('Failed to update calendar sync');
    } finally {
      setSaving(false);
    }
  };

  // Update privacy settings
  const updatePrivacySettings = async (newSettings: Partial<PrivacySettings>) => {
    if (!user) return;

    try {
      setSaving(true);

      const updatedPrivacy = { ...privacySettings, ...newSettings };

      const { error } = await supabase
        .from('profiles')
        .update({
          privacy_settings: updatedPrivacy,
          updated_at: new Date().toISOString()
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;

      setPrivacySettings(updatedPrivacy);
      toast.success('Privacy settings updated');
    } catch (error: any) {
      console.error('Error updating privacy settings:', error);
      toast.error('Failed to update privacy settings');
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    accountSettings,
    notifications,
    calendarSync,
    privacySettings,
    updateAccountSettings,
    updateNotificationSettings,
    updateCalendarSync,
    updatePrivacySettings,
  };
};
