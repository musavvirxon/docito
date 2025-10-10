import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Eye, EyeOff, Settings, Bell, Calendar, Shield, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { SecuritySettings } from "../dashboard/SecuritySettings";
import { toast } from "sonner";

const DoctorSettingsSection = () => {
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
    changePassword
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
    setHasAccountChanges(
      JSON.stringify(newSettings) !== JSON.stringify(accountSettings)
    );
  };

  const checkNotificationChanges = (newSettings: typeof notifications) => {
    setHasNotificationChanges(
      JSON.stringify(newSettings) !== JSON.stringify(notifications)
    );
  };

  const checkPrivacyChanges = (newSettings: typeof privacySettings) => {
    setHasPrivacyChanges(
      JSON.stringify(newSettings) !== JSON.stringify(privacySettings)
    );
  };

  // Save handlers
  const handleSaveAccountSettings = async () => {
    try {
      await updateAccountSettings(localAccountSettings);
      setHasAccountChanges(false);
      toast.success("Account settings saved successfully");
    } catch (error) {
      toast.error("Failed to save account settings");
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await updateNotificationSettings(localNotifications);
      setHasNotificationChanges(false);
      toast.success("Notification preferences saved successfully");
    } catch (error) {
      toast.error("Failed to save notification preferences");
    }
  };

  const handleSavePrivacySettings = async () => {
    try {
      await updatePrivacySettings(localPrivacySettings);
      setHasPrivacyChanges(false);
      toast.success("Privacy settings saved successfully");
    } catch (error) {
      toast.error("Failed to save privacy settings");
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
            Account Settings
          </CardTitle>
          <p className="text-muted-foreground">Manage your account preferences and security settings</p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <p className="text-muted-foreground">Update your basic account details</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
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
                  <Label htmlFor="phone">Phone Number</Label>
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
                  <Label htmlFor="timezone">Timezone</Label>
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
                      <SelectItem value="America/New_York">Eastern Standard Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Standard Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Standard Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Standard Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
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
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSaveAccountSettings} disabled={saving || !hasAccountChanges}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <p className="text-muted-foreground">Control your profile visibility and data sharing</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Profile Visibility</div>
                  <div className="text-sm text-muted-foreground">Show your profile in doctor search results</div>
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
                  <div className="font-medium">Share Analytics Data</div>
                  <div className="text-sm text-muted-foreground">Help improve our platform with anonymous usage data</div>
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
                  <div className="font-medium">Marketing Communications</div>
                  <div className="text-sm text-muted-foreground">Receive updates about new features and tips</div>
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
                Save Privacy Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </CardTitle>
              <p className="text-muted-foreground">Choose how you want to receive notifications</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div>
                <h3 className="font-medium mb-4">Email Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Booking Confirmations</div>
                      <div className="text-sm text-muted-foreground">Get notified when patients book appointments</div>
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
                      <div className="font-medium">Appointment Reminders</div>
                      <div className="text-sm text-muted-foreground">Reminders about upcoming appointments</div>
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
                      <div className="font-medium">Cancellations</div>
                      <div className="text-sm text-muted-foreground">Get notified when patients cancel appointments</div>
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
                <h3 className="font-medium mb-4">SMS Notifications</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Booking Confirmations</div>
                      <div className="text-sm text-muted-foreground">Text notifications for new bookings</div>
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
                      <div className="font-medium">Appointment Reminders</div>
                      <div className="text-sm text-muted-foreground">SMS reminders before appointments</div>
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
                      <div className="font-medium">Cancellations</div>
                      <div className="text-sm text-muted-foreground">SMS alerts for cancellations</div>
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
                <h3 className="font-medium mb-4">Push Notifications</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Browser Notifications</div>
                    <div className="text-sm text-muted-foreground">Real-time notifications in your browser</div>
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
                Save Notification Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Calendar Integration
              </CardTitle>
              <p className="text-muted-foreground">Sync your appointments with external calendars</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">Google Calendar</div>
                      <div className="text-sm text-muted-foreground">
                        {calendarSync.googleCalendar ? "Connected" : "Not connected"}
                      </div>
                    </div>
                  </div>
                  <Switch 
                    checked={calendarSync.googleCalendar}
                    onCheckedChange={(checked) => updateCalendarSync('googleCalendar', checked)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">Outlook Calendar</div>
                      <div className="text-sm text-muted-foreground">
                        {calendarSync.outlookCalendar ? "Connected" : "Not connected"}
                      </div>
                    </div>
                  </div>
                  <Switch 
                    checked={calendarSync.outlookCalendar}
                    onCheckedChange={(checked) => updateCalendarSync('outlookCalendar', checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium">Apple Calendar</div>
                      <div className="text-sm text-muted-foreground">
                        {calendarSync.appleCalendar ? "Connected" : "Not connected"}
                      </div>
                    </div>
                  </div>
                  <Switch 
                    checked={calendarSync.appleCalendar}
                    onCheckedChange={(checked) => updateCalendarSync('appleCalendar', checked)}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Sync Settings</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Appointments will be synced in real-time</p>
                  <p>• External calendar events won't be imported</p>
                  <p>• You can disconnect at any time</p>
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