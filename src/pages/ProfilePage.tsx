import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import {
  Loader2,
  LogOut,
  Shield,
  User as UserIcon,
  CreditCard,
  BarChart3,
  Settings as SettingsIcon,
  ArrowLeft,
} from "lucide-react";

import AccountBillingSection from "@/components/profile/AccountBillingSection";
import AccountAnalyticsSection from "@/components/profile/AccountAnalyticsSection";
import AccountSettingsSection from "@/components/profile/AccountSettingsSection";
import { getPrimaryRole, getUserRolesFromProfile, type AppRole } from "@/lib/rbac";

const getNameLabel = (role: AppRole): string => {
  switch (role) {
    case "clinic_admin":
    case "admin":
      return "Clinic name";
    case "lab_admin":
      return "Lab name";
    case "pharmacy_admin":
      return "Pharmacy name";
    case "imaging_admin":
      return "Imaging center name";
    default:
      return "Full name";
  }
};

const getNamePlaceholder = (role: AppRole): string => {
  switch (role) {
    case "clinic_admin":
    case "admin":
      return "Enter clinic name";
    case "lab_admin":
      return "Enter lab name";
    case "pharmacy_admin":
      return "Enter pharmacy name";
    case "imaging_admin":
      return "Enter imaging center name";
    default:
      return "Enter your full name";
  }
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, loading, updateProfile, signOut, activeRole } = useAuth();

  const [tab, setTab] = useState<"settings" | "billing" | "analytics">("settings");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const email = useMemo(() => profile?.email || user?.email || "", [profile?.email, user?.email]);

  const primaryRole = useMemo(() => {
    if (!profile) return activeRole;
    const roles = getUserRolesFromProfile(profile);
    if (roles.length === 0) return activeRole;
    return getPrimaryRole(roles);
  }, [profile, activeRole]);

  const nameLabel = useMemo(() => getNameLabel(primaryRole), [primaryRole]);
  const namePlaceholder = useMemo(() => getNamePlaceholder(primaryRole), [primaryRole]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { error } = await updateProfile({
        // This field is used across the app as the display name.
        // For practice/facility admins, it represents the facility name.
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      } as any);
      if (error) throw error;
      toast.success("Profile updated");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight truncate">Account</h1>
          <p className="text-sm text-muted-foreground truncate">{email}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button variant="destructive" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-6">
        <TabsList className="rounded-2xl">
          <TabsTrigger value="settings" className="rounded-xl">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-xl">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Profile
                </CardTitle>
                <CardDescription>Update your personal information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{nameLabel}</Label>
                  <Input
                    className="rounded-xl"
                    value={fullName}
                    placeholder={namePlaceholder}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input className="rounded-xl" value={email} disabled />
                </div>

                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input className="rounded-xl" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security
                </CardTitle>
                <CardDescription>Change your password.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>New password</Label>
                  <Input
                    className="rounded-xl"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Confirm password</Label>
                  <Input
                    className="rounded-xl"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleChangePassword} disabled={savingPassword}>
                    {savingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Update password
                  </Button>
                </div>

                <Separator />
                <div className="text-xs text-muted-foreground">Tip: use a password manager and avoid reusing passwords.</div>
              </CardContent>
            </Card>
          </div>

          <AccountSettingsSection />
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <AccountBillingSection />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AccountAnalyticsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
