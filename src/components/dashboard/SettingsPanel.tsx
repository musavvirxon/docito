import { useState, useEffect } from "react";
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
import { Upload, Building2, Users, Calendar, CreditCard, Bell, MapPin, X, Loader2, Trash2 } from "lucide-react";
import { useFileUpload } from "@/hooks/useFileUpload";

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
      // Load practice
      const { data: practiceData, error: practiceError } = await supabase
        .from('practices')
        .select('id, name, legal_business_name, business_registration_number, country, logo_url')
        .eq('admin_id', user.id)
        .single();

      if (practiceError) throw practiceError;
      setPractice(practiceData);

      if (practiceData) {
        // Load practice settings
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

        // Load locations
        const { data: locationsData, error: locationsError } = await supabase
          .from('practice_locations')
          .select('id, name, address, city, phone, is_primary')
          .eq('practice_id', practiceData.id)
          .order('is_primary', { ascending: false });

        if (locationsError) throw locationsError;
        setLocations(locationsData || []);

        // Load staff roles
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
      toast.error("Failed to load settings");
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
        toast.success("Logo uploaded successfully");
      }
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      toast.error("Failed to upload logo");
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;

    try {
      const { error } = await supabase
        .from('practice_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;
      
      setLocations(locations.filter(loc => loc.id !== locationId));
      toast.success("Location deleted successfully");
    } catch (err: any) {
      console.error('Error deleting location:', err);
      toast.error("Failed to delete location");
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
      // Update practice basic info
      const { error: practiceError } = await supabase
        .from('practices')
        .update({
          business_registration_number: practice.business_registration_number,
          country: practice.country,
        })
        .eq('id', practice.id);

      if (practiceError) throw practiceError;

      // Update tagline and timezone in settings
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

      toast.success("General settings saved successfully");
    } catch (err: any) {
      console.error('Error saving general settings:', err);
      toast.error(err.message || "Failed to save general settings");
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!practice) return;

    setSavingPermissions(true);
    try {
      // Update staff role permissions
      for (const role of staffRoles) {
        const { error: roleError } = await supabase
          .from('staff_roles')
          .update({ permissions: role.permissions })
          .eq('id', role.id);

        if (roleError) throw roleError;
      }

      toast.success("Permissions saved successfully");
    } catch (err: any) {
      console.error('Error saving permissions:', err);
      toast.error(err.message || "Failed to save permissions");
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

      toast.success("Booking settings saved successfully");
    } catch (err: any) {
      console.error('Error saving booking settings:', err);
      toast.error(err.message || "Failed to save booking settings");
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

      toast.success("Payment settings saved successfully");
    } catch (err: any) {
      console.error('Error saving payment settings:', err);
      toast.error(err.message || "Failed to save payment settings");
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

      toast.success("Notification settings saved successfully");
    } catch (err: any) {
      console.error('Error saving notification settings:', err);
      toast.error(err.message || "Failed to save notification settings");
    } finally {
      setSavingNotifications(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Practice Settings</DialogTitle>
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
          <DialogTitle>Practice Settings</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="booking">Booking</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <div className="mt-6 overflow-y-auto max-h-[70vh]">
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    General Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Practice Name</Label>
                      <Input value={practice?.name || ''} disabled />
                    </div>
                    <div>
                      <Label htmlFor="registrationNumber">Registration Number</Label>
                      <Input
                        id="registrationNumber"
                        value={practice?.business_registration_number || ''}
                        onChange={(e) => setPractice(prev => prev ? {...prev, business_registration_number: e.target.value} : null)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="tagline">Tagline</Label>
                    <Textarea
                      id="tagline"
                      value={settings.tagline || ''}
                      onChange={(e) => updateSetting("tagline", e.target.value)}
                      rows={2}
                      placeholder="Your practice's tagline or motto"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
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
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={practice?.country || ''}
                        onChange={(e) => setPractice(prev => prev ? {...prev, country: e.target.value} : null)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Practice Logo</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                      {logoFile || practice?.logo_url ? (
                        <div className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{logoFile?.name || 'Current logo'}</span>
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
                                <p className="mt-2 text-sm text-muted-foreground">Upload logo</p>
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
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="locations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Manage Locations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {locations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No locations added yet. Add your first location to get started.
                    </p>
                  ) : (
                    locations.map((location) => (
                      <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{location.name}</h4>
                            {location.is_primary && (
                              <Badge variant="default">Primary</Badge>
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
                    Staff Permissions
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
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="booking" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Booking Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="defaultDuration">Default Appointment Duration (minutes)</Label>
                      <Select 
                        value={settings.default_duration_minutes.toString()} 
                        onValueChange={(value) => updateSetting("default_duration_minutes", parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="maxPerDay">Maximum Appointments Per Day</Label>
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
                      <Label htmlFor="cancellationHours">Cancellation Notice (hours)</Label>
                      <Input
                        id="cancellationHours"
                        type="number"
                        value={settings.cancellation_notice_hours}
                        onChange={(e) => updateSetting("cancellation_notice_hours", parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bufferTime">Buffer Time Between Appointments (minutes)</Label>
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
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="payments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Online Payments</Label>
                      <p className="text-sm text-muted-foreground">Allow patients to pay online</p>
                    </div>
                    <Switch
                      checked={settings.payments_enabled}
                      onCheckedChange={(checked) => updateSetting("payments_enabled", checked)}
                    />
                  </div>

                  {settings.payments_enabled && (
                    <>
                      <div>
                        <Label htmlFor="currency">Currency</Label>
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
                          {settings.stripe_connected ? "✓ Stripe Connected" : "Connect Stripe"}
                        </Button>
                        <Button variant="outline" className="w-full" disabled>
                          {settings.paypal_connected ? "✓ PayPal Connected" : "Connect PayPal"}
                        </Button>
                        <p className="text-xs text-muted-foreground">Payment integration coming soon</p>
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
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Booking Confirmations</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Email Confirmations</Label>
                        <Switch
                          checked={settings.email_booking_confirm}
                          onCheckedChange={(checked) => updateSetting("email_booking_confirm", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>SMS Confirmations</Label>
                        <Switch
                          checked={settings.sms_booking_confirm}
                          onCheckedChange={(checked) => updateSetting("sms_booking_confirm", checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Appointment Reminders</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Email Reminders</Label>
                        <Switch
                          checked={settings.email_reminders}
                          onCheckedChange={(checked) => updateSetting("email_reminders", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>SMS Reminders</Label>
                        <Switch
                          checked={settings.sms_reminders}
                          onCheckedChange={(checked) => updateSetting("sms_reminders", checked)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="reminderTiming">Send Reminders (hours before)</Label>
                      <Select 
                        value={settings.reminder_hours_before.toString()} 
                        onValueChange={(value) => updateSetting("reminder_hours_before", parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 hour</SelectItem>
                          <SelectItem value="24">24 hours</SelectItem>
                          <SelectItem value="48">48 hours</SelectItem>
                          <SelectItem value="72">72 hours</SelectItem>
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
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </TabsContent>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};