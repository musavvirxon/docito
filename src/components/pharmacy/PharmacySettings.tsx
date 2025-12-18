import { useState, useEffect } from 'react';
import { usePharmacy } from '@/hooks/usePharmacy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Settings, 
  Building2, 
  Clock, 
  Truck, 
  Shield, 
  Bell,
  Save,
  MapPin,
  Phone,
  Mail,
  Globe,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  pharmacyId: string;
}

interface OperatingHours {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

const defaultHours: OperatingHours[] = [
  { day: 'Monday', open: '09:00', close: '18:00', isClosed: false },
  { day: 'Tuesday', open: '09:00', close: '18:00', isClosed: false },
  { day: 'Wednesday', open: '09:00', close: '18:00', isClosed: false },
  { day: 'Thursday', open: '09:00', close: '18:00', isClosed: false },
  { day: 'Friday', open: '09:00', close: '18:00', isClosed: false },
  { day: 'Saturday', open: '10:00', close: '16:00', isClosed: false },
  { day: 'Sunday', open: '10:00', close: '16:00', isClosed: true },
];

export default function PharmacySettings({ pharmacyId }: Props) {
  const { pharmacy, updatePharmacy } = usePharmacy(pharmacyId);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  
  const [profile, setProfile] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    license_number: '',
    description: '',
  });

  const [settings, setSettings] = useState({
    delivery_available: false,
    delivery_radius_km: 10,
    delivery_fee: 5,
    free_delivery_threshold: 50,
    is_24_hours: false,
    accepts_insurance: true,
    accepts_online_orders: true,
    requires_prescription_verification: true,
  });

  const [operatingHours, setOperatingHours] = useState<OperatingHours[]>(defaultHours);

  const [notifications, setNotifications] = useState({
    email_new_prescription: true,
    email_low_stock: true,
    email_insurance_update: false,
    sms_order_ready: true,
    push_urgent_orders: true,
  });

  useEffect(() => {
    if (pharmacy) {
      setProfile({
        name: pharmacy.name || '',
        address: pharmacy.address || '',
        city: pharmacy.city || '',
        state: pharmacy.state || '',
        postal_code: pharmacy.postal_code || '',
        country: pharmacy.country || '',
        phone: pharmacy.phone || '',
        email: pharmacy.email || '',
        website: pharmacy.website || '',
        license_number: pharmacy.license_number || '',
        description: '',
      });
      setSettings(prev => ({
        ...prev,
        delivery_available: pharmacy.delivery_available || false,
      }));
    }
  }, [pharmacy]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updatePharmacy(pharmacyId, profile);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updatePharmacy(pharmacyId, {
        delivery_available: settings.delivery_available,
      });
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const updateHours = (index: number, field: keyof OperatingHours, value: string | boolean) => {
    setOperatingHours(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Pharmacy Settings
          </h2>
          <p className="text-muted-foreground">Manage your pharmacy profile and preferences</p>
        </div>
        {pharmacy?.verified && (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
            <Shield className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="hours">Operating Hours</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Pharmacy Information
              </CardTitle>
              <CardDescription>Update your pharmacy details visible to patients</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pharmacy Name</Label>
                  <Input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Enter pharmacy name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>License Number</Label>
                  <Input
                    value={profile.license_number}
                    onChange={(e) => setProfile({ ...profile, license_number: e.target.value })}
                    placeholder="Pharmacy license number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={profile.description}
                  onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                  placeholder="Brief description of your pharmacy"
                  rows={3}
                />
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label>Street Address</Label>
                    <Input
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      placeholder="Street address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State/Province</Label>
                    <Input
                      value={profile.state}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code</Label>
                    <Input
                      value={profile.postal_code}
                      onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                      placeholder="Postal code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={profile.country}
                      onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone
                    </Label>
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      placeholder="pharmacy@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website
                    </Label>
                    <Input
                      value={profile.website}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Operating Hours
              </CardTitle>
              <CardDescription>Set your pharmacy's business hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">24/7 Operation</p>
                  <p className="text-sm text-muted-foreground">Pharmacy is open 24 hours a day</p>
                </div>
                <Switch
                  checked={settings.is_24_hours}
                  onCheckedChange={(checked) => setSettings({ ...settings, is_24_hours: checked })}
                />
              </div>

              {!settings.is_24_hours && (
                <div className="space-y-3">
                  {operatingHours.map((hours, index) => (
                    <div key={hours.day} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="w-28 font-medium">{hours.day}</div>
                      <Switch
                        checked={!hours.isClosed}
                        onCheckedChange={(checked) => updateHours(index, 'isClosed', !checked)}
                      />
                      {!hours.isClosed ? (
                        <>
                          <Input
                            type="time"
                            value={hours.open}
                            onChange={(e) => updateHours(index, 'open', e.target.value)}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={hours.close}
                            onChange={(e) => updateHours(index, 'close', e.target.value)}
                            className="w-32"
                          />
                        </>
                      ) : (
                        <span className="text-muted-foreground">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Hours
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Delivery Settings
              </CardTitle>
              <CardDescription>Configure delivery options for your pharmacy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Enable Delivery</p>
                  <p className="text-sm text-muted-foreground">Offer home delivery to patients</p>
                </div>
                <Switch
                  checked={settings.delivery_available}
                  onCheckedChange={(checked) => setSettings({ ...settings, delivery_available: checked })}
                />
              </div>

              {settings.delivery_available && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Delivery Radius (km)</Label>
                    <Input
                      type="number"
                      value={settings.delivery_radius_km}
                      onChange={(e) => setSettings({ ...settings, delivery_radius_km: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery Fee ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={settings.delivery_fee}
                      onChange={(e) => setSettings({ ...settings, delivery_fee: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Free Delivery Above ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={settings.free_delivery_threshold}
                      onChange={(e) => setSettings({ ...settings, free_delivery_threshold: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}

              <div className="border-t pt-6 space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment & Insurance
                </h4>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Accept Insurance</p>
                    <p className="text-sm text-muted-foreground">Process insurance claims for patients</p>
                  </div>
                  <Switch
                    checked={settings.accepts_insurance}
                    onCheckedChange={(checked) => setSettings({ ...settings, accepts_insurance: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Online Orders</p>
                    <p className="text-sm text-muted-foreground">Accept prescription orders online</p>
                  </div>
                  <Switch
                    checked={settings.accepts_online_orders}
                    onCheckedChange={(checked) => setSettings({ ...settings, accepts_online_orders: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Prescription Verification</p>
                    <p className="text-sm text-muted-foreground">Require pharmacist verification before dispensing</p>
                  </div>
                  <Switch
                    checked={settings.requires_prescription_verification}
                    onCheckedChange={(checked) => setSettings({ ...settings, requires_prescription_verification: checked })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how you want to receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium">Email Notifications</h4>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">New Prescriptions</p>
                    <p className="text-sm text-muted-foreground">Get notified when new prescriptions arrive</p>
                  </div>
                  <Switch
                    checked={notifications.email_new_prescription}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email_new_prescription: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Low Stock Alerts</p>
                    <p className="text-sm text-muted-foreground">Get notified when inventory is running low</p>
                  </div>
                  <Switch
                    checked={notifications.email_low_stock}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email_low_stock: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Insurance Updates</p>
                    <p className="text-sm text-muted-foreground">Get notified about insurance claim status changes</p>
                  </div>
                  <Switch
                    checked={notifications.email_insurance_update}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email_insurance_update: checked })}
                  />
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">SMS Notifications</h4>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Order Ready</p>
                    <p className="text-sm text-muted-foreground">Notify patients when their order is ready</p>
                  </div>
                  <Switch
                    checked={notifications.sms_order_ready}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, sms_order_ready: checked })}
                  />
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">Push Notifications</h4>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Urgent Orders</p>
                    <p className="text-sm text-muted-foreground">Get instant alerts for urgent prescriptions</p>
                  </div>
                  <Switch
                    checked={notifications.push_urgent_orders}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, push_urgent_orders: checked })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => toast.success('Notification preferences saved')}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
