import * as React from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Save, ShieldCheck, UserRound, Bell, Globe2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { languages } from "@/i18n/config";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

// Minimal shape: assumes profiles has full_name, phone, avatar_url, settings(jsonb)
type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  settings: any | null;
};

export default function SettingsDialog({ open, onOpenChange }: Props) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [profile, setProfile] = React.useState<ProfileRow | null>(null);

  // Account form
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");

  // Notifications (stored in profiles.settings)
  const [emailNotif, setEmailNotif] = React.useState(true);
  const [productUpdates, setProductUpdates] = React.useState(false);

  // Security
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const loadProfile = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, avatar_url, settings")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      const row = (data as ProfileRow) || null;
      setProfile(row);

      setFullName(row?.full_name || "");
      setPhone(row?.phone || "");
      setAvatarUrl(row?.avatar_url || "");

      const s = row?.settings || {};
      setEmailNotif(s.notifications?.email ?? true);
      setProductUpdates(s.notifications?.productUpdates ?? false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to load settings", description: e.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (open) loadProfile();
  }, [open, loadProfile]);

  const saveAccountAndPrefs = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const settings = profile.settings || {};
      const nextSettings = {
        ...settings,
        notifications: {
          ...(settings.notifications || {}),
          email: emailNotif,
          productUpdates: productUpdates,
        },
        locale: i18n.language,
      };

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          avatar_url: avatarUrl,
          settings: nextSettings,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({ title: "Saved", description: "Your settings have been updated." });
      // refresh local profile state
      setProfile((p) => (p ? { ...p, full_name: fullName, phone, avatar_url: avatarUrl, settings: nextSettings } : p));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast({ variant: "destructive", title: "Password too short", description: "Use at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords do not match", description: "Please re-check confirmation." });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated", description: "Your password has been changed." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Password update failed", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const signOutAllDevices = async () => {
    // Supabase doesn’t have “sign out all devices” in client-only reliably.
    // Best practice: implement via edge function or admin action.
    // For now: sign out current session.
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: "destructive", title: "Sign out failed", description: error.message });
      return;
    }
    toast({ title: "Signed out", description: "You have been signed out." });
    onOpenChange(false);
  };

  const setLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
    // persist choice in localStorage already via LanguageDetector
    // also persist in profile settings if possible
    if (profile) {
      setProfile((p) => (p ? { ...p, settings: { ...(p.settings || {}), locale: lng } } : p));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">Settings</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          {loading ? (
            <div className="py-20 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          ) : (
            <Tabs defaultValue="account" className="mt-4">
              <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
                <TabsTrigger value="account" className="gap-2">
                  <UserRound className="h-4 w-4" />
                  Account
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="notifications" className="gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="language" className="gap-2">
                  <Globe2 className="h-4 w-4" />
                  Language
                </TabsTrigger>
                <TabsTrigger value="billing" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Billing
                </TabsTrigger>
              </TabsList>

              {/* ACCOUNT */}
              <TabsContent value="account" className="mt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
                    <Input id="avatarUrl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                  <Button onClick={saveAccountAndPrefs} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save changes
                  </Button>
                </div>
              </TabsContent>

              {/* SECURITY */}
              <TabsContent value="security" className="mt-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Change password</h3>
                  <p className="text-sm text-muted-foreground mt-1">Use a strong password (8+ characters).</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="newPass">New password</Label>
                    <Input id="newPass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPass">Confirm password</Label>
                    <Input
                      id="confirmPass"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={changePassword} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Update password
                  </Button>
                  <Button variant="destructive" onClick={signOutAllDevices}>
                    Sign out
                  </Button>
                </div>
              </TabsContent>

              {/* NOTIFICATIONS */}
              <TabsContent value="notifications" className="mt-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Notifications</h3>
                  <p className="text-sm text-muted-foreground mt-1">Choose what we notify you about.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium">Email notifications</p>
                      <p className="text-sm text-muted-foreground">Account and workflow notifications.</p>
                    </div>
                    <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="font-medium">Product updates</p>
                      <p className="text-sm text-muted-foreground">New features and improvements.</p>
                    </div>
                    <Switch checked={productUpdates} onCheckedChange={setProductUpdates} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveAccountAndPrefs} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save
                  </Button>
                </div>
              </TabsContent>

              {/* LANGUAGE */}
              <TabsContent value="language" className="mt-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Language & region</h3>
                  <p className="text-sm text-muted-foreground mt-1">Set your preferred language.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLanguage(l.code)}
                      className={[
                        "flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors",
                        i18n.language === l.code ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                      ].join(" ")}
                      type="button"
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-lg">{l.flag}</span>
                        <span className="font-medium">{l.name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{l.code}</span>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveAccountAndPrefs} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save
                  </Button>
                </div>
              </TabsContent>

              {/* BILLING */}
              <TabsContent value="billing" className="mt-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Billing</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    If you’re not using Stripe portal yet, keep this simple and link to pricing/contact.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <a href="/pricing">View pricing</a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href="/contact">Talk to sales</a>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
