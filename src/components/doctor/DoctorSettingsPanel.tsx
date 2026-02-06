import { useEffect, useMemo, useState } from "react";
import { User, Bell, Calendar, Shield, Building } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecuritySettings } from "../dashboard/SecuritySettings";
import { useSettings } from "@/hooks/useSettings";
import { TimezoneCombobox } from "@/components/profile/TimezoneCombobox";

const languages = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "ru", label: "Русский" },
  { code: "uz", label: "O'zbek" },
  { code: "ar", label: "العربية" },
];

export function DoctorSettingsPanel() {
  const [activeTab, setActiveTab] = useState("account");
  const { t } = useTranslation("dashboard");
  const {
    accountSettings,
    notifications,
    calendarSync,
    privacySettings,
    updateAccountSettings,
    updateNotificationSettings,
    updateCalendarSync,
    updatePrivacySettings,
    saving,
  } = useSettings();

  const [localAccount, setLocalAccount] = useState(accountSettings);
  const [hasAccountChanges, setHasAccountChanges] = useState(false);

  useEffect(() => {
    setLocalAccount(accountSettings);
    setHasAccountChanges(false);
  }, [accountSettings]);

  const handleAccountChange = (key: string, value: string) => {
    setLocalAccount((prev) => ({ ...prev, [key]: value }));
    setHasAccountChanges(true);
  };

  const handleAccountUpdate = async () => {
    await updateAccountSettings(localAccount);
    setHasAccountChanges(false);
  };

  const handleNotificationToggle = async (key: string, value: boolean) => {
    await updateNotificationSettings({ [key]: value } as any);
  };

  const handlePrivacyToggle = async (key: string, value: boolean) => {
    await updatePrivacySettings({ [key]: value } as any);
  };

  const saveDisabled = useMemo(() => saving || !hasAccountChanges, [saving, hasAccountChanges]);

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">{t("doctor.settings.title")}</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="account">
            <User className="w-4 h-4 mr-2" />
            {t("doctor.settings.account")}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            {t("doctor.settings.notifications")}
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="w-4 h-4 mr-2" />
            {t("doctor.settings.calendar")}
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            {t("doctor.settings.security")}
          </TabsTrigger>
          <TabsTrigger value="practice">
            <Building className="w-4 h-4 mr-2" />
            {t("doctor.settings.practice")}
          </TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("doctor.settings.personalInfo")}</CardTitle>
              <CardDescription>{t("doctor.settings.updateDetails")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">{t("doctor.settings.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={localAccount.email}
                    onChange={(e) => handleAccountChange("email", e.target.value)}
                    placeholder={t("doctor.settings.emailPlaceholder")}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{t("doctor.settings.phone")}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={localAccount.phone}
                    onChange={(e) => handleAccountChange("phone", e.target.value)}
                    placeholder={t("doctor.settings.phonePlaceholder")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("doctor.settings.timezone")}</Label>
                  <TimezoneCombobox
                    value={localAccount.timezone || "UTC"}
                    onValueChange={(tz) => handleAccountChange("timezone", tz)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("doctor.settings.timezoneHint", { defaultValue: "Your calendar will display times in this timezone." })}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">{t("doctor.settings.language")}</Label>
                  <Select
                    value={localAccount.language || "en"}
                    onValueChange={(value) => handleAccountChange("language", value)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={t("doctor.settings.selectLanguage")} />
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

              <Button onClick={handleAccountUpdate} disabled={saveDisabled}>
                {saving ? t("doctor.settings.saving") : t("doctor.settings.saveChanges")}
              </Button>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t("doctor.settings.privacySettings")}</CardTitle>
              <CardDescription>{t("doctor.settings.privacyDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("doctor.settings.profileVisibility")}</Label>
                  <p className="text-sm text-muted-foreground">{t("doctor.settings.profileVisibilityDesc")}</p>
                </div>
                <Switch
                  checked={privacySettings.profileVisibility}
                  onCheckedChange={(checked) => handlePrivacyToggle("profileVisibility", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("doctor.settings.shareAnalytics")}</Label>
                  <p className="text-sm text-muted-foreground">{t("doctor.settings.shareAnalyticsDesc")}</p>
                </div>
                <Switch checked={privacySettings.shareAnalytics} onCheckedChange={(checked) => handlePrivacyToggle("shareAnalytics", checked)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("doctor.settings.marketingCommunications")}</Label>
                  <p className="text-sm text-muted-foreground">{t("doctor.settings.marketingDesc")}</p>
                </div>
                <Switch
                  checked={privacySettings.marketingCommunications}
                  onCheckedChange={(checked) => handlePrivacyToggle("marketingCommunications", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("doctor.settings.emailNotifications")}</CardTitle>
              <CardDescription>{t("doctor.settings.emailNotificationsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("doctor.settings.appointmentBookings")}</Label>
                  <p className="text-sm text-muted-foreground">{t("doctor.settings.appointmentBookingsDesc")}</p>
                </div>
                <Switch checked={notifications.emailBookings} onCheckedChange={(checked) => handleNotificationToggle("emailBookings", checked)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("doctor.settings.appointmentReminders")}</Label>
                  <p className="text-sm text-muted-foreground">{t("doctor.settings.appointmentRemindersDesc")}</p>
                </div>
                <Switch checked={notifications.emailReminders} onCheckedChange={(checked) => handleNotificationToggle("emailReminders", checked)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("doctor.settings.cancellations")}</Label>
                  <p className="text-sm text-muted-foreground">{t("doctor.settings.cancellationsDesc")}</p>
                </div>
                <Switch
                  checked={notifications.emailCancellations}
                  onCheckedChange={(checked) => handleNotificationToggle("emailCancellations", checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("doctor.settings.smsNotifications")}</CardTitle>
              <CardDescription>{t("doctor.settings.smsNotificationsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("doctor.settings.smsBookings")}</Label>
                  <p className="text-sm text-muted-foreground">{t("doctor.settings.smsBookingsDesc")}</p>
                </div>
                <Switch checked={notifications.smsBookings} onCheckedChange={(checked) => handleNotificationToggle("smsBookings", checked)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("doctor.settings.smsReminders")}</Label>
                  <p className="text-sm text-muted-foreground">{t("doctor.settings.smsRemindersDesc")}</p>
                </div>
                <Switch checked={notifications.smsReminders} onCheckedChange={(checked) => handleNotificationToggle("smsReminders", checked)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("doctor.settings.smsCancellations")}</Label>
                  <p className="text-sm text-muted-foreground">{t("doctor.settings.smsCancellationsDesc")}</p>
                </div>
                <Switch
                  checked={notifications.smsCancellations}
                  onCheckedChange={(checked) => handleNotificationToggle("smsCancellations", checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("doctor.settings.pushNotifications")}</CardTitle>
              <CardDescription>{t("doctor.settings.pushNotificationsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("doctor.settings.enablePush")}</Label>
                  <p className="text-sm text-muted-foreground">{t("doctor.settings.enablePushDesc")}</p>
                </div>
                <Switch
                  checked={notifications.pushNotifications}
                  onCheckedChange={(checked) => handleNotificationToggle("pushNotifications", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Sync */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("doctor.settings.calendarIntegration")}</CardTitle>
              <CardDescription>{t("doctor.settings.calendarIntegrationDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("doctor.settings.googleCalendar")}</Label>
                  <p className="text-sm text-muted-foreground">{t("doctor.settings.googleCalendarDesc")}</p>
                </div>
                <Switch checked={calendarSync.googleCalendar} onCheckedChange={(checked) => updateCalendarSync("googleCalendar", checked)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("doctor.settings.outlookCalendar")}</Label>
                  <p className="text-sm text-muted-foreground">{t("doctor.settings.outlookCalendarDesc")}</p>
                </div>
                <Switch checked={calendarSync.outlookCalendar} onCheckedChange={(checked) => updateCalendarSync("outlookCalendar", checked)} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("doctor.settings.appleCalendar")}</Label>
                  <p className="text-sm text-muted-foreground">{t("doctor.settings.appleCalendarDesc")}</p>
                </div>
                <Switch checked={calendarSync.appleCalendar} onCheckedChange={(checked) => updateCalendarSync("appleCalendar", checked)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>

        {/* Practice Settings */}
        <TabsContent value="practice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("doctor.settings.practiceInfo")}</CardTitle>
              <CardDescription>{t("doctor.settings.practiceInfoDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t("doctor.settings.practiceComingSoon")}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
