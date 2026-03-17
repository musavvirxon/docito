import { useMemo, useState, useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  Heart,
} from "lucide-react";

import AccountBillingSection from "@/components/profile/AccountBillingSection";
import AccountAnalyticsSection from "@/components/profile/AccountAnalyticsSection";
import AccountSettingsSection from "@/components/profile/AccountSettingsSection";
import PatientWorkspaceSettings from "@/components/settings/PatientWorkspaceSettings";
import { getPrimaryRole, type AppRole } from "@/lib/rbac";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("profileMenu");
  const { user, profile, loading, updateProfile, signOut, activeRole, allRoles } = useAuth();

  const initialTab = (searchParams.get("tab") as "settings" | "workspace" | "billing" | "analytics") || "settings";
  const [tab, setTab] = useState<"settings" | "workspace" | "billing" | "analytics">(initialTab);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const email = useMemo(() => profile?.email || user?.email || "", [profile?.email, user?.email]);

  const primaryRole = useMemo(() => {
    if (allRoles.length > 0) return getPrimaryRole(allRoles);
    return activeRole || "patient";
  }, [allRoles, activeRole]);

  const getNameLabel = (role: AppRole): string => {
    switch (role) {
      case "clinic_admin":
      case "admin":
        return t("profile.nameLabels.clinicName", "Clinic name");
      case "lab_admin":
        return t("profile.nameLabels.labName", "Lab name");
      case "pharmacy_admin":
        return t("profile.nameLabels.pharmacyName", "Pharmacy name");
      case "imaging_admin":
        return t("profile.nameLabels.imagingName", "Imaging center name");
      default:
        return t("profile.nameLabels.fullName", "Full name");
    }
  };

  const getNamePlaceholder = (role: AppRole): string => {
    switch (role) {
      case "clinic_admin":
      case "admin":
        return t("profile.placeholders.clinicName", "Enter clinic name");
      case "lab_admin":
        return t("profile.placeholders.labName", "Enter lab name");
      case "pharmacy_admin":
        return t("profile.placeholders.pharmacyName", "Enter pharmacy name");
      case "imaging_admin":
        return t("profile.placeholders.imagingName", "Enter imaging center name");
      default:
        return t("profile.placeholders.fullName", "Enter your full name");
    }
  };

  const nameLabel = useMemo(() => getNameLabel(primaryRole), [primaryRole, t]);
  const namePlaceholder = useMemo(() => getNamePlaceholder(primaryRole), [primaryRole, t]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t("profile.loading", "Loading…")}
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { error } = await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      } as any);
      if (error) throw error;
      toast.success(t("profile.toasts.profileUpdated", "Profile updated"));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t("profile.toasts.profileFailed", "Failed to update profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error(t("profile.toasts.passwordMinLength", "Password must be at least 6 characters."));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("profile.toasts.passwordMismatch", "Passwords do not match."));
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("profile.toasts.passwordUpdated", "Password updated"));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t("profile.toasts.passwordFailed", "Failed to update password"));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight truncate">{t("profile.account", "Account")}</h1>
          <p className="text-sm text-muted-foreground truncate">{email}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("profile.back", "Back")}
          </Button>
          <Button variant="destructive" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" />
            {t("profile.signOut", "Sign out")}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-6">
        <TabsList className="rounded-2xl flex-wrap">
          <TabsTrigger value="settings" className="rounded-xl">
            <SettingsIcon className="h-4 w-4 mr-2" />
            {t("profile.menu.settings", "Settings")}
          </TabsTrigger>
          {primaryRole === "patient" && (
            <TabsTrigger value="workspace" className="rounded-xl">
              <Heart className="h-4 w-4 mr-2" />
              {t("profile.tabs.healthProfile", "Health Profile")}
            </TabsTrigger>
          )}
          <TabsTrigger value="billing" className="rounded-xl">
            <CreditCard className="h-4 w-4 mr-2" />
            {t("profile.menu.billing", "Billing")}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t("profile.menu.analytics", "Analytics")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  {t("profile.profileSection.title", "Profile")}
                </CardTitle>
                <CardDescription>{t("profile.profileSection.description", "Update your personal information.")}</CardDescription>
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
                  <Label>{t("profile.profileSection.email", "Email")}</Label>
                  <Input className="rounded-xl" value={email} disabled />
                </div>

                <div className="space-y-2">
                  <Label>{t("profile.profileSection.phone", "Phone")}</Label>
                  <Input className="rounded-xl" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t("profile.profileSection.save", "Save profile")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t("profile.security.title", "Security")}
                </CardTitle>
                <CardDescription>{t("profile.security.description", "Change your password.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("profile.security.newPassword", "New password")}</Label>
                  <Input
                    className="rounded-xl"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("profile.security.passwordPlaceholder", "At least 6 characters")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("profile.security.confirmPassword", "Confirm password")}</Label>
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
                    {t("profile.security.update", "Update password")}
                  </Button>
                </div>

                <Separator />
                <div className="text-xs text-muted-foreground">{t("profile.security.tip", "Tip: use a password manager and avoid reusing passwords.")}</div>
              </CardContent>
            </Card>
          </div>

          <AccountSettingsSection />
        </TabsContent>

        <TabsContent value="workspace" className="space-y-6">
          {primaryRole === "patient" && <PatientWorkspaceSettings />}
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