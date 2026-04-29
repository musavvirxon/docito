// Path: src/hooks/usePatientSettings.ts
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { updateProfileTimezone } from "@/lib/timezoneApi";

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
}

export interface AccountSettings {
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | "prefer_not_to_say" | null;
  address: string | null;
  profession: string | null;
  timezone: string;
  language: string;
}

type UserSettingsGetResp = {
  ok: boolean;
  settings?: Record<string, unknown>;
  meta?: { created_at?: string | null; updated_at?: string | null };
  error?: string;
};

type UserSettingsUpsertResp = {
  ok: boolean;
  settings?: Record<string, unknown>;
  meta?: { created_at?: string | null; updated_at?: string | null };
  error?: string;
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  emailBookings: true,
  emailReminders: true,
  emailCancellations: true,
  smsBookings: false,
  smsReminders: true,
  smsCancellations: true,
  pushNotifications: true,
};

const DEFAULT_PRIVACY: PrivacySettings = {
  shareProfile: true,
  shareRecords: true,
};

function asObject(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

function pickNotificationSettings(settings: Record<string, unknown>): NotificationSettings {
  const raw =
    (settings.notification_settings as any) ||
    (settings.notificationSettings as any) ||
    (settings.notifications as any) ||
    null;

  const obj = asObject(raw);

  return {
    emailBookings: Boolean(obj.emailBookings ?? DEFAULT_NOTIFICATIONS.emailBookings),
    emailReminders: Boolean(obj.emailReminders ?? DEFAULT_NOTIFICATIONS.emailReminders),
    emailCancellations: Boolean(obj.emailCancellations ?? DEFAULT_NOTIFICATIONS.emailCancellations),
    smsBookings: Boolean(obj.smsBookings ?? DEFAULT_NOTIFICATIONS.smsBookings),
    smsReminders: Boolean(obj.smsReminders ?? DEFAULT_NOTIFICATIONS.smsReminders),
    smsCancellations: Boolean(obj.smsCancellations ?? DEFAULT_NOTIFICATIONS.smsCancellations),
    pushNotifications: Boolean(obj.pushNotifications ?? DEFAULT_NOTIFICATIONS.pushNotifications),
  };
}

function pickPrivacySettings(settings: Record<string, unknown>): PrivacySettings {
  const raw =
    (settings.privacy_settings as any) ||
    (settings.privacySettings as any) ||
    (settings.privacy as any) ||
    null;

  const obj = asObject(raw);

  return {
    shareProfile: Boolean(obj.shareProfile ?? DEFAULT_PRIVACY.shareProfile),
    shareRecords: Boolean(obj.shareRecords ?? DEFAULT_PRIVACY.shareRecords),
  };
}

export const usePatientSettings = () => {
  const { user, profile } = useAuth();

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULT_PRIVACY);

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

  const profileAccount = useMemo(() => {
    return {
      full_name: (profile as any)?.full_name || "",
      email: (profile as any)?.email || "",
      phone: (profile as any)?.phone || null,
      date_of_birth: (profile as any)?.date_of_birth || null,
      gender: (profile as any)?.gender || null,
      address: (profile as any)?.address || null,
      timezone: (profile as any)?.timezone || "UTC",
      language: (profile as any)?.language || "en",
    } as AccountSettings;
  }, [profile]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Always reflect latest profile fields locally (account panel uses profiles)
      setAccountSettings(profileAccount);

      const { data, error } = await supabase.functions.invoke<UserSettingsGetResp>("user-settings", {
        body: { action: "get" },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to load settings");

      const settings = asObject(data.settings);
      setNotificationSettings(pickNotificationSettings(settings));
      setPrivacySettings(pickPrivacySettings(settings));
    } catch (err: any) {
      console.error("Error fetching patient settings:", err);
      toast.error(err?.message || "Failed to load settings");
      // Keep safe defaults on error
      setNotificationSettings(DEFAULT_NOTIFICATIONS);
      setPrivacySettings(DEFAULT_PRIVACY);
      setAccountSettings(profileAccount);
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationSettings = async (settings: Partial<NotificationSettings>) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const updatedSettings: NotificationSettings = { ...notificationSettings, ...settings };

      const { data, error } = await supabase.functions.invoke<UserSettingsUpsertResp>("user-settings", {
        body: {
          action: "upsert",
          merge: true,
          settings: { notification_settings: updatedSettings },
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to update notification preferences");

      const next = pickNotificationSettings(asObject(data.settings));
      setNotificationSettings(next);
      toast.success("Notification preferences updated");
      return { success: true };
    } catch (err: any) {
      console.error("Error updating notification settings:", err);
      toast.error(err?.message || "Failed to update notification preferences");
      return { error: err?.message || "Failed to update notification preferences" };
    }
  };

  const updatePrivacySettings = async (settings: Partial<PrivacySettings>) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const updatedSettings: PrivacySettings = { ...privacySettings, ...settings };

      const { data, error } = await supabase.functions.invoke<UserSettingsUpsertResp>("user-settings", {
        body: {
          action: "upsert",
          merge: true,
          settings: { privacy_settings: updatedSettings },
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Failed to update privacy settings");

      const next = pickPrivacySettings(asObject(data.settings));
      setPrivacySettings(next);
      toast.success("Privacy settings updated");
      return { success: true };
    } catch (err: any) {
      console.error("Error updating privacy settings:", err);
      toast.error(err?.message || "Failed to update privacy settings");
      return { error: err?.message || "Failed to update privacy settings" };
    }
  };

  const updateAccountSettings = async (settings: Partial<AccountSettings>) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const patch: Record<string, any> = { ...(settings as any) };

      // Step 6: Timezone must be updated via Edge Function (timezone-update)
      let tzUpdated: string | null = null;
      if (typeof settings.timezone === "string" && settings.timezone.trim()) {
        const next = settings.timezone.trim();
        const current = (accountSettings.timezone || "").trim();
        if (next && next !== current) {
          const res = await updateProfileTimezone(next, "manual");
          tzUpdated = res.timezone;
        }
        delete patch.timezone;
      }

      // Other fields update directly
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("profiles").update(patch as any).eq("user_id", user.id);
        if (error) throw error;
      }

      setAccountSettings((prev) => ({
        ...prev,
        ...settings,
        ...(tzUpdated ? { timezone: tzUpdated } : {}),
      }));

      toast.success("Account settings updated");
      return { success: true };
    } catch (err: any) {
      console.error("Error updating account settings:", err);
      toast.error(err?.message || "Failed to update account settings");
      return { error: err?.message || "Failed to update account settings" };
    }
  };

  const updatePassword = async (_currentPassword: string, newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Password updated successfully");
      return { success: true };
    } catch (err: any) {
      console.error("Error updating password:", err);
      toast.error(err?.message || "Failed to update password");
      return { error: err?.message || "Failed to update password" };
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    setAccountSettings(profileAccount);
  }, [profileAccount, user]);

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
