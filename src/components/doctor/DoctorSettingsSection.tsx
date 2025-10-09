import { useState } from "react";
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
                    value={accountSettings.email}
                    onChange={(e) => updateAccountSettings({ email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone"
                    value={accountSettings.phone}
                    onChange={(e) => updateAccountSettings({ phone: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={accountSettings.timezone}
                    onValueChange={(value) => updateAccountSettings({ timezone: value })}
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
                    value={accountSettings.language}
                    onValueChange={(value) => updateAccountSettings({ language: value })}
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

              <Button disabled={saving}>
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
                  checked={privacySettings.profileVisibility}
                  onCheckedChange={(checked) => updatePrivacySettings({ profileVisibility: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Share Analytics Data</div>
                  <div className="text-sm text-muted-foreground">Help improve our platform with anonymous usage data</div>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Marketing Communications</div>
                  <div className="text-sm text-muted-foreground">Receive updates about new features and tips</div>
                </div>
                <Switch />
              </div>
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
                      checked={notifications.emailBookings}
                      onCheckedChange={(checked) => updateNotificationSettings({ emailBookings: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Appointment Reminders</div>
                      <div className="text-sm text-muted-foreground">Reminders about upcoming appointments</div>
                    </div>
                    <Switch 
                      checked={notifications.emailReminders}
                      onCheckedChange={(checked) => updateNotificationSettings({ emailReminders: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Cancellations</div>
                      <div className="text-sm text-muted-foreground">Get notified when patients cancel appointments</div>
                    </div>
                    <Switch 
                      checked={notifications.emailCancellations}
                      onCheckedChange={(checked) => updateNotificationSettings({ emailCancellations: checked })}
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
                      checked={notifications.smsBookings}
                      onCheckedChange={(checked) => updateNotificationSettings({ smsBookings: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Appointment Reminders</div>
                      <div className="text-sm text-muted-foreground">SMS reminders before appointments</div>
                    </div>
                    <Switch 
                      checked={notifications.smsReminders}
                      onCheckedChange={(checked) => updateNotificationSettings({ smsReminders: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Cancellations</div>
                      <div className="text-sm text-muted-foreground">SMS alerts for cancellations</div>
                    </div>
                    <Switch 
                      checked={notifications.smsCancellations}
                      onCheckedChange={(checked) => updateNotificationSettings({ smsCancellations: checked })}
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
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) => updateNotificationSettings({ pushNotifications: checked })}
                  />
                </div>
              </div>

              <Button>Save Notification Preferences</Button>
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