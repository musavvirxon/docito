import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { usePatientSettings } from '@/hooks/usePatientSettings';
import { Bell, Shield, User, Lock, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [hasNotificationChanges, setHasNotificationChanges] = useState(false);
  const [hasPrivacyChanges, setHasPrivacyChanges] = useState(false);
  const [hasAccountChanges, setHasAccountChanges] = useState(false);

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
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
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
        <h2 className="text-3xl font-bold">{t("patient.settings.title")}</h2>
        <p className="text-muted-foreground mt-2">{t("patient.settings.subtitle")}</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account">
            <User className="w-4 h-4 mr-2" />
            {t("patient.settings.account")}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            {t("patient.settings.notifications")}
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="w-4 h-4 mr-2" />
            {t("patient.settings.privacy")}
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            {t("patient.settings.security")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={localAccount.full_name}
                    onChange={(e) => handleAccountChange('full_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={localAccount.email}
                    onChange={(e) => handleAccountChange('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={localAccount.phone || ''}
                    onChange={(e) => handleAccountChange('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={localAccount.date_of_birth || ''}
                    onChange={(e) => handleAccountChange('date_of_birth', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={localAccount.address || ''}
                  onChange={(e) => handleAccountChange('address', e.target.value)}
                />
              </div>
              {hasAccountChanges && (
                <Button onClick={handleSaveAccount} className="mt-4">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Manage your email notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Booking Confirmations</Label>
                  <p className="text-sm text-muted-foreground">Receive emails when appointments are booked</p>
                </div>
                <Switch
                  checked={localNotifications.emailBookings}
                  onCheckedChange={(value) => handleNotificationChange('emailBookings', value)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Appointment Reminders</Label>
                  <p className="text-sm text-muted-foreground">Get reminded before your appointments</p>
                </div>
                <Switch
                  checked={localNotifications.emailReminders}
                  onCheckedChange={(value) => handleNotificationChange('emailReminders', value)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Cancellation Notices</Label>
                  <p className="text-sm text-muted-foreground">Receive cancellation confirmations</p>
                </div>
                <Switch
                  checked={localNotifications.emailCancellations}
                  onCheckedChange={(value) => handleNotificationChange('emailCancellations', value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SMS Notifications</CardTitle>
              <CardDescription>Manage your SMS notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Reminders</Label>
                  <p className="text-sm text-muted-foreground">Get text reminders before appointments</p>
                </div>
                <Switch
                  checked={localNotifications.smsReminders}
                  onCheckedChange={(value) => handleNotificationChange('smsReminders', value)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive in-app notifications</p>
                </div>
                <Switch
                  checked={localNotifications.pushNotifications}
                  onCheckedChange={(value) => handleNotificationChange('pushNotifications', value)}
                />
              </div>
            </CardContent>
          </Card>

          {hasNotificationChanges && (
            <Button onClick={handleSaveNotifications}>
              <Save className="w-4 h-4 mr-2" />
              Save Notification Settings
            </Button>
          )}
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Control your privacy preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Profile Visibility</Label>
                  <p className="text-sm text-muted-foreground">Allow doctors to see your profile</p>
                </div>
                <Switch
                  checked={localPrivacy.profileVisibility}
                  onCheckedChange={(value) => handlePrivacyChange('profileVisibility', value)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Share Analytics</Label>
                  <p className="text-sm text-muted-foreground">Help us improve with anonymous data</p>
                </div>
                <Switch
                  checked={localPrivacy.shareAnalytics}
                  onCheckedChange={(value) => handlePrivacyChange('shareAnalytics', value)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Marketing Communications</Label>
                  <p className="text-sm text-muted-foreground">Receive promotional emails</p>
                </div>
                <Switch
                  checked={localPrivacy.marketingCommunications}
                  onCheckedChange={(value) => handlePrivacyChange('marketingCommunications', value)}
                />
              </div>
            </CardContent>
          </Card>

          {hasPrivacyChanges && (
            <Button onClick={handleSavePrivacy}>
              <Save className="w-4 h-4 mr-2" />
              Save Privacy Settings
            </Button>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current_password">Current Password</Label>
                <Input
                  id="current_password"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={
                  !passwordData.currentPassword ||
                  !passwordData.newPassword ||
                  passwordData.newPassword !== passwordData.confirmPassword
                }
              >
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
