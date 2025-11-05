import { useState } from 'react';
import { Shield, Lock, History, AlertTriangle, Download, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSettings } from '@/hooks/useSettings';
import { useAccountActivity } from '@/hooks/useAccountActivity';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function SecuritySettings() {
  const { t } = useTranslation("dashboard");
  const { changePassword, saving } = useSettings();
  const { 
    activities, 
    requests, 
    loadingActivities,
    requestAccountAction,
    isSubmittingRequest 
  } = useAccountActivity();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error(t("doctor.settings.passwordRequired"));
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t("doctor.settings.passwordMismatch"));
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error(t("doctor.settings.passwordLength"));
      return;
    }

    const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    
    if (result?.success) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  const handleRequestDeactivation = () => {
    if (confirm('Are you sure you want to deactivate your account? This action cannot be undone immediately.')) {
      requestAccountAction({ 
        requestType: 'deactivation',
        notes: 'User requested account deactivation'
      });
    }
  };

  const handleRequestDataExport = () => {
    requestAccountAction({ 
      requestType: 'data_export',
      notes: 'User requested data export'
    });
  };

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {t("doctor.settings.changePassword")}
          </CardTitle>
          <CardDescription>
            {t("doctor.settings.changePasswordDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">{t("doctor.settings.currentPassword")}</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              placeholder={t("doctor.settings.enterCurrentPassword")}
            />
          </div>
          
          <div>
            <Label htmlFor="newPassword">{t("doctor.settings.newPassword")}</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder={t("doctor.settings.enterNewPassword")}
            />
          </div>
          
          <div>
            <Label htmlFor="confirmPassword">{t("doctor.settings.confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              placeholder={t("doctor.settings.confirmNewPassword")}
            />
          </div>

          <Button 
            onClick={handlePasswordChange}
            disabled={saving}
            className="w-full"
          >
            {saving ? t("doctor.settings.updating") : t("doctor.settings.updatePassword")}
          </Button>
        </CardContent>
      </Card>

      {/* Account Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            {t("doctor.settings.recentActivity")}
          </CardTitle>
          <CardDescription>
            {t("doctor.settings.recentActivityDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingActivities ? (
            <p className="text-sm text-muted-foreground">{t("doctor.settings.loadingActivity")}</p>
          ) : !activities || activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("doctor.settings.noRecentActivity")}</p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium capitalize">{activity.activity_type.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.ip_address && `${t("doctor.settings.ip")}: ${activity.ip_address}`}
                      {activity.device_info && ` • ${activity.device_info}`}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-Factor Authentication (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            {t("doctor.settings.twoFactorAuth")}
          </CardTitle>
          <CardDescription>
            {t("doctor.settings.twoFactorAuthDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              {t("doctor.settings.twoFactorComingSoon")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {t("doctor.settings.dangerZone")}
          </CardTitle>
          <CardDescription>
            {t("doctor.settings.dangerZoneDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show pending requests */}
          {requests && requests.filter(r => r.status === 'pending').length > 0 && (
            <Alert>
              <AlertDescription>
                {t("doctor.settings.pendingRequests")}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t("doctor.settings.exportData")}</p>
              <p className="text-sm text-muted-foreground">
                {t("doctor.settings.exportDataDesc")}
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={handleRequestDataExport}
              disabled={isSubmittingRequest}
            >
              <Download className="w-4 h-4 mr-2" />
              {t("doctor.settings.requestExport")}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">{t("doctor.settings.deactivateAccount")}</p>
              <p className="text-sm text-muted-foreground">
                {t("doctor.settings.deactivateAccountDesc")}
              </p>
            </div>
            <Button 
              variant="destructive"
              onClick={handleRequestDeactivation}
              disabled={isSubmittingRequest}
            >
              {t("doctor.settings.requestDeactivation")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
