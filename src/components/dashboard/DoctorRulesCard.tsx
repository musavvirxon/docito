import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Clock, Shield, Briefcase, AlertCircle, Loader2, Save, X } from 'lucide-react';
import { useDoctorRestrictions } from '@/hooks/useDoctorRestrictions';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SPECIALTY_OPTIONS = [
  'General Practice', 'Endodontics', 'Prosthodontics', 'Orthodontics',
  'Periodontics', 'Oral Surgery', 'Pediatric Dentistry', 'Cosmetic Dentistry',
];
const PROCEDURE_OPTIONS = [
  'Initial Consultation', 'Follow-up', 'General Checkup', 'Teeth Cleaning',
  'X-Ray', 'Filling', 'Root Canal', 'Crown', 'Extraction', 'Implant', 'Whitening',
];

interface Props {
  practiceId: string;
  doctorId: string;
  doctorName?: string;
}

const DoctorRulesCard = ({ practiceId, doctorId, doctorName }: Props) => {
  const { restrictions, loading, save } = useDoctorRestrictions(practiceId, doctorId);
  const [saving, setSaving] = useState(false);

  const [whEnabled, setWhEnabled] = useState(false);
  const [whStart, setWhStart] = useState('09:00');
  const [whEnd, setWhEnd] = useState('18:00');
  const [whDays, setWhDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  const [spEnabled, setSpEnabled] = useState(false);
  const [allowedSp, setAllowedSp] = useState<string[]>([]);
  const [blockedSp, setBlockedSp] = useState<string[]>([]);
  const [newAllowedSp, setNewAllowedSp] = useState('');
  const [newBlockedSp, setNewBlockedSp] = useState('');

  const [prEnabled, setPrEnabled] = useState(false);
  const [mandatoryPr, setMandatoryPr] = useState<string[]>([]);
  const [blockedPr, setBlockedPr] = useState<string[]>([]);
  const [newMandatory, setNewMandatory] = useState('');
  const [newBlocked, setNewBlocked] = useState('');

  const [maxDaily, setMaxDaily] = useState<string>('');
  const [maxWeekly, setMaxWeekly] = useState<string>('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!restrictions) return;
    if (restrictions.working_hours_restriction) {
      const w = restrictions.working_hours_restriction;
      setWhEnabled(!!w.enabled); setWhStart(w.start || '09:00'); setWhEnd(w.end || '18:00');
      setWhDays(w.days || []);
    }
    if (restrictions.specialty_restriction) {
      const s = restrictions.specialty_restriction;
      setSpEnabled(!!s.enabled); setAllowedSp(s.allowedSpecialties || []); setBlockedSp(s.blockedSpecialties || []);
    }
    if (restrictions.procedure_restriction) {
      const p = restrictions.procedure_restriction;
      setPrEnabled(!!p.enabled); setMandatoryPr(p.mandatoryProcedures || []); setBlockedPr(p.blockedProcedures || []);
    }
    setMaxDaily(restrictions.max_daily_appointments ? String(restrictions.max_daily_appointments) : '');
    setMaxWeekly(restrictions.max_weekly_appointments ? String(restrictions.max_weekly_appointments) : '');
    setRequiresApproval(!!restrictions.requires_admin_approval);
    setNotes(restrictions.notes || '');
  }, [restrictions]);

  const toggleDay = (d: string) =>
    setWhDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({
        practice_id: practiceId,
        doctor_id: doctorId,
        working_hours_restriction: whEnabled ? { enabled: true, start: whStart, end: whEnd, days: whDays } : null,
        specialty_restriction: spEnabled ? { enabled: true, allowedSpecialties: allowedSp, blockedSpecialties: blockedSp } : null,
        procedure_restriction: prEnabled ? { enabled: true, mandatoryProcedures: mandatoryPr, blockedProcedures: blockedPr } : null,
        max_daily_appointments: maxDaily ? parseInt(maxDaily, 10) : null,
        max_weekly_appointments: maxWeekly ? parseInt(maxWeekly, 10) : null,
        requires_admin_approval: requiresApproval,
        notes: notes || null,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Rules & Limits</h2>
          <p className="text-sm text-muted-foreground">
            Per-doctor policy{doctorName ? ` for ${doctorName}` : ''}. Overrides practice defaults.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-2" />Save</>}
        </Button>
      </div>

      {/* Booking caps + approval */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" />Booking Limits</CardTitle>
          <CardDescription>Cap how many appointments this doctor can take.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Max appointments / day</Label>
              <Input type="number" min={0} value={maxDaily} onChange={e => setMaxDaily(e.target.value)} placeholder="No limit" />
            </div>
            <div>
              <Label>Max appointments / week</Label>
              <Input type="number" min={0} value={maxWeekly} onChange={e => setMaxWeekly(e.target.value)} placeholder="No limit" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Require admin approval</p>
              <p className="text-xs text-muted-foreground">New bookings stay pending until an admin confirms.</p>
            </div>
            <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
          </div>
        </CardContent>
      </Card>

      {/* Working hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Working Hours</CardTitle>
                <CardDescription>Restrict the hours/days this doctor can be booked.</CardDescription>
              </div>
            </div>
            <Switch checked={whEnabled} onCheckedChange={setWhEnabled} />
          </div>
        </CardHeader>
        {whEnabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start</Label><Input type="time" value={whStart} onChange={e => setWhStart(e.target.value)} /></div>
              <div><Label>End</Label><Input type="time" value={whEnd} onChange={e => setWhEnd(e.target.value)} /></div>
            </div>
            <div>
              <Label>Working Days</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {DAYS_OF_WEEK.map(d => (
                  <Button key={d} type="button" size="sm"
                    variant={whDays.includes(d) ? 'default' : 'outline'} onClick={() => toggleDay(d)}>{d}</Button>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Patients won't see slots outside these hours.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Specialty restrictions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Specialty Restrictions</CardTitle>
                <CardDescription>Allow only certain specialties or explicitly block some.</CardDescription>
              </div>
            </div>
            <Switch checked={spEnabled} onCheckedChange={setSpEnabled} />
          </div>
        </CardHeader>
        {spEnabled && (
          <CardContent className="space-y-6">
            <div>
              <Label>Allowed</Label>
              <div className="flex gap-2 mt-2">
                <Select value={newAllowedSp} onValueChange={setNewAllowedSp}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select specialty" /></SelectTrigger>
                  <SelectContent>
                    {SPECIALTY_OPTIONS.filter(s => !allowedSp.includes(s)).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button disabled={!newAllowedSp} onClick={() => { setAllowedSp([...allowedSp, newAllowedSp]); setNewAllowedSp(''); }}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {allowedSp.map(s => (
                  <Badge key={s} variant="secondary" className="gap-1">
                    {s}<X className="w-3 h-3 cursor-pointer" onClick={() => setAllowedSp(allowedSp.filter(x => x !== s))} />
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <Label>Blocked</Label>
              <div className="flex gap-2 mt-2">
                <Select value={newBlockedSp} onValueChange={setNewBlockedSp}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select specialty" /></SelectTrigger>
                  <SelectContent>
                    {SPECIALTY_OPTIONS.filter(s => !blockedSp.includes(s)).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button disabled={!newBlockedSp} onClick={() => { setBlockedSp([...blockedSp, newBlockedSp]); setNewBlockedSp(''); }}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {blockedSp.map(s => (
                  <Badge key={s} variant="destructive" className="gap-1">
                    {s}<X className="w-3 h-3 cursor-pointer" onClick={() => setBlockedSp(blockedSp.filter(x => x !== s))} />
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Procedure restrictions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Procedures</CardTitle>
                <CardDescription>Mandatory or blocked procedures for this doctor.</CardDescription>
              </div>
            </div>
            <Switch checked={prEnabled} onCheckedChange={setPrEnabled} />
          </div>
        </CardHeader>
        {prEnabled && (
          <CardContent className="space-y-6">
            <div>
              <Label>Mandatory</Label>
              <div className="flex gap-2 mt-2">
                <Select value={newMandatory} onValueChange={setNewMandatory}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select procedure" /></SelectTrigger>
                  <SelectContent>
                    {PROCEDURE_OPTIONS.filter(p => !mandatoryPr.includes(p)).map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button disabled={!newMandatory} onClick={() => { setMandatoryPr([...mandatoryPr, newMandatory]); setNewMandatory(''); }}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {mandatoryPr.map(p => (
                  <Badge key={p} className="gap-1">
                    {p}<X className="w-3 h-3 cursor-pointer" onClick={() => setMandatoryPr(mandatoryPr.filter(x => x !== p))} />
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <Label>Blocked</Label>
              <div className="flex gap-2 mt-2">
                <Select value={newBlocked} onValueChange={setNewBlocked}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select procedure" /></SelectTrigger>
                  <SelectContent>
                    {PROCEDURE_OPTIONS.filter(p => !blockedPr.includes(p)).map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button disabled={!newBlocked} onClick={() => { setBlockedPr([...blockedPr, newBlocked]); setNewBlocked(''); }}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {blockedPr.map(p => (
                  <Badge key={p} variant="destructive" className="gap-1">
                    {p}<X className="w-3 h-3 cursor-pointer" onClick={() => setBlockedPr(blockedPr.filter(x => x !== p))} />
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
          <CardDescription>Optional internal notes about this doctor's rules.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[100px]" placeholder="Internal notes…" />
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorRulesCard;
