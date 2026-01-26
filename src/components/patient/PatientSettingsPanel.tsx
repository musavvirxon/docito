// File: src/components/patient/PatientSettingsPanel.tsx
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatientSettings } from "@/hooks/usePatientSettings";
import { Bell, Shield, User, Lock, Save } from "lucide-react";
import { useTranslation } from "react-i18next";

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
    setLocalAccount({ ...localAccount, [key]: value });
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
                    onChange={(e) => handleAccountChange("phone", e.target.value)}
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
                    onChange={(e) => handleAccountChange("date_of_birth", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t("patient.settings.account.address", { defaultValue: "Address" })}</Label>
                <Input
                  id="address"
                  value={localAccount.address || ""}
                  onChange={(e) => handleAccountChange("address", e.target.value)}
                />
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
                    {t("patient.settings.notifications.cancellationNotices", { defaultValue: "Cancellation Notices" })}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("patient.settings.notifications.cancellationNoticesDesc", {
                      defaultValue: "Receive cancellation confirmations",
                    })}
                  </p>
                </div>
                <Switch
                  checked={localNotifications.emailCancellations}
                  onCheckedChange={(value) => handleNotificationChange("emailCancellations", value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("patient.settings.notifications.smsTitle", { defaultValue: "SMS Notifications" })}</CardTitle>
              <CardDescription>
                {t("patient.settings.notifications.smsDescription", {
                  defaultValue: "Manage your SMS notification preferences",
                })}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("patient.settings.notifications.smsReminders", { defaultValue: "SMS Reminders" })}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("patient.settings.notifications.smsRemindersDesc", {
                      defaultValue: "Get text reminders before appointments",
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
                  <Label>{t("patient.settings.notifications.pushNotifications", { defaultValue: "Push Notifications" })}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("patient.settings.notifications.pushNotificationsDesc", {
                      defaultValue: "Receive in-app notifications",
                    })}
                  </p>
                </div>
                <Switch
                  checked={localNotifications.pushNotifications}
                  onCheckedChange={(value) => handleNotificationChange("pushNotifications", value)}
                />
              </div>
            </CardContent>
          </Card>

          {hasNotificationChanges && (
            <Button onClick={handleSaveNotifications}>
              <Save className="w-4 h-4 mr-2" />
              {t("patient.settings.notifications.save", { defaultValue: "Save Notification Settings" })}
            </Button>
          )}
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("patient.settings.privacy.title", { defaultValue: "Privacy Settings" })}</CardTitle>
              <CardDescription>
                {t("patient.settings.privacy.description", { defaultValue: "Control your privacy preferences" })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("patient.settings.privacy.shareProfile", { defaultValue: "Share Profile" })}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("patient.settings.privacy.shareProfileDesc", {
                      defaultValue: "Allow doctors to view your profile details",
                    })}
                  </p>
                </div>
                <Switch
                  checked={(localPrivacy as any).shareProfile ?? false}
                  onCheckedChange={(value) => handlePrivacyChange("shareProfile" as any, value)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("patient.settings.privacy.shareRecords", { defaultValue: "Share Records" })}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("patient.settings.privacy.shareRecordsDesc", {
                      defaultValue: "Allow doctors to view your medical records",
                    })}
                  </p>
                </div>
                <Switch
                  checked={(localPrivacy as any).shareRecords ?? false}
                  onCheckedChange={(value) => handlePrivacyChange("shareRecords" as any, value)}
                />
              </div>
            </CardContent>
          </Card>

          {hasPrivacyChanges && (
            <Button onClick={handleSavePrivacy}>
              <Save className="w-4 h-4 mr-2" />
              {t("patient.settings.privacy.save", { defaultValue: "Save Privacy Settings" })}
            </Button>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("patient.settings.security.title", { defaultValue: "Change Password" })}</CardTitle>
              <CardDescription>
                {t("patient.settings.security.description", { defaultValue: "Update your password to keep your account secure." })}
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

              <Button onClick={handleChangePassword}>
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
