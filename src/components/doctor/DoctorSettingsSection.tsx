import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Eye, EyeOff, Settings, Bell, Calendar, Shield, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { SecuritySettings } from "../dashboard/SecuritySettings";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const DoctorSettingsSection = () => {
  const { t } = useTranslation();
  const {
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
    changePassword,
  } = useSettings();

  // Local state for pending changes
  const [localAccountSettings, setLocalAccountSettings] = useState(accountSettings);
  const [localNotifications, setLocalNotifications] = useState(notifications);
  const [localPrivacySettings, setLocalPrivacySettings] = useState(privacySettings);
  const [hasAccountChanges, setHasAccountChanges] = useState(false);
  const [hasNotificationChanges, setHasNotificationChanges] = useState(false);
  const [hasPrivacyChanges, setHasPrivacyChanges] = useState(false);

  // Update local state when backend data loads
  useEffect(() => {
    setLocalAccountSettings(accountSettings);
  }, [accountSettings]);

  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    setLocalPrivacySettings(privacySettings);
  }, [privacySettings]);

  // Check for changes
  const checkAccountChanges = (newSettings: typeof accountSettings) => {
    setHasAccountChanges(JSON.stringify(newSettings) !== JSON.stringify(accountSettings));
  };

  const checkNotificationChanges = (newSettings: typeof notifications) => {
    setHasNotificationChanges(JSON.stringify(newSettings) !== JSON.stringify(notifications));
  };

  const checkPrivacyChanges = (newSettings: typeof privacySettings) => {
    setHasPrivacyChanges(JSON.stringify(newSettings) !== JSON.stringify(privacySettings));
  };

  // Save handlers
  const handleSaveAccountSettings = async () => {
    try {
      await updateAccountSettings(localAccountSettings);
      setHasAccountChanges(false);
      toast.success(t("doctor.settings.toast.accountSuccess"));
    } catch (error) {
      toast.error(t("doctor.settings.toast.accountError"));
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await updateNotificationSettings(localNotifications);
      setHasNotificationChanges(false);
      toast.success(t("doctor.settings.toast.notificationsSuccess"));
    } catch (error) {
      toast.error(t("doctor.settings.toast.notificationsError"));
    }
  };

  const handleSavePrivacySettings = async () => {
    try {
      await updatePrivacySettings(localPrivacySettings);
      setHasPrivacyChanges(false);
      toast.success(t("doctor.settings.toast.privacySuccess"));
    } catch (error) {
      toast.error(t("doctor.settings.toast.privacyError"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t("doctor.settings.title")}
          </CardTitle>
          <p className="text-muted-foreground">{t("doctor.settings.description")}</p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">{t("doctor.settings.tabs.general")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("doctor.settings.tabs.notifications")}</TabsTrigger>
          <TabsTrigger value="calendar">{t("doctor.settings.tabs.calendar")}</TabsTrigger>
          <TabsTrigger value="security">{t("doctor.settings.tabs.security")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t("doctor.settings.account.title")}</CardTitle>
              <p className="text-muted-foreground">{t("doctor.settings.account.description")}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">{t("doctor.settings.account.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={localAccountSettings.email}
                    onChange={(e) => {
                      const newSettings = { ...localAccountSettings, email: e.target.value };
                      setLocalAccountSettings(newSettings);
                      checkAccountChanges(newSettings);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{t("doctor.settings.account.phone")}</Label>
                  <Input
                    id="phone"
                    value={localAccountSettings.phone}
                    onChange={(e) => {
                      const newSettings = { ...localAccountSettings, phone: e.target.value };
                      setLocalAccountSettings(newSettings);
                      checkAccountChanges(newSettings);
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">{t("doctor.settings.account.timezone")}</Label>
                  <Select
                    value={localAccountSettings.timezone}
                    onValueChange={(value) => {
                      const newSettings = { ...localAccountSettings, timezone: value };
                      setLocalAccountSettings(newSettings);
                      checkAccountChanges(newSettings);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">{t("doctor.settings.timezones.eastern")}</SelectItem>
                      <SelectItem value="America/Chicago">{t("doctor.settings.timezones.central")}</SelectItem>
                      <SelectItem value="America/Denver">{t("doctor.settings.timezones.mountain")}</SelectItem>
                      <SelectItem value="America/Los_Angeles">{t("doctor.settings.timezones.pacific")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">{t("doctor.settings.account.language")}</Label>
                  <Select
                    value={localAccountSettings.language}
                    onValueChange={(value) => {
                      const newSettings = { ...localAccountSettings, language: value };
                      setLocalAccountSettings(newSettings);
                      checkAccountChanges(newSettings);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t("doctor.settings.languages.en")}</SelectItem>
                      <SelectItem value="es">{t("doctor.settings.languages.es")}</SelectItem>
                      <SelectItem value="fr">{t("doctor.settings.languages.fr")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSaveAccountSettings} disabled={saving || !hasAccountChanges}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t("doctor.settings.account.saveChanges")}
              </Button>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t("doctor.settings.privacy.title")}</CardTitle>
              <p className="text-muted-foreground">{t("doctor.settings.privacy.description")}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t("doctor.settings.privacy.profileVisibility")}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("doctor.settings.privacy.profileVisibilityDesc")}
                  </div>
                </div>
                <Switch
                  checked={localPrivacySettings.profileVisibility}
                  onCheckedChange={(checked) => {
                    const newSettings = { ...localPrivacySettings, profileVisibility: checked };
                    setLocalPrivacySettings(newSettings);
                    checkPrivacyChanges(newSettings);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t("doctor.settings.privacy.shareAnalytics")}</div>
                  <div className="text-sm text-muted-foreground">{t("doctor.settings.privacy.shareAnalyticsDesc")}</div>
                </div>
                <Switch
                  checked={localPrivacySettings.shareAnalytics}
                  onCheckedChange={(checked) => {
                    const newSettings = { ...localPrivacySettings, shareAnalytics: checked };
                    setLocalPrivacySettings(newSettings);
                    checkPrivacyChanges(newSettings);
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{t("doctor.settings.privacy.marketingComms")}</div>
                  <div className="text-sm text-muted-foreground">{t("doctor.settings.privacy.marketingCommsDesc")}</div>
                </div>
                <Switch
                  checked={localPrivacySettings.marketingCommunications}
                  onCheckedChange={(checked) => {
                    const newSettings = { ...localPrivacySettings, marketingCommunications: checked };
                    setLocalPrivacySettings(newSettings);
                    checkPrivacyChanges(newSettings);
                  }}
                />
              </div>

              <Button onClick={handleSavePrivacySettings} disabled={saving || !hasPrivacyChanges}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t("doctor.settings.privacy.savePrivacySettings")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {t("doctor.settings.notificationPreferences.title")}
              </CardTitle>
              <p className="text-muted-foreground">{t("doctor.settings.notificationPreferences.description")}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div>
                <h3 className="font-medium mb-4">{t("doctor.settings.notificationPreferences.email.title")}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t("doctor.settings.notificationPreferences.email.bookings")}</div>
                      <div className="text-sm text-muted-foreground">
                        {t("doctor.settings.notificationPreferences.email.bookingsDesc")}
                      </div>
                    </div>
                    <Switch
                      checked={localNotifications.emailBookings}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...localNotifications, emailBookings: checked };
                        setLocalNotifications(newSettings);
                        checkNotificationChanges(newSettings);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t("doctor.settings.notificationPreferences.email.reminders")}</div>
                      <div className="text-sm text-muted-foreground">
                        {t("doctor.settings.notificationPreferences.email.remindersDesc")}
                      </div>
                    </div>
                    <Switch
                      checked={localNotifications.emailReminders}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...localNotifications, emailReminders: checked };
                        setLocalNotifications(newSettings);
                        checkNotificationChanges(newSettings);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {t("doctor.settings.notificationPreferences.email.cancellations")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("doctor.settings.notificationPreferences.email.cancellationsDesc")}
                      </div>
                    </div>
                    <Switch
                      checked={localNotifications.emailCancellations}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...localNotifications, emailCancellations: checked };
                        setLocalNotifications(newSettings);
                        checkNotificationChanges(newSettings);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* SMS Notifications */}
              <div>
                <h3 className="font-medium mb-4">{t("doctor.settings.notificationPreferences.sms.title")}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t("doctor.settings.notificationPreferences.sms.bookings")}</div>
                      <div className="text-sm text-muted-foreground">
                        {t("doctor.settings.notificationPreferences.sms.bookingsDesc")}
                      </div>
                    </div>
                    <Switch
                      checked={localNotifications.smsBookings}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...localNotifications, smsBookings: checked };
                        setLocalNotifications(newSettings);
                        checkNotificationChanges(newSettings);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t("doctor.settings.notificationPreferences.sms.reminders")}</div>
                      <div className="text-sm text-muted-foreground">
                        {t("doctor.settings.notificationPreferences.sms.remindersDesc")}
                      </div>
                    </div>
                    <Switch
                      checked={localNotifications.smsReminders}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...localNotifications, smsReminders: checked };
                        setLocalNotifications(newSettings);
                        checkNotificationChanges(newSettings);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {t("doctor.settings.notificationPreferences.sms.cancellations")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("doctor.settings.notificationPreferences.sms.cancellationsDesc")}
                      </div>
                    </div>
                    <Switch
                      checked={localNotifications.smsCancellations}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...localNotifications, smsCancellations: checked };
                        setLocalNotifications(newSettings);
                        checkNotificationChanges(newSettings);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Push Notifications */}
              <div>
                <h3 className="font-medium mb-4">{t("doctor.settings.notificationPreferences.push.title")}</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t("doctor.settings.notificationPreferences.push.browser")}</div>
                    <div className="text-sm text-muted-foreground">
                      {t("doctor.settings.notificationPreferences.push.browserDesc")}
                    </div>
                  </div>
                  <Switch
                    checked={localNotifications.pushNotifications}
                    onCheckedChange={(checked) => {
                      const newSettings = { ...localNotifications, pushNotifications: checked };
                      setLocalNotifications(newSettings);
                      checkNotificationChanges(newSettings);
                    }}
                  />
                </div>
              </div>

              <Button onClick={handleSaveNotifications} disabled={saving || !hasNotificationChanges}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t("doctor.settings.notificationPreferences.saveNotificationSettings")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {t("doctor.settings.calendar.title")}
              </CardTitle>
              <p className="text-muted-foreground">{t("doctor.settings.calendar.description")}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{t("doctor.settings.calendar.google")}</div>
                      <div className="text-sm text-muted-foreground">
                        {calendarSync.googleCalendar
                          ? t("doctor.settings.calendar.connected")
                          : t("doctor.settings.calendar.notConnected")}
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={calendarSync.googleCalendar}
                    onCheckedChange={(checked) => updateCalendarSync("googleCalendar", checked)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{t("doctor.settings.calendar.outlook")}</div>
                      <div className="text-sm text-muted-foreground">
                        {calendarSync.outlookCalendar
                          ? t("doctor.settings.calendar.connected")
                          : t("doctor.settings.calendar.notConnected")}
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={calendarSync.outlookCalendar}
                    onCheckedChange={(checked) => updateCalendarSync("outlookCalendar", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium">{t("doctor.settings.calendar.apple")}</div>
                      <div className="text-sm text-muted-foreground">
                        {calendarSync.appleCalendar
                          ? t("doctor.settings.calendar.connected")
                          : t("doctor.settings.calendar.notConnected")}
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={calendarSync.appleCalendar}
                    onCheckedChange={(checked) => updateCalendarSync("appleCalendar", checked)}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">{t("doctor.settings.calendar.syncSettings")}</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• {t("doctor.settings.calendar.syncAppointments")}</p>
                  <p>• {t("doctor.settings.calendar.syncBlockedTime")}</p>
                  <p>• {t("doctor.settings.calendar.twoWaySync")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DoctorSettingsSection;
