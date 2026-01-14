import { useEffect, useMemo, useState } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, Plus, X } from 'lucide-react';

type LabCenter = Database['public']['Tables']['lab_centers']['Row'];

export interface LabCenterInput {
  name: string;
  type: string;
  license_number?: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
  phone: string;
  email?: string;
  website?: string;
  services_offered?: string[];
  accreditations?: string[];
  accepts_insurance?: boolean;
  average_turnaround_hours?: number;
  operating_hours?: any;
}

interface Props {
  labCenter: LabCenter;
  updateLabCenter: (id: string, updates: Partial<LabCenterInput>) => Promise<any>;
}

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun'
};

function defaultOperatingHours() {
  const base = { open: '09:00', close: '18:00', closed: false };
  return { mon: { ...base }, tue: { ...base }, wed: { ...base }, thu: { ...base }, fri: { ...base }, sat: { ...base, closed: true }, sun: { ...base, closed: true } };
}

export default function LabSettings({ labCenter, updateLabCenter }: Props) {
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(labCenter.name ?? '');
  const [email, setEmail] = useState(labCenter.email ?? '');
  const [phone, setPhone] = useState(labCenter.phone ?? '');
  const [website, setWebsite] = useState(labCenter.website ?? '');
  const [license, setLicense] = useState(labCenter.license_number ?? '');
  const [acceptsInsurance, setAcceptsInsurance] = useState(!!labCenter.accepts_insurance);

  const [address, setAddress] = useState(labCenter.address ?? '');
  const [city, setCity] = useState(labCenter.city ?? '');
  const [state, setState] = useState(labCenter.state ?? '');
  const [postal, setPostal] = useState(labCenter.postal_code ?? '');
  const [country, setCountry] = useState(labCenter.country ?? '');

  const [avgTurnaround, setAvgTurnaround] = useState<number>(labCenter.average_turnaround_hours ?? 24);

  const [services, setServices] = useState<string[]>(labCenter.services_offered ?? []);
  const [accreditations, setAccreditations] = useState<string[]>(labCenter.accreditations ?? []);

  const [newService, setNewService] = useState('');
  const [newAcc, setNewAcc] = useState('');

  const [operatingHours, setOperatingHours] = useState<any>(() => {
    const oh = labCenter.operating_hours as any;
    return (oh && typeof oh === 'object') ? oh : defaultOperatingHours();
  });

  const [rawOperatingHours, setRawOperatingHours] = useState<string>('');
  const [useRawEditor, setUseRawEditor] = useState(false);

  useEffect(() => {
    setRawOperatingHours(JSON.stringify(operatingHours, null, 2));
  }, [operatingHours]);

  const dirty = useMemo(() => {
    return (
      name !== (labCenter.name ?? '') ||
      email !== (labCenter.email ?? '') ||
      phone !== (labCenter.phone ?? '') ||
      website !== (labCenter.website ?? '') ||
      license !== (labCenter.license_number ?? '') ||
      acceptsInsurance !== !!labCenter.accepts_insurance ||
      address !== (labCenter.address ?? '') ||
      city !== (labCenter.city ?? '') ||
      state !== (labCenter.state ?? '') ||
      postal !== (labCenter.postal_code ?? '') ||
      country !== (labCenter.country ?? '') ||
      avgTurnaround !== (labCenter.average_turnaround_hours ?? 24) ||
      JSON.stringify(services) !== JSON.stringify(labCenter.services_offered ?? []) ||
      JSON.stringify(accreditations) !== JSON.stringify(labCenter.accreditations ?? []) ||
      JSON.stringify(operatingHours) !== JSON.stringify((labCenter.operating_hours as any) ?? defaultOperatingHours())
    );
  }, [
    labCenter, name, email, phone, website, license, acceptsInsurance,
    address, city, state, postal, country, avgTurnaround,
    services, accreditations, operatingHours
  ]);

  const onSave = async () => {
    try {
      setSaving(true);

      let oh = operatingHours;
      if (useRawEditor) {
        try {
          oh = JSON.parse(rawOperatingHours);
        } catch {
          toast.error('Operating hours JSON is invalid');
          return;
        }
      }

      await updateLabCenter(labCenter.id, {
        name,
        email: email || null,
        phone,
        website: website || null,
        license_number: license || null,
        accepts_insurance: acceptsInsurance,

        address,
        city,
        state: state || null,
        postal_code: postal || null,
        country,

        average_turnaround_hours: Number.isFinite(avgTurnaround) ? avgTurnaround : 24,
        services_offered: services,
        accreditations: accreditations,
        operating_hours: oh,
      });

      toast.success('Settings saved');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addTag = (value: string, current: string[], set: (v: string[]) => void) => {
    const v = value.trim();
    if (!v) return;
    if (current.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    set([v, ...current]);
  };

  const removeTag = (value: string, current: string[], set: (v: string[]) => void) => {
    set(current.filter((x) => x !== value));
  };

  const setDay = (day: DayKey, patch: Partial<{ open: string; close: string; closed: boolean }>) => {
    setOperatingHours((prev: any) => ({
      ...prev,
      [day]: { ...(prev?.[day] ?? { open: '09:00', close: '18:00', closed: false }), ...patch },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Lab Settings</h2>
          <p className="text-muted-foreground">Manage your lab center profile, operations, and services.</p>
        </div>
        <Button onClick={onSave} disabled={!dirty || saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Info</CardTitle>
              <CardDescription>Your lab’s public and contact information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lab Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">License Number</label>
                  <Input value={license} onChange={(e) => setLicense(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Website</label>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="optional" />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Accepts Insurance</p>
                  <p className="text-sm text-muted-foreground">Enable insurance billing for this lab.</p>
                </div>
                <Switch checked={acceptsInsurance} onCheckedChange={setAcceptsInsurance} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
              <CardDescription>Where your lab operates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Street Address</label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">City</label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">State</label>
                  <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="optional" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Postal Code</label>
                  <Input value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="optional" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Country</label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations */}
        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Turnaround</CardTitle>
              <CardDescription>Operational performance settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Average Turnaround (hours)</label>
                  <Input
                    type="number"
                    min={1}
                    value={avgTurnaround}
                    onChange={(e) => setAvgTurnaround(Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operating Hours</CardTitle>
              <CardDescription>Set weekly schedule (simple editor) or switch to JSON mode.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Use raw JSON editor</p>
                <Switch checked={useRawEditor} onCheckedChange={setUseRawEditor} />
              </div>

              {!useRawEditor ? (
                <div className="space-y-3">
                  {(Object.keys(DAY_LABELS) as DayKey[]).map((day) => {
                    const d = operatingHours?.[day] ?? { open: '09:00', close: '18:00', closed: false };
                    return (
                      <div key={day} className="flex flex-col md:flex-row md:items-center gap-3 p-3 border rounded-lg">
                        <div className="w-16 font-medium">{DAY_LABELS[day]}</div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Closed</span>
                          <Switch
                            checked={!!d.closed}
                            onCheckedChange={(v) => setDay(day, { closed: v })}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Open</span>
                          <Input
                            className="w-[120px]"
                            type="time"
                            value={d.open ?? '09:00'}
                            onChange={(e) => setDay(day, { open: e.target.value })}
                            disabled={!!d.closed}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Close</span>
                          <Input
                            className="w-[120px]"
                            type="time"
                            value={d.close ?? '18:00'}
                            onChange={(e) => setDay(day, { close: e.target.value })}
                            disabled={!!d.closed}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Operating hours JSON</label>
                  <Textarea
                    className="min-h-[260px] font-mono text-sm"
                    value={rawOperatingHours}
                    onChange={(e) => setRawOperatingHours(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be valid JSON. Example keys: mon,tue,wed,thu,fri,sat,sun with open/close/closed.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Services Offered</CardTitle>
              <CardDescription>Add or remove services visible for your lab.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={newService} onChange={(e) => setNewService(e.target.value)} placeholder="e.g. Blood tests" />
                <Button
                  type="button"
                  onClick={() => {
                    addTag(newService, services, setServices);
                    setNewService('');
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No services added yet.</p>
                ) : (
                  services.map((s) => (
                    <Badge key={s} variant="secondary" className="flex items-center gap-2">
                      {s}
                      <button
                        type="button"
                        onClick={() => removeTag(s, services, setServices)}
                        className="opacity-70 hover:opacity-100"
                        aria-label="remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Accreditations</CardTitle>
              <CardDescription>Keep your certifications up to date.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={newAcc} onChange={(e) => setNewAcc(e.target.value)} placeholder="e.g. ISO 15189" />
                <Button
                  type="button"
                  onClick={() => {
                    addTag(newAcc, accreditations, setAccreditations);
                    setNewAcc('');
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {accreditations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No accreditations added yet.</p>
                ) : (
                  accreditations.map((a) => (
                    <Badge key={a} variant="secondary" className="flex items-center gap-2">
                      {a}
                      <button
                        type="button"
                        onClick={() => removeTag(a, accreditations, setAccreditations)}
                        className="opacity-70 hover:opacity-100"
                        aria-label="remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
