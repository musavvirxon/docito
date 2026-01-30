// File: src/hooks/usePatientSettings.ts

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NotificationSettings {
  emailBookings: boolean;
  emailReminders: boolean;
  emailCancellations: boolean;
  smsBookings: boolean;
  smsReminders: boolean;
  smsCancellations: boolean;
  pushNotifications: boolean;
}

export interface PrivacySettings {
  shareProfile: boolean;
  shareRecords: boolean;
  shareAnalytics: boolean;
  marketingCommunications: boolean;
}

export interface AccountSettings {
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  address: string | null;
  timezone: string;
  language: string;
}

type SettingsBlob = Record<string, any>;

const defaultNotificationSettings: NotificationSettings = {
  emailBookings: true,
  emailReminders: true,
  emailCancellations: true,
  smsBookings: false,
  smsReminders: true,
  smsCancellations: true,
  pushNotifications: true,
};

const defaultPrivacySettings: PrivacySettings = {
  shareProfile: true,
  shareRecords: true,
  shareAnalytics: true,
  marketingCommunications: false,
};

const asObj = (v: any): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const pickNotificationSettings = (settings: SettingsBlob, profile: any | null): Partial<NotificationSettings> => {
  const fromUserSettings =
    asObj(settings.notificationSettings) ||
    asObj(settings.notifications) ||
    asObj(settings.notification_settings);

  const fromProfile = asObj(profile?.notification_settings);

  return { ...fromProfile, ...fromUserSettings };
};

const pickPrivacySettings = (settings: SettingsBlob, profile: any | null): Partial<PrivacySettings> => {
  const fromUserSettings =
    asObj(settings.privacySettings) ||
    asObj(settings.privacy) ||
    asObj(settings.privacy_settings);

  const fromProfile = asObj(profile?.privacy_settings);

  // Backward compat: if older keys exist in profiles/user_settings, map to current UI keys
  const mapped: Partial<PrivacySettings> = {
    shareProfile: fromUserSettings.shareProfile ?? fromUserSettings.profileVisibility ?? fromProfile.shareProfile ?? fromProfile.profileVisibility,
    shareRecords: fromUserSettings.shareRecords ?? fromProfile.shareRecords,
    shareAnalytics: fromUserSettings.shareAnalytics ?? fromProfile.shareAnalytics ?? true,
    marketingCommunications:
      fromUserSettings.marketingCommunications ?? fromProfile.marketingCommunications ?? false,
  };

  return { ...fromProfile, ...fromUserSettings, ...mapped };
};

export const usePatientSettings = () => {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(defaultPrivacySettings);

  const [accountSettings, setAccountSettings] = useState<AccountSettings>({
    full_name: '',
    email: '',
    phone: null,
    date_of_birth: null,
    gender: null,
    address: null,
    timezone: 'America/New_York',
    language: 'en',
  });

  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  const fetchSettings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let settings: SettingsBlob = {};
      const { data, error } = await supabase.functions.invoke('user-settings', {
        body: { action: 'get' },
      });

      if (!error && data?.ok) {
        settings = asObj(data.settings);
      }

      const mergedNotifications = {
        ...defaultNotificationSettings,
        ...pickNotificationSettings(settings, profile ?? null),
      } as NotificationSettings;

      const mergedPrivacy = {
        ...defaultPrivacySettings,
        ...pickPrivacySettings(settings, profile ?? null),
      } as PrivacySettings;

      setNotificationSettings(mergedNotifications);
      setPrivacySettings(mergedPrivacy);

      if (profile) {
        setAccountSettings({
          full_name: profile.full_name || '',
          email: profile.email || '',
          phone: profile.phone || null,
          date_of_birth: profile.date_of_birth || null,
          gender: profile.gender || null,
          address: profile.address || null,
          timezone: profile.timezone || 'America/New_York',
          language: profile.language || 'en',
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const updatedSettings = { ...notificationSettings, ...settings } as NotificationSettings;

      const { data, error } = await supabase.functions.invoke('user-settings', {
        body: {
          action: 'upsert',
          settings: { notificationSettings: updatedSettings },
          merge: true,
        },
      });

      if (error || !data?.ok) throw new Error((data as any)?.error || error?.message || 'Failed to update');

      setNotificationSettings(updatedSettings);

      // Best-effort sync into profiles for any legacy UI that reads profiles.notification_settings
      try {
        await supabase.from('profiles').update({ notification_settings: updatedSettings }).eq('user_id', user.id);
      } catch {
        // ignore
      }

      toast.success('Notification preferences updated');
      return { success: true };
    } catch (err: any) {
      console.error('Error updating notification settings:', err);
      toast.error('Failed to update notification preferences');
      return { error: err?.message || 'Failed to update notification preferences' };
    }
  };

  const updatePrivacySettings = async (settings: Partial<PrivacySettings>) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const updatedSettings = { ...privacySettings, ...settings } as PrivacySettings;

      const { data, error } = await supabase.functions.invoke('user-settings', {
        body: {
          action: 'upsert',
          settings: { privacySettings: updatedSettings },
          merge: true,
        },
      });

      if (error || !data?.ok) throw new Error((data as any)?.error || error?.message || 'Failed to update');

      setPrivacySettings(updatedSettings);

      // Best-effort sync into profiles for any legacy UI that reads profiles.privacy_settings
      try {
        await supabase.from('profiles').update({ privacy_settings: updatedSettings }).eq('user_id', user.id);
      } catch {
        // ignore
      }

      toast.success('Privacy settings updated');
      return { success: true };
    } catch (err: any) {
      console.error('Error updating privacy settings:', err);
      toast.error('Failed to update privacy settings');
      return { error: err?.message || 'Failed to update privacy settings' };
    }
  };

  const updateAccountSettings = async (settings: Partial<AccountSettings>) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase.from('profiles').update(settings).eq('user_id', user.id);
      if (error) throw error;

      setAccountSettings({ ...accountSettings, ...settings });
      toast.success('Account settings updated');
      return { success: true };
    } catch (err: any) {
      console.error('Error updating account settings:', err);
      toast.error('Failed to update account settings');
      return { error: err?.message || 'Failed to update account settings' };
    }
  };

  const updatePassword = async (_currentPassword: string, newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('Password updated successfully');
      return { success: true };
    } catch (err: any) {
      console.error('Error updating password:', err);
      toast.error('Failed to update password');
      return { error: err?.message || 'Failed to update password' };
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user, profile]);

  return {
    notificationSettings,
    privacySettings,
    accountSettings,
    loading,
    updateNotificationSettings,
    updatePrivacySettings,
    updateAccountSettings,
    updatePassword,
    refetch: fetchSettings,
  };
};
