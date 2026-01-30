// src/hooks/usePatientSettings.ts
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
  address: string | null;
  timezone: string;
  language: string;
}

type UserSettingsGetResponse = {
  ok: boolean;
  error?: string;
  settings?: Record<string, unknown>;
  meta?: { created_at: string | null; updated_at: string | null };
};

type UserSettingsUpsertResponse = UserSettingsGetResponse;

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailBookings: true,
  emailReminders: true,
  emailCancellations: true,
  smsBookings: false,
  smsReminders: true,
  smsCancellations: true,
  pushNotifications: true,
};

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profileVisibility: true,
  shareAnalytics: true,
  marketingCommunications: false,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export const usePatientSettings = () => {
  const { user, profile } = useAuth();

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS,
  );
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS);

  const [accountSettings, setAccountSettings] = useState<AccountSettings>({
    full_name: "",
    email: "",
    phone: null,
    date_of_birth: null,
    gender: null,
    address: null,
    timezone: "UTC",
    language: "en",
  });

  const [loading, setLoading] = useState(true);

  const profileDerivedAccount = useMemo(() => {
    return {
      full_name: profile?.full_name || "",
      email: profile?.email || "",
      phone: profile?.phone || null,
      date_of_birth: profile?.date_of_birth || null,
      gender: (profile?.gender as any) || null,
      address: profile?.address || null,
      timezone: profile?.timezone || "UTC",
      language: profile?.language || "en",
    } satisfies AccountSettings;
  }, [profile]);

  const fetchSettings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Account settings: still sourced from profile (RLS-protected)
      setAccountSettings(profileDerivedAccount);

      // Notifications + privacy: stored in public.user_settings via edge function
      const { data, error } = await supabase.functions.invoke<UserSettingsGetResponse>("user-settings", {
        body: { action: "get" },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to load settings");

      const settings = (data?.settings || {}) as Record<string, unknown>;

      const notifRaw =
        (isRecord(settings.notifications) && settings.notifications) ||
        (isRecord(settings.notificationSettings) && settings.notificationSettings) ||
        null;

      const privacyRaw =
        (isRecord(settings.privacy) && settings.privacy) ||
        (isRecord(settings.privacySettings) && settings.privacySettings) ||
        null;

      if (notifRaw) {
        setNotificationSettings({
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...(notifRaw as Partial<NotificationSettings>),
        });
      } else if (profile?.notification_settings && isRecord(profile.notification_settings)) {
        // Back-compat fallback
        setNotificationSettings({
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...(profile.notification_settings as Partial<NotificationSettings>),
        });
      } else {
        setNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
      }

      if (privacyRaw) {
        setPrivacySettings({
          ...DEFAULT_PRIVACY_SETTINGS,
          ...(privacyRaw as Partial<PrivacySettings>),
        });
      } else if (profile?.privacy_settings && isRecord(profile.privacy_settings)) {
        // Back-compat fallback
        setPrivacySettings({
          ...DEFAULT_PRIVACY_SETTINGS,
          ...(profile.privacy_settings as Partial<PrivacySettings>),
        });
      } else {
        setPrivacySettings(DEFAULT_PRIVACY_SETTINGS);
      }
    } catch (e: any) {
      console.error("Error fetching settings:", e);
      toast.error(e?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const updatedSettings = { ...notificationSettings, ...settings };

      const { data, error } = await supabase.functions.invoke<UserSettingsUpsertResponse>("user-settings", {
        body: {
          action: "upsert",
          settings: { notifications: updatedSettings },
          merge: true,
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to update notification preferences");

      setNotificationSettings(updatedSettings);
      toast.success("Notification preferences updated");
      return { success: true };
    } catch (e: any) {
      console.error("Error updating notification settings:", e);
      toast.error(e?.message || "Failed to update notification preferences");
      return { error: e?.message || "Failed to update notification preferences" };
    }
  };

  const updatePrivacySettings = async (settings: Partial<PrivacySettings>) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const updatedSettings = { ...privacySettings, ...settings };

      const { data, error } = await supabase.functions.invoke<UserSettingsUpsertResponse>("user-settings", {
        body: {
          action: "upsert",
          settings: { privacy: updatedSettings },
          merge: true,
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to update privacy settings");

      setPrivacySettings(updatedSettings);
      toast.success("Privacy settings updated");
      return { success: true };
    } catch (e: any) {
      console.error("Error updating privacy settings:", e);
      toast.error(e?.message || "Failed to update privacy settings");
      return { error: e?.message || "Failed to update privacy settings" };
    }
  };

  const updateAccountSettings = async (settings: Partial<AccountSettings>) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const { error } = await supabase.from("profiles").update(settings).eq("user_id", user.id);
      if (error) throw error;

      setAccountSettings((prev) => ({ ...prev, ...settings }));
      toast.success("Account settings updated");
      return { success: true };
    } catch (e: any) {
      console.error("Error updating account settings:", e);
      toast.error(e?.message || "Failed to update account settings");
      return { error: e?.message || "Failed to update account settings" };
    }
  };

  const updatePassword = async (_currentPassword: string, newPassword: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Password updated successfully");
      return { success: true };
    } catch (e: any) {
      console.error("Error updating password:", e);
      toast.error(e?.message || "Failed to update password");
      return { error: e?.message || "Failed to update password" };
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user || !profile) return;
    // Keep account settings synced to profile updates
    setAccountSettings(profileDerivedAccount);
  }, [user, profile, profileDerivedAccount]);

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
