import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Building2, Users, Calendar, CreditCard, Bell, MapPin, X, Loader2, Trash2, Shield } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import DoctorRestrictionsSettings from "./DoctorRestrictionsSettings";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const timezones = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Asia/Tokyo", "Australia/Sydney"
];

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

interface PracticeData {
  id: string;
  name: string;
  legal_business_name?: string;
  business_registration_number?: string;
  country?: string;
  logo_url?: string;
}

interface PracticeSettings {
  tagline?: string;
  timezone: string;
  default_duration_minutes: number;
  max_appointments_per_day: number;
  cancellation_notice_hours: number;
  buffer_time_minutes: number;
  payments_enabled: boolean;
  currency: string;
  stripe_connected: boolean;
  paypal_connected: boolean;
  email_booking_confirm: boolean;
  sms_booking_confirm: boolean;
  email_reminders: boolean;
  sms_reminders: boolean;
  reminder_hours_before: number;
  primary_color: string;
}

interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  is_primary: boolean;
}

interface StaffRole {
  id: string;
  role_name: string;
  permissions: string[];
}

export const SettingsPanel = ({ open, onOpenChange }: SettingsPanelProps) => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const { uploadFile, uploading } = useFileUpload();
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [savingPayments, setSavingPayments] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  
  const [practice, setPractice] = useState<PracticeData | null>(null);
  const [settings, setSettings] = useState<PracticeSettings>({
    timezone: "America/New_York",
    default_duration_minutes: 30,
    max_appointments_per_day: 20,
    cancellation_notice_hours: 24,
    buffer_time_minutes: 15,
    payments_enabled: false,
    currency: "USD",
    stripe_connected: false,
    paypal_connected: false,
    email_booking_confirm: true,
    sms_booking_confirm: false,
    email_reminders: true,
    sms_reminders: true,
    reminder_hours_before: 24,
    primary_color: "#0ea5e9"
  });
  const [locations, setLocations] = useState<Location[]>([]);
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    if (open && user) {
      loadData();
    }
  }, [open, user]);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: practiceData, error: practiceError } = await supabase
        .from('practices')
        .select('id, name, legal_business_name, business_registration_number, country, logo_url')
        .eq('admin_id', user.id)
        .single();

      if (practiceError) throw practiceError;
      setPractice(practiceData);

      if (practiceData) {
        const { data: settingsData, error: settingsError } = await supabase
          .from('practice_settings')
          .select('*')
          .eq('practice_id', practiceData.id)
          .maybeSingle();

        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
        
        if (settingsData) {
          setSettings({
            tagline: settingsData.tagline || '',
            timezone: settingsData.timezone || 'America/New_York',
            default_duration_minutes: settingsData.default_duration_minutes || 30,
            max_appointments_per_day: settingsData.max_appointments_per_day || 20,
            cancellation_notice_hours: settingsData.cancellation_notice_hours || 24,
            buffer_time_minutes: settingsData.buffer_time_minutes || 15,
            payments_enabled: settingsData.payments_enabled || false,
            currency: settingsData.currency || 'USD',
            stripe_connected: settingsData.stripe_connected || false,
            paypal_connected: settingsData.paypal_connected || false,
            email_booking_confirm: settingsData.email_booking_confirm ?? true,
            sms_booking_confirm: settingsData.sms_booking_confirm || false,
            email_reminders: settingsData.email_reminders ?? true,
            sms_reminders: settingsData.sms_reminders ?? true,
            reminder_hours_before: settingsData.reminder_hours_before || 24,
            primary_color: settingsData.primary_color || '#0ea5e9'
          });
        }

        const { data: locationsData, error: locationsError } = await supabase
          .from('practice_locations')
          .select('id, name, address, city, phone, is_primary')
          .eq('practice_id', practiceData.id)
          .order('is_primary', { ascending: false });

        if (locationsError) throw locationsError;
        setLocations(locationsData || []);

        const { data: rolesData, error: rolesError } = await supabase
          .from('staff_roles')
          .select('*')
          .eq('practice_id', practiceData.id)
          .order('role_name');

        if (rolesError) throw rolesError;
        const mappedRoles = (rolesData || []).map(role => ({
          id: role.id,
          role_name: role.role_name,
          permissions: Array.isArray(role.permissions) ? role.permissions as string[] : []
        }));
        setStaffRoles(mappedRoles);
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
      toast.error(t("settingsPanel.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof PracticeSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (file: File) => {
    if (!practice) return;

    try {
      const result = await uploadFile(file, 'practice-logos', `${practice.id}_logo`);
      if (result) {
        setLogoFile(file);
        toast.success(t("settingsPanel.general.logoUploaded"));
      }
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      toast.error(t("settingsPanel.general.logoUploadFailed"));
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm(t("settingsPanel.locations.deleteConfirm"))) return;

    try {
      const { error } = await supabase
        .from('practice_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;
      
      setLocations(locations.filter(loc => loc.id !== locationId));
      toast.success(t("settingsPanel.locations.deleted"));
    } catch (err: any) {
      console.error('Error deleting location:', err);
      toast.error(t("settingsPanel.locations.deleteFailed"));
    }
  };

  const togglePermission = (roleId: string, permission: string) => {
    setStaffRoles(staffRoles.map(role => {
      if (role.id === roleId) {
        const hasPermission = role.permissions.includes(permission);
        const newPermissions = hasPermission
          ? role.permissions.filter(p => p !== permission)
          : [...role.permissions, permission];
        return { ...role, permissions: newPermissions };
      }
      return role;
    }));
  };

  const handleSaveGeneral = async () => {
    if (!practice) return;

    setSavingGeneral(true);
    try {
      const { error: practiceError } = await supabase
        .from('practices')
        .update({
          business_registration_number: practice.business_registration_number,
          country: practice.country,
        })
        .eq('id', practice.id);

      if (practiceError) throw practiceError;

      const { error: settingsError } = await supabase
        .from('practice_settings')
        .upsert({
          practice_id: practice.id,
          tagline: settings.tagline,
          timezone: settings.timezone,
        }, {
          onConflict: 'practice_id'
        });

      if (settingsError) throw settingsError;

      toast.success(t("settingsPanel.general.saved"));
    } catch (err: any) {
      console.error('Error saving general settings:', err);
      toast.error(err.message || t("settingsPanel.general.saveFailed"));
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!practice) return;

    setSavingPermissions(true);
    try {
      for (const role of staffRoles) {
        const { error: roleError } = await supabase
          .from('staff_roles')
          .update({ permissions: role.permissions })
          .eq('id', role.id);

        if (roleError) throw roleError;
      }

      toast.success(t("settingsPanel.permissions.saved"));
    } catch (err: any) {
      console.error('Error saving permissions:', err);
      toast.error(err.message || t("settingsPanel.permissions.saveFailed"));
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleSaveBooking = async () => {
    if (!practice) return;

    setSavingBooking(true);
    try {
      const { error } = await supabase
        .from('practice_settings')
        .upsert({
          practice_id: practice.id,
          default_duration_minutes: settings.default_duration_minutes,
          max_appointments_per_day: settings.max_appointments_per_day,
          cancellation_notice_hours: settings.cancellation_notice_hours,
          buffer_time_minutes: settings.buffer_time_minutes,
        }, {
          onConflict: 'practice_id'
        });

      if (error) throw error;

      toast.success(t("settingsPanel.booking.saved"));
    } catch (err: any) {
      console.error('Error saving booking settings:', err);
      toast.error(err.message || t("settingsPanel.booking.saveFailed"));
    } finally {
      setSavingBooking(false);
    }
  };

  const handleSavePayments = async () => {
    if (!practice) return;

    setSavingPayments(true);
    try {
      const { error } = await supabase
        .from('practice_settings')
        .upsert({
          practice_id: practice.id,
          payments_enabled: settings.payments_enabled,
          currency: settings.currency,
          stripe_connected: settings.stripe_connected,
          paypal_connected: settings.paypal_connected,
        }, {
          onConflict: 'practice_id'
        });

      if (error) throw error;

      toast.success(t("settingsPanel.payments.saved"));
    } catch (err: any) {
      console.error('Error saving payment settings:', err);
      toast.error(err.message || t("settingsPanel.payments.saveFailed"));
    } finally {
      setSavingPayments(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!practice) return;

    setSavingNotifications(true);
    try {
      const { error } = await supabase
        .from('practice_settings')
        .upsert({
          practice_id: practice.id,
          email_booking_confirm: settings.email_booking_confirm,
          sms_booking_confirm: settings.sms_booking_confirm,
          email_reminders: settings.email_reminders,
          sms_reminders: settings.sms_reminders,
          reminder_hours_before: settings.reminder_hours_before,
        }, {
          onConflict: 'practice_id'
        });

      if (error) throw error;

      toast.success(t("settingsPanel.notifications.saved"));
    } catch (err: any) {
      console.error('Error saving notification settings:', err);
      toast.error(err.message || t("settingsPanel.notifications.saveFailed"));
    } finally {
      setSavingNotifications(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("settingsPanel.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("settingsPanel.title")}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="general">{t("settingsPanel.tabs.general")}</TabsTrigger>
            <TabsTrigger value="locations">{t("settingsPanel.tabs.locations")}</TabsTrigger>
            <TabsTrigger value="permissions">{t("settingsPanel.tabs.permissions")}</TabsTrigger>
            <TabsTrigger value="restrictions">{t("settingsPanel.tabs.restrictions")}</TabsTrigger>
            <TabsTrigger value="booking">{t("settingsPanel.tabs.booking")}</TabsTrigger>
            <TabsTrigger value="payments">{t("settingsPanel.tabs.payments")}</TabsTrigger>
            <TabsTrigger value="notifications">{t("settingsPanel.tabs.notifications")}</TabsTrigger>
          </TabsList>

          <div className="mt-6 overflow-y-auto max-h-[70vh]">
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {t("settingsPanel.general.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t("settingsPanel.general.practiceName")}</Label>
                      <Input value={practice?.name || ''} disabled />
                    </div>
                    <div>
                      <Label htmlFor="registrationNumber">{t("settingsPanel.general.registrationNumber")}</Label>
                      <Input
                        id="registrationNumber"
                        value={practice?.business_registration_number || ''}
                        onChange={(e) => setPractice(prev => prev ? {...prev, business_registration_number: e.target.value} : null)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="tagline">{t("settingsPanel.general.tagline")}</Label>
                    <Textarea
                      id="tagline"
                      value={settings.tagline || ''}
                      onChange={(e) => updateSetting("tagline", e.target.value)}
                      rows={2}
                      placeholder={t("settingsPanel.general.taglinePlaceholder")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="timezone">{t("settingsPanel.general.timezone")}</Label>
                      <Select value={settings.timezone} onValueChange={(value) => updateSetting("timezone", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timezones.map((tz) => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="country">{t("settingsPanel.general.country")}</Label>
                      <Input
                        id="country"
                        value={practice?.country || ''}
                        onChange={(e) => setPractice(prev => prev ? {...prev, country: e.target.value} : null)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("settingsPanel.general.practiceLogo")}</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      {logoFile || practice?.logo_url ? (
                        <div className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{logoFile?.name || t("settingsPanel.general.currentLogo")}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setLogoFile(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="logo-upload"
                            onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                            disabled={uploading}
                          />
                          <Label htmlFor="logo-upload" className="cursor-pointer">
                            {uploading ? (
                              <Loader2 className="mx-auto h-8 w-8 text-muted-foreground animate-spin" />
                            ) : (
                              <>
                                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                                <p className="mt-2 text-sm text-muted-foreground">{t("settingsPanel.general.uploadLogo")}</p>
                              </>
                            )}
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveGeneral} disabled={savingGeneral}>
                  {savingGeneral ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("settingsPanel.general.saving")}
                    </>
                  ) : (
                    t("settingsPanel.general.saveChanges")
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="locations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {t("settingsPanel.locations.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {locations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t("settingsPanel.locations.noLocations")}
                    </p>
                  ) : (
                    locations.map((location) => (
                      <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{location.name}</h4>
                            {location.is_primary && (
                              <Badge variant="default">{t("settingsPanel.locations.primary")}</Badge>
                            )}
                          </div>
                          {location.address && (
                            <p className="text-sm text-muted-foreground">
                              {location.address}, {location.city}
                            </p>
                          )}
                          {location.phone && (
                            <p className="text-sm text-muted-foreground">{location.phone}</p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteLocation(location.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t("settingsPanel.permissions.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {staffRoles.map((role) => (
                    <div key={role.id} className="space-y-3">
                      <h4 className="font-medium">{role.role_name}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {["booking", "patients", "billing", "staff", "reports", "settings"].map((permission) => (
                          <div 
                            key={permission} 
                            className="flex items-center space-x-2 group"
                          >
                            <div className="relative">
                              <Checkbox
                                id={`${role.id}-${permission}`}
                                checked={role.permissions.includes(permission)}
                                onCheckedChange={() => togglePermission(role.id, permission)}
                                className="transition-all duration-200 data-[state=checked]:animate-scale-in data-[state=unchecked]:animate-fade-out"
                              />
                            </div>
                            <Label 
                              htmlFor={`${role.id}-${permission}`} 
                              className="capitalize cursor-pointer select-none transition-colors duration-150 group-hover:text-primary"
                            >
                              {permission}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              
              <div className="flex justify-end pt-4">
                <Button onClick={handleSavePermissions} disabled={savingPermissions}>
                  {savingPermissions ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("settingsPanel.permissions.saving")}
                    </>
                  ) : (
                    t("settingsPanel.permissions.saveChanges")
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="restrictions" className="space-y-6">
              {practice && <DoctorRestrictionsSettings practiceId={practice.id} />}
            </TabsContent>

            <TabsContent value="booking" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {t("settingsPanel.booking.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="defaultDuration">{t("settingsPanel.booking.defaultDuration")}</Label>
                      <Select 
                        value={settings.default_duration_minutes.toString()} 
                        onValueChange={(value) => updateSetting("default_duration_minutes", parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">{t("settingsPanel.booking.durations.15")}</SelectItem>
                          <SelectItem value="30">{t("settingsPanel.booking.durations.30")}</SelectItem>
                          <SelectItem value="45">{t("settingsPanel.booking.durations.45")}</SelectItem>
                          <SelectItem value="60">{t("settingsPanel.booking.durations.60")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="maxPerDay">{t("settingsPanel.booking.maxPerDay")}</Label>
                      <Input
                        id="maxPerDay"
                        type="number"
                        value={settings.max_appointments_per_day}
                        onChange={(e) => updateSetting("max_appointments_per_day", parseInt(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cancellationHours">{t("settingsPanel.booking.cancellationHours")}</Label>
                      <Input
                        id="cancellationHours"
                        type="number"
                        value={settings.cancellation_notice_hours}
                        onChange={(e) => updateSetting("cancellation_notice_hours", parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bufferTime">{t("settingsPanel.booking.bufferTime")}</Label>
                      <Input
                        id="bufferTime"
                        type="number"
                        value={settings.buffer_time_minutes}
                        onChange={(e) => updateSetting("buffer_time_minutes", parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveBooking} disabled={savingBooking}>
                  {savingBooking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("settingsPanel.booking.saving")}
                    </>
                  ) : (
                    t("settingsPanel.booking.saveChanges")
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {t("settingsPanel.payments.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{t("settingsPanel.payments.enableOnline")}</Label>
                      <p className="text-sm text-muted-foreground">{t("settingsPanel.payments.enableOnlineDesc")}</p>
                    </div>
                    <Switch
                      checked={settings.payments_enabled}
                      onCheckedChange={(checked) => updateSetting("payments_enabled", checked)}
                    />
                  </div>

                  {settings.payments_enabled && (
                    <>
                      <div>
                        <Label htmlFor="currency">{t("settingsPanel.payments.currency")}</Label>
                        <Select value={settings.currency} onValueChange={(value) => updateSetting("currency", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((currency) => (
                              <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Button variant="outline" className="w-full" disabled>
                          {settings.stripe_connected ? t("settingsPanel.payments.stripeConnected") : t("settingsPanel.payments.connectStripe")}
                        </Button>
                        <Button variant="outline" className="w-full" disabled>
                          {settings.paypal_connected ? t("settingsPanel.payments.paypalConnected") : t("settingsPanel.payments.connectPaypal")}
                        </Button>
                        <p className="text-xs text-muted-foreground">{t("settingsPanel.payments.integrationComingSoon")}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              
              <div className="flex justify-end pt-4">
                <Button onClick={handleSavePayments} disabled={savingPayments}>
                  {savingPayments ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("settingsPanel.payments.saving")}
                    </>
                  ) : (
                    t("settingsPanel.payments.saveChanges")
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    {t("settingsPanel.notifications.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">{t("settingsPanel.notifications.bookingConfirmations")}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{t("settingsPanel.notifications.emailConfirmations")}</Label>
                        <Switch
                          checked={settings.email_booking_confirm}
                          onCheckedChange={(checked) => updateSetting("email_booking_confirm", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>{t("settingsPanel.notifications.smsConfirmations")}</Label>
                        <Switch
                          checked={settings.sms_booking_confirm}
                          onCheckedChange={(checked) => updateSetting("sms_booking_confirm", checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">{t("settingsPanel.notifications.appointmentReminders")}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>{t("settingsPanel.notifications.emailReminders")}</Label>
                        <Switch
                          checked={settings.email_reminders}
                          onCheckedChange={(checked) => updateSetting("email_reminders", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>{t("settingsPanel.notifications.smsReminders")}</Label>
                        <Switch
                          checked={settings.sms_reminders}
                          onCheckedChange={(checked) => updateSetting("sms_reminders", checked)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="reminderTiming">{t("settingsPanel.notifications.sendRemindersBefore")}</Label>
                      <Select 
                        value={settings.reminder_hours_before.toString()} 
                        onValueChange={(value) => updateSetting("reminder_hours_before", parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{t("settingsPanel.notifications.reminderOptions.1")}</SelectItem>
                          <SelectItem value="24">{t("settingsPanel.notifications.reminderOptions.24")}</SelectItem>
                          <SelectItem value="48">{t("settingsPanel.notifications.reminderOptions.48")}</SelectItem>
                          <SelectItem value="72">{t("settingsPanel.notifications.reminderOptions.72")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveNotifications} disabled={savingNotifications}>
                  {savingNotifications ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("settingsPanel.notifications.saving")}
                    </>
                  ) : (
                    t("settingsPanel.notifications.saveChanges")
                  )}
                </Button>
              </div>
            </TabsContent>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("settingsPanel.close")}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
