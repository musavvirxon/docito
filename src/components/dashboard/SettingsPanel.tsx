import { useState } from "react";
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
import { Upload, Building2, Users, Calendar, CreditCard, Bell, Palette, MapPin, X } from "lucide-react";

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const timezones = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Asia/Tokyo", "Australia/Sydney"
];

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];

const mockLocations = [
  { id: "1", name: "Main Office - Downtown", status: "Active" },
  { id: "2", name: "West Side Clinic", status: "Active" }
];

const staffRoles = [
  { role: "Admin", permissions: ["booking", "patients", "billing", "staff", "reports", "settings"] },
  { role: "Doctor", permissions: ["booking", "patients", "reports"] },
  { role: "Nurse", permissions: ["booking", "patients"] },
  { role: "Receptionist", permissions: ["booking"] }
];

export const SettingsPanel = ({ open, onOpenChange }: SettingsPanelProps) => {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState({
    // General Info
    practiceName: "Sunset Medical Center",
    tagline: "Caring for your health and wellness",
    registrationNumber: "MD-12345-2024",
    timezone: "America/New_York",
    country: "United States",
    
    // Booking Settings
    defaultDuration: "30",
    maxPerDay: "20",
    cancellationHours: "24",
    bufferTime: "15",
    
    // Payment Settings
    paymentsEnabled: true,
    currency: "USD",
    
    // Notifications
    emailBookingConfirm: true,
    smsBookingConfirm: false,
    emailReminders: true,
    smsReminders: true,
    reminderTiming: "24",
    
    // Branding
    primaryColor: "#0ea5e9"
  });

  const [uploadedLogo, setUploadedLogo] = useState<File | null>(null);
  const [uploadedFavicon, setUploadedFavicon] = useState<File | null>(null);

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    console.log("Save settings:", settings);
    onOpenChange(false);
  };

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
                      <Label htmlFor="practiceName">Practice Name</Label>
                      <Input
                        id="practiceName"
                        value={settings.practiceName}
                        onChange={(e) => updateSetting("practiceName", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="registrationNumber">Registration Number</Label>
                      <Input
                        id="registrationNumber"
                        value={settings.registrationNumber}
                        onChange={(e) => updateSetting("registrationNumber", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="tagline">Tagline</Label>
                    <Textarea
                      id="tagline"
                      value={settings.tagline}
                      onChange={(e) => updateSetting("tagline", e.target.value)}
                      rows={2}
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
                            <SelectItem key={tz} value={tz}>
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={settings.country}
                        onChange={(e) => updateSetting("country", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Practice Logo</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                        {uploadedLogo ? (
                          <div className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm">{uploadedLogo.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setUploadedLogo(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div>
                            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">Upload logo</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                  {mockLocations.map((location) => (
                    <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{location.name}</h4>
                        <Badge variant="outline">{location.status}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Delete</Button>
                      </div>
                    </div>
                  ))}
                  <Button className="w-full">Add New Location</Button>
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
                  {staffRoles.map((roleData) => (
                    <div key={roleData.role} className="space-y-2">
                      <h4 className="font-medium">{roleData.role}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {["booking", "patients", "billing", "staff", "reports", "settings"].map((permission) => (
                          <div key={permission} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${roleData.role}-${permission}`}
                              checked={roleData.permissions.includes(permission)}
                              disabled
                            />
                            <Label htmlFor={`${roleData.role}-${permission}`} className="capitalize">
                              {permission}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
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
                      <Select value={settings.defaultDuration} onValueChange={(value) => updateSetting("defaultDuration", value)}>
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
                        value={settings.maxPerDay}
                        onChange={(e) => updateSetting("maxPerDay", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cancellationHours">Cancellation Notice (hours)</Label>
                      <Input
                        id="cancellationHours"
                        type="number"
                        value={settings.cancellationHours}
                        onChange={(e) => updateSetting("cancellationHours", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bufferTime">Buffer Time Between Appointments (minutes)</Label>
                      <Input
                        id="bufferTime"
                        type="number"
                        value={settings.bufferTime}
                        onChange={(e) => updateSetting("bufferTime", e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                      checked={settings.paymentsEnabled}
                      onCheckedChange={(checked) => updateSetting("paymentsEnabled", checked)}
                    />
                  </div>

                  {settings.paymentsEnabled && (
                    <>
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Select value={settings.currency} onValueChange={(value) => updateSetting("currency", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((currency) => (
                              <SelectItem key={currency} value={currency}>
                                {currency}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Button variant="outline" className="w-full">
                          Connect Stripe
                        </Button>
                        <Button variant="outline" className="w-full">
                          Connect PayPal
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
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
                          checked={settings.emailBookingConfirm}
                          onCheckedChange={(checked) => updateSetting("emailBookingConfirm", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>SMS Confirmations</Label>
                        <Switch
                          checked={settings.smsBookingConfirm}
                          onCheckedChange={(checked) => updateSetting("smsBookingConfirm", checked)}
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
                          checked={settings.emailReminders}
                          onCheckedChange={(checked) => updateSetting("emailReminders", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>SMS Reminders</Label>
                        <Switch
                          checked={settings.smsReminders}
                          onCheckedChange={(checked) => updateSetting("smsReminders", checked)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="reminderTiming">Send Reminders (hours before)</Label>
                      <Select value={settings.reminderTiming} onValueChange={(value) => updateSetting("reminderTiming", value)}>
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
            </TabsContent>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};