// Path: src/components/patient/PatientSettingsPanel.tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePatientSettings } from "@/hooks/usePatientSettings";
import { Bell, Shield, User, Lock, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TimezoneCombobox } from "@/components/profile/TimezoneCombobox";

const languages = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "uz", label: "O'zbek" },
  { code: "ar", label: "العربية" },
  { code: "tr", label: "Türkçe" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "zh", label: "中文" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

export const PatientSettingsPanel = () => {
  const { t } = useTranslation("dashboard");
  const {
    notificationSettings,
    privacySettings,
    accountSettings,
    loading,
    updateNotificationSettings,
    updatePrivacySettings,
    updateAccountSettings,
    updatePassword,
  } = usePatientSettings();

  const [localNotifications, setLocalNotifications] = useState(notificationSettings);
  const [localPrivacy, setLocalPrivacy] = useState(privacySettings);
  const [localAccount, setLocalAccount] = useState(accountSettings);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [hasNotificationChanges, setHasNotificationChanges] = useState(false);
  const [hasPrivacyChanges, setHasPrivacyChanges] = useState(false);
  const [hasAccountChanges, setHasAccountChanges] = useState(false);

  // Keep local state in sync once hook finishes loading defaults
  useEffect(() => setLocalNotifications(notificationSettings), [notificationSettings]);
  useEffect(() => setLocalPrivacy(privacySettings), [privacySettings]);
  useEffect(() => setLocalAccount(accountSettings), [accountSettings]);

  const handleNotificationChange = (key: keyof typeof notificationSettings, value: boolean) => {
    setLocalNotifications({ ...localNotifications, [key]: value });
    setHasNotificationChanges(true);
  };

  const handlePrivacyChange = (key: keyof typeof privacySettings, value: boolean) => {
    setLocalPrivacy({ ...localPrivacy, [key]: value });
    setHasPrivacyChanges(true);
  };

  const handleAccountChange = (key: keyof typeof accountSettings, value: string) => {
    setLocalAccount({ ...localAccount, [key]: value } as any);
    setHasAccountChanges(true);
  };

  const handleSaveNotifications = async () => {
    await updateNotificationSettings(localNotifications);
    setHasNotificationChanges(false);
  };

  const handleSavePrivacy = async () => {
    await updatePrivacySettings(localPrivacy);
    setHasPrivacyChanges(false);
  };

  const handleSaveAccount = async () => {
    await updateAccountSettings(localAccount);
    setHasAccountChanges(false);
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return;
    }
    await updatePassword(passwordData.currentPassword, passwordData.newPassword);
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">
          {t("patient.settings.title", { defaultValue: "Settings" })}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t("patient.settings.subtitle", { defaultValue: "Manage your account, notifications, privacy, and security." })}
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account">
            <User className="w-4 h-4 mr-2" />
            {t("patient.settings.account", { defaultValue: "Account" })}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            {t("patient.settings.notifications", { defaultValue: "Notifications" })}
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="w-4 h-4 mr-2" />
            {t("patient.settings.privacy", { defaultValue: "Privacy" })}
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            {t("patient.settings.security", { defaultValue: "Security" })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("patient.settings.account.title", { defaultValue: "Account Information" })}
              </CardTitle>
              <CardDescription>
                {t("patient.settings.account.description", { defaultValue: "Update your personal details." })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    {t("patient.settings.account.fullName", { defaultValue: "Full Name" })}
                  </Label>
                  <Input
                    id="full_name"
                    value={localAccount.full_name}
                    onChange={(e) => handleAccountChange("full_name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("patient.settings.account.email", { defaultValue: "Email" })}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={localAccount.email}
                    onChange={(e) => handleAccountChange("email", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t("patient.settings.account.phone", { defaultValue: "Phone" })}</Label>
                  <Input
                    id="phone"
                    value={localAccount.phone || ""}
                    onChange={(e) => handleAccountChange("phone" as any, e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">
                    {t("patient.settings.account.dateOfBirth", { defaultValue: "Date of Birth" })}
                  </Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={localAccount.date_of_birth || ""}
                    onChange={(e) => handleAccountChange("date_of_birth" as any, e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t("patient.settings.account.address", { defaultValue: "Address" })}</Label>
                <Input
                  id="address"
                  value={localAccount.address || ""}
                  onChange={(e) => handleAccountChange("address" as any, e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {t("patient.settings.account.timezone", { defaultValue: "Timezone" })}
                  </Label>
                  <TimezoneCombobox
                    value={localAccount.timezone || "UTC"}
                    onValueChange={(tz) => handleAccountChange("timezone" as any, tz)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("patient.settings.account.timezoneHint", {
                      defaultValue: "Your calendar and referrals will display times in this timezone.",
                    })}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>
                    {t("patient.settings.account.language", { defaultValue: "Language" })}
                  </Label>
                  <Select
                    value={localAccount.language || "en"}
                    onValueChange={(v) => handleAccountChange("language" as any, v)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={t("patient.settings.account.selectLanguage", { defaultValue: "Select language" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((l) => (
                        <SelectItem key={l.code} value={l.code}>
                          {l.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasAccountChanges && (
                <Button onClick={handleSaveAccount} className="mt-4">
                  <Save className="w-4 h-4 mr-2" />
                  {t("patient.settings.account.saveChanges", { defaultValue: "Save Changes" })}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("patient.settings.notifications.emailTitle", { defaultValue: "Email Notifications" })}
              </CardTitle>
              <CardDescription>
                {t("patient.settings.notifications.emailDescription", { defaultValue: "Manage your email preferences." })}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>
                    {t("patient.settings.notifications.bookingConfirmations", { defaultValue: "Booking Confirmations" })}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("patient.settings.notifications.bookingConfirmationsDesc", {
                      defaultValue: "Receive emails when appointments are booked",
                    })}
                  </p>
                </div>
                <Switch
                  checked={localNotifications.emailBookings}
                  onCheckedChange={(value) => handleNotificationChange("emailBookings", value)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>
                    {t("patient.settings.notifications.appointmentReminders", { defaultValue: "Appointment Reminders" })}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("patient.settings.notifications.appointmentRemindersDesc", {
                      defaultValue: "Get reminded before your appointments",
                    })}
                  </p>
                </div>
                <Switch
                  checked={localNotifications.emailReminders}
                  onCheckedChange={(value) => handleNotificationChange("emailReminders", value)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>
                    {t("patient.settings.notifications.cancellations", { defaultValue: "Cancellations" })}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("patient.settings.notifications.cancellationsDesc", {
                      defaultValue: "Be notified when appointments are cancelled",
                    })}
                  </p>
                </div>
                <Switch
                  checked={localNotifications.emailCancellations}
                  onCheckedChange={(value) => handleNotificationChange("emailCancellations", value)}
                />
              </div>

              {hasNotificationChanges && (
                <Button onClick={handleSaveNotifications} className="mt-4">
                  <Save className="w-4 h-4 mr-2" />
                  {t("patient.settings.notifications.saveChanges", { defaultValue: "Save Changes" })}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t("patient.settings.notifications.smsTitle", { defaultValue: "SMS Notifications" })}
              </CardTitle>
              <CardDescription>
                {t("patient.settings.notifications.smsDescription", { defaultValue: "Manage your SMS preferences." })}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>
                    {t("patient.settings.notifications.smsBookings", { defaultValue: "Booking Confirmations" })}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("patient.settings.notifications.smsBookingsDesc", {
                      defaultValue: "Receive SMS when appointments are booked",
                    })}
                  </p>
                </div>
                <Switch
                  checked={localNotifications.smsBookings}
                  onCheckedChange={(value) => handleNotificationChange("smsBookings", value)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>
                    {t("patient.settings.notifications.smsReminders", { defaultValue: "Appointment Reminders" })}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("patient.settings.notifications.smsRemindersDesc", {
                      defaultValue: "Get SMS reminders before your appointments",
                    })}
                  </p>
                </div>
                <Switch
                  checked={localNotifications.smsReminders}
                  onCheckedChange={(value) => handleNotificationChange("smsReminders", value)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>
                    {t("patient.settings.notifications.smsCancellations", { defaultValue: "Cancellations" })}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("patient.settings.notifications.smsCancellationsDesc", {
                      defaultValue: "Receive SMS when appointments are cancelled",
                    })}
                  </p>
                </div>
                <Switch
                  checked={localNotifications.smsCancellations}
                  onCheckedChange={(value) => handleNotificationChange("smsCancellations", value)}
                />
              </div>

              {hasNotificationChanges && (
                <Button onClick={handleSaveNotifications} className="mt-4">
                  <Save className="w-4 h-4 mr-2" />
                  {t("patient.settings.notifications.saveChanges", { defaultValue: "Save Changes" })}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t("patient.settings.notifications.pushTitle", { defaultValue: "Push Notifications" })}
              </CardTitle>
              <CardDescription>
                {t("patient.settings.notifications.pushDescription", { defaultValue: "Manage your push notifications." })}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>
                    {t("patient.settings.notifications.pushEnabled", { defaultValue: "Enable Push Notifications" })}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("patient.settings.notifications.pushEnabledDesc", {
                      defaultValue: "Receive push notifications on this device",
                    })}
                  </p>
                </div>
                <Switch
                  checked={localNotifications.pushNotifications}
                  onCheckedChange={(value) => handleNotificationChange("pushNotifications", value)}
                />
              </div>

              {hasNotificationChanges && (
                <Button onClick={handleSaveNotifications} className="mt-4">
                  <Save className="w-4 h-4 mr-2" />
                  {t("patient.settings.notifications.saveChanges", { defaultValue: "Save Changes" })}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("patient.settings.privacy.title", { defaultValue: "Privacy Settings" })}
              </CardTitle>
              <CardDescription>
                {t("patient.settings.privacy.description", { defaultValue: "Control how your data is shared." })}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>
                    {t("patient.settings.privacy.shareProfile", { defaultValue: "Share Profile" })}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("patient.settings.privacy.shareProfileDesc", {
                      defaultValue: "Allow doctors to view your profile details",
                    })}
                  </p>
                </div>
                <Switch
                  checked={localPrivacy.shareProfile}
                  onCheckedChange={(value) => handlePrivacyChange("shareProfile", value)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>
                    {t("patient.settings.privacy.shareRecords", { defaultValue: "Share Medical Records" })}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("patient.settings.privacy.shareRecordsDesc", {
                      defaultValue: "Allow doctors to access your records when needed",
                    })}
                  </p>
                </div>
                <Switch
                  checked={localPrivacy.shareRecords}
                  onCheckedChange={(value) => handlePrivacyChange("shareRecords", value)}
                />
              </div>

              {hasPrivacyChanges && (
                <Button onClick={handleSavePrivacy} className="mt-4">
                  <Save className="w-4 h-4 mr-2" />
                  {t("patient.settings.privacy.saveChanges", { defaultValue: "Save Changes" })}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("patient.settings.security.title", { defaultValue: "Security" })}
              </CardTitle>
              <CardDescription>
                {t("patient.settings.security.description", { defaultValue: "Update your password." })}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">
                  {t("patient.settings.security.currentPassword", { defaultValue: "Current Password" })}
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  {t("patient.settings.security.newPassword", { defaultValue: "New Password" })}
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {t("patient.settings.security.confirmPassword", { defaultValue: "Confirm New Password" })}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
              </div>

              <Button onClick={handleChangePassword} className="mt-4">
                <Save className="w-4 h-4 mr-2" />
                {t("patient.settings.security.updatePassword", { defaultValue: "Update Password" })}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
