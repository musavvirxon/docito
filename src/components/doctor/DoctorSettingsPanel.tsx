import { useState } from 'react';
import { User, Bell, Calendar, Shield, Building } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SecuritySettings } from '../dashboard/SecuritySettings';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';

export function DoctorSettingsPanel() {
  const [activeTab, setActiveTab] = useState('account');
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
    saving 
  } = useSettings();

  const handleAccountUpdate = async () => {
    await updateAccountSettings(accountSettings);
  };

  const handleNotificationToggle = async (key: string, value: boolean) => {
    await updateNotificationSettings({ [key]: value });
  };

  const handlePrivacyToggle = async (key: string, value: boolean) => {
    await updatePrivacySettings({ [key]: value });
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">{t("doctor.settings.title")}</h2>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="account">
            <User className="w-4 h-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="w-4 h-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="practice">
            <Building className="w-4 h-4 mr-2" />
            Practice
          </TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={accountSettings.email}
                    onChange={(e) => updateAccountSettings({ email: e.target.value })}
                    placeholder="doctor@example.com" 
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={accountSettings.phone}
                    onChange={(e) => updateAccountSettings({ phone: e.target.value })}
                    placeholder="+1 (555) 000-0000" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={accountSettings.timezone}
                    onValueChange={(value) => updateAccountSettings({ timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (EST)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CST)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MST)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PST)</SelectItem>
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
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button onClick={handleAccountUpdate} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Control your privacy preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Profile Visibility</Label>
                  <p className="text-sm text-muted-foreground">Allow patients to view your profile</p>
                </div>
                <Switch 
                  checked={privacySettings.profileVisibility}
                  onCheckedChange={(checked) => handlePrivacyToggle('profileVisibility', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Share Analytics</Label>
                  <p className="text-sm text-muted-foreground">Help improve our service with anonymous data</p>
                </div>
                <Switch 
                  checked={privacySettings.shareAnalytics}
                  onCheckedChange={(checked) => handlePrivacyToggle('shareAnalytics', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Marketing Communications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates about new features</p>
                </div>
                <Switch 
                  checked={privacySettings.marketingCommunications}
                  onCheckedChange={(checked) => handlePrivacyToggle('marketingCommunications', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Manage your email notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Appointment Bookings</Label>
                  <p className="text-sm text-muted-foreground">Get notified when patients book appointments</p>
                </div>
                <Switch 
                  checked={notifications.emailBookings}
                  onCheckedChange={(checked) => handleNotificationToggle('emailBookings', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Appointment Reminders</Label>
                  <p className="text-sm text-muted-foreground">Receive reminders before appointments</p>
                </div>
                <Switch 
                  checked={notifications.emailReminders}
                  onCheckedChange={(checked) => handleNotificationToggle('emailReminders', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Cancellations</Label>
                  <p className="text-sm text-muted-foreground">Get notified when appointments are cancelled</p>
                </div>
                <Switch 
                  checked={notifications.emailCancellations}
                  onCheckedChange={(checked) => handleNotificationToggle('emailCancellations', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SMS Notifications</CardTitle>
              <CardDescription>Manage your text message notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Bookings</Label>
                  <p className="text-sm text-muted-foreground">Get SMS when patients book</p>
                </div>
                <Switch 
                  checked={notifications.smsBookings}
                  onCheckedChange={(checked) => handleNotificationToggle('smsBookings', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Reminders</Label>
                  <p className="text-sm text-muted-foreground">Receive text reminders for appointments</p>
                </div>
                <Switch 
                  checked={notifications.smsReminders}
                  onCheckedChange={(checked) => handleNotificationToggle('smsReminders', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Cancellations</Label>
                  <p className="text-sm text-muted-foreground">Get SMS for cancellations</p>
                </div>
                <Switch 
                  checked={notifications.smsCancellations}
                  onCheckedChange={(checked) => handleNotificationToggle('smsCancellations', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Push Notifications</CardTitle>
              <CardDescription>Manage in-app push notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive real-time notifications in the app</p>
                </div>
                <Switch 
                  checked={notifications.pushNotifications}
                  onCheckedChange={(checked) => handleNotificationToggle('pushNotifications', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Sync */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Integration</CardTitle>
              <CardDescription>Sync appointments with your calendar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Google Calendar</Label>
                  <p className="text-sm text-muted-foreground">Sync with Google Calendar</p>
                </div>
                <Switch 
                  checked={calendarSync.googleCalendar}
                  onCheckedChange={(checked) => updateCalendarSync('googleCalendar', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Outlook Calendar</Label>
                  <p className="text-sm text-muted-foreground">Sync with Microsoft Outlook</p>
                </div>
                <Switch 
                  checked={calendarSync.outlookCalendar}
                  onCheckedChange={(checked) => updateCalendarSync('outlookCalendar', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Apple Calendar</Label>
                  <p className="text-sm text-muted-foreground">Sync with Apple Calendar</p>
                </div>
                <Switch 
                  checked={calendarSync.appleCalendar}
                  onCheckedChange={(checked) => updateCalendarSync('appleCalendar', checked)}
                />
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
              <CardTitle>Practice Information</CardTitle>
              <CardDescription>Manage your practice affiliation</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Practice management features coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
