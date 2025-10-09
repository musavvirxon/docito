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

export function SecuritySettings() {
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
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
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
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              placeholder="Enter current password"
            />
          </div>
          
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="Enter new password (min. 8 characters)"
            />
          </div>
          
          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
            />
          </div>

          <Button 
            onClick={handlePasswordChange}
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Updating...' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>

      {/* Account Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Account Activity
          </CardTitle>
          <CardDescription>
            Review your recent login history and account changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingActivities ? (
            <p className="text-sm text-muted-foreground">Loading activity...</p>
          ) : !activities || activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium capitalize">{activity.activity_type.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.ip_address && `IP: ${activity.ip_address}`}
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
            Two-Factor Authentication (Coming Soon)
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Two-factor authentication will be available in a future update. 
              This will allow you to secure your account with SMS or authenticator app verification.
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
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible account actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show pending requests */}
          {requests && requests.filter(r => r.status === 'pending').length > 0 && (
            <Alert>
              <AlertDescription>
                You have pending account requests. Please wait for them to be processed.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Export Account Data</p>
              <p className="text-sm text-muted-foreground">
                Download all your account data and information
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={handleRequestDataExport}
              disabled={isSubmittingRequest}
            >
              <Download className="w-4 h-4 mr-2" />
              Request Export
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">Deactivate Account</p>
              <p className="text-sm text-muted-foreground">
                Request to permanently deactivate your account
              </p>
            </div>
            <Button 
              variant="destructive"
              onClick={handleRequestDeactivation}
              disabled={isSubmittingRequest}
            >
              Request Deactivation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
