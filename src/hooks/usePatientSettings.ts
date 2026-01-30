// Path: src/hooks/usePatientSettings.ts
import { useEffect, useState } from 'react';
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
  profileVisibility: boolean;
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

type UserSettingsGetRes = {
  ok: boolean;
  error?: string;
  settings?: {
    notifications?: Partial<NotificationSettings>;
    privacy?: Partial<PrivacySettings>;
  };
  account?: Partial<AccountSettings>;
};

type UserSettingsUpsertRes = UserSettingsGetRes;

const defaults = {
  notifications: {
    emailBookings: true,
    emailReminders: true,
    emailCancellations: true,
    smsBookings: false,
    smsReminders: true,
    smsCancellations: true,
    pushNotifications: true,
  } as NotificationSettings,
  privacy: {
    profileVisibility: true,
    shareAnalytics: true,
    marketingCommunications: false,
  } as PrivacySettings,
  account: {
    full_name: '',
    email: '',
    phone: null,
    date_of_birth: null,
    gender: null,
    address: null,
    timezone: 'America/New_York',
    language: 'en',
  } as AccountSettings,
};

export const usePatientSettings = () => {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaults.notifications);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(defaults.privacy);
  const [accountSettings, setAccountSettings] = useState<AccountSettings>(defaults.account);
  const [loading, setLoading] = useState(true);

  const { user, profile } = useAuth();

  const applyFromResponse = (res: UserSettingsGetRes) => {
    const n = { ...defaults.notifications, ...(res.settings?.notifications || {}) } as NotificationSettings;
    const p = { ...defaults.privacy, ...(res.settings?.privacy || {}) } as PrivacySettings;

    const a = {
      ...defaults.account,
      ...(res.account || {}),
    } as AccountSettings;

    // fallback to AuthContext profile if missing
    if (profile) {
      a.full_name = a.full_name || profile.full_name || '';
      a.email = a.email || profile.email || '';
      a.phone = a.phone ?? (profile.phone || null);
      a.date_of_birth = a.date_of_birth ?? ((profile as any).date_of_birth || null);
      a.gender = a.gender ?? ((profile as any).gender || null);
      a.address = a.address ?? ((profile as any).address || null);
      a.timezone = a.timezone || ((profile as any).timezone || defaults.account.timezone);
      a.language = a.language || ((profile as any).language || defaults.account.language);
    }

    setNotificationSettings(n);
    setPrivacySettings(p);
    setAccountSettings(a);
  };

  const fetchSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke<UserSettingsGetRes>('user-settings', {
        body: { action: 'get' },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Failed to load settings');

      applyFromResponse(data);
    } catch (err: any) {
      console.error('Error fetching patient settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const upsert = async (patch: {
    notifications?: Partial<NotificationSettings>;
    privacy?: Partial<PrivacySettings>;
    account?: Partial<AccountSettings>;
  }) => {
    const { data, error } = await supabase.functions.invoke<UserSettingsUpsertRes>('user-settings', {
      body: { action: 'upsert', patch },
    });

    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || 'Failed to save settings');

    applyFromResponse(data);
    return { success: true };
  };

  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    try {
      await upsert({ notifications: settings });
      toast.success('Notification preferences updated');
      return { success: true };
    } catch (error: any) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update notification preferences');
      return { error: error.message };
    }
  };

  const updatePrivacySettings = async (settings: Partial<PrivacySettings>) => {
    try {
      await upsert({ privacy: settings });
      toast.success('Privacy settings updated');
      return { success: true };
    } catch (error: any) {
      console.error('Error updating privacy settings:', error);
      toast.error('Failed to update privacy settings');
      return { error: error.message };
    }
  };

  const updateAccountSettings = async (settings: Partial<AccountSettings>) => {
    try {
      await upsert({ account: settings });
      toast.success('Account settings updated');
      return { success: true };
    } catch (error: any) {
      console.error('Error updating account settings:', error);
      toast.error('Failed to update account settings');
      return { error: error.message };
    }
  };

  const updatePassword = async (_currentPassword: string, newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('Password updated successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
      return { error: error.message };
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
