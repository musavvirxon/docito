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

export const usePatientSettings = () => {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailBookings: true,
    emailReminders: true,
    emailCancellations: true,
    smsBookings: false,
    smsReminders: true,
    smsCancellations: true,
    pushNotifications: true,
  });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    profileVisibility: true,
    shareAnalytics: true,
    marketingCommunications: false,
  });

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
    if (!user || !profile) return;

    try {
      setLoading(true);

      // Profile already has the settings from AuthContext
      if (profile.notification_settings) {
        setNotificationSettings(profile.notification_settings as NotificationSettings);
      }

      if (profile.privacy_settings) {
        setPrivacySettings(profile.privacy_settings as PrivacySettings);
      }

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
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = { ...notificationSettings, ...settings };

      const { error } = await supabase
        .from('profiles')
        .update({ notification_settings: updatedSettings })
        .eq('user_id', user?.id);

      if (error) throw error;

      setNotificationSettings(updatedSettings);
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
      const updatedSettings = { ...privacySettings, ...settings };

      const { error } = await supabase
        .from('profiles')
        .update({ privacy_settings: updatedSettings })
        .eq('user_id', user?.id);

      if (error) throw error;

      setPrivacySettings(updatedSettings);
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
      const { error } = await supabase
        .from('profiles')
        .update(settings)
        .eq('user_id', user?.id);

      if (error) throw error;

      setAccountSettings({ ...accountSettings, ...settings });
      toast.success('Account settings updated');
      return { success: true };
    } catch (error: any) {
      console.error('Error updating account settings:', error);
      toast.error('Failed to update account settings');
      return { error: error.message };
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

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
