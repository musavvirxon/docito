import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Shield, Briefcase, AlertCircle, Loader2, Save, X } from 'lucide-react';
import { usePracticeRestrictions } from '@/hooks/usePracticeRestrictions';
import { Separator } from '@/components/ui/separator';

interface DoctorRestrictionsSettingsProps {
  practiceId: string;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SPECIALTY_OPTIONS = [
  'General Practice', 'Endodontics', 'Prosthodontics', 'Orthodontics',
  'Periodontics', 'Oral Surgery', 'Pediatric Dentistry', 'Cosmetic Dentistry',
];
const PROCEDURE_OPTIONS = [
  'Initial Consultation', 'Follow-up', 'General Checkup', 'Teeth Cleaning',
  'X-Ray', 'Filling', 'Root Canal', 'Crown', 'Extraction', 'Surgical Extraction',
  'Implant', 'Whitening',
];

const DoctorRestrictionsSettings = ({ practiceId }: DoctorRestrictionsSettingsProps) => {
  const { t } = useTranslation('dashboard');
  const { restrictions, loading, saveRestrictions } = usePracticeRestrictions(practiceId);
  const [saving, setSaving] = useState(false);

  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(false);
  const [workingStart, setWorkingStart] = useState('09:00');
  const [workingEnd, setWorkingEnd] = useState('18:00');
  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  const [specialtyEnabled, setSpecialtyEnabled] = useState(false);
  const [allowedSpecialties, setAllowedSpecialties] = useState<string[]>([]);
  const [blockedSpecialties, setBlockedSpecialties] = useState<string[]>([]);
  const [newAllowedSpecialty, setNewAllowedSpecialty] = useState('');
  const [newBlockedSpecialty, setNewBlockedSpecialty] = useState('');

  const [procedureEnabled, setProcedureEnabled] = useState(false);
  const [mandatoryProcedures, setMandatoryProcedures] = useState<string[]>([]);
  const [blockedProcedures, setBlockedProcedures] = useState<string[]>([]);
  const [newMandatory, setNewMandatory] = useState('');
  const [newBlocked, setNewBlocked] = useState('');

  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (restrictions) {
      if (restrictions.working_hours_restriction) {
        setWorkingHoursEnabled(restrictions.working_hours_restriction.enabled);
        setWorkingStart(restrictions.working_hours_restriction.start);
        setWorkingEnd(restrictions.working_hours_restriction.end);
        setWorkingDays(restrictions.working_hours_restriction.days);
      }
      if (restrictions.specialty_restriction) {
        setSpecialtyEnabled(restrictions.specialty_restriction.enabled);
        setAllowedSpecialties(restrictions.specialty_restriction.allowedSpecialties);
        setBlockedSpecialties(restrictions.specialty_restriction.blockedSpecialties);
      }
      if (restrictions.procedure_restriction) {
        setProcedureEnabled(restrictions.procedure_restriction.enabled);
        setMandatoryProcedures(restrictions.procedure_restriction.mandatoryProcedures);
        setBlockedProcedures(restrictions.procedure_restriction.blockedProcedures);
      }
      setNotes(restrictions.notes || '');
    }
  }, [restrictions]);

  const toggleDay = (day: string) =>
    setWorkingDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const addAllowedSpecialty = () => {
    if (newAllowedSpecialty && !allowedSpecialties.includes(newAllowedSpecialty)) {
      setAllowedSpecialties([...allowedSpecialties, newAllowedSpecialty]); setNewAllowedSpecialty('');
    }
  };
  const addBlockedSpecialty = () => {
    if (newBlockedSpecialty && !blockedSpecialties.includes(newBlockedSpecialty)) {
      setBlockedSpecialties([...blockedSpecialties, newBlockedSpecialty]); setNewBlockedSpecialty('');
    }
  };
  const addMandatoryProcedure = () => {
    if (newMandatory && !mandatoryProcedures.includes(newMandatory)) {
      setMandatoryProcedures([...mandatoryProcedures, newMandatory]); setNewMandatory('');
    }
  };
  const addBlockedProcedure = () => {
    if (newBlocked && !blockedProcedures.includes(newBlocked)) {
      setBlockedProcedures([...blockedProcedures, newBlocked]); setNewBlocked('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRestrictions({
        practice_id: practiceId,
        working_hours_restriction: workingHoursEnabled ? { enabled: workingHoursEnabled, start: workingStart, end: workingEnd, days: workingDays } : null,
        specialty_restriction: specialtyEnabled ? { enabled: specialtyEnabled, allowedSpecialties, blockedSpecialties } : null,
        procedure_restriction: procedureEnabled ? { enabled: procedureEnabled, mandatoryProcedures, blockedProcedures } : null,
        notes,
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
          <h2 className="text-2xl font-bold">{t('shell.restrictions.title')}</h2>
          <p className="text-muted-foreground">{t('shell.restrictions.description')}</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('shell.restrictions.saving')}</>)
                  : (<><Save className="w-4 h-4 mr-2" />{t('shell.restrictions.save')}</>)}
        </Button>
      </div>

      {(workingHoursEnabled || specialtyEnabled || procedureEnabled) && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />{t('shell.restrictions.summary.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {workingHoursEnabled && (
              <div><strong>{t('shell.restrictions.summary.workingHours')}</strong> {workingStart}–{workingEnd} ({workingDays.join(', ')})</div>
            )}
            {specialtyEnabled && allowedSpecialties.length > 0 && (
              <div><strong>{t('shell.restrictions.summary.allowedSpecialties')}</strong> {allowedSpecialties.join(', ')}</div>
            )}
            {procedureEnabled && mandatoryProcedures.length > 0 && (
              <div><strong>{t('shell.restrictions.summary.mandatoryProcedures')}</strong> {mandatoryProcedures.join(', ')}</div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>{t('shell.restrictions.workingHours.title')}</CardTitle>
                <CardDescription>{t('shell.restrictions.workingHours.description')}</CardDescription>
              </div>
            </div>
            <Switch checked={workingHoursEnabled} onCheckedChange={setWorkingHoursEnabled} />
          </div>
        </CardHeader>
        {workingHoursEnabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('shell.restrictions.workingHours.start')}</Label>
                <Input type="time" value={workingStart} onChange={(e) => setWorkingStart(e.target.value)} />
              </div>
              <div>
                <Label>{t('shell.restrictions.workingHours.end')}</Label>
                <Input type="time" value={workingEnd} onChange={(e) => setWorkingEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>{t('shell.restrictions.workingHours.days')}</Label>
              <div className="flex gap-2 mt-2">
                {DAYS_OF_WEEK.map(day => (
                  <Button key={day} type="button" variant={workingDays.includes(day) ? 'default' : 'outline'} size="sm" onClick={() => toggleDay(day)}>
                    {t(`shell.doctorRules.days.${day}`)}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('shell.restrictions.workingHours.helper')}</p>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>{t('shell.restrictions.specialty.title')}</CardTitle>
                <CardDescription>{t('shell.restrictions.specialty.description')}</CardDescription>
              </div>
            </div>
            <Switch checked={specialtyEnabled} onCheckedChange={setSpecialtyEnabled} />
          </div>
        </CardHeader>
        {specialtyEnabled && (
          <CardContent className="space-y-6">
            <div>
              <Label>{t('shell.restrictions.specialty.allowed')}</Label>
              <div className="flex gap-2 mt-2">
                <Select value={newAllowedSpecialty} onValueChange={setNewAllowedSpecialty}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder={t('shell.restrictions.specialty.selectPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {SPECIALTY_OPTIONS.filter(s => !allowedSpecialties.includes(s)).map(specialty => (
                      <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addAllowedSpecialty} disabled={!newAllowedSpecialty}>{t('shell.restrictions.specialty.add')}</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {allowedSpecialties.map(s => (
                  <Badge key={s} variant="secondary" className="gap-1">
                    {s}<X className="w-3 h-3 cursor-pointer" onClick={() => setAllowedSpecialties(allowedSpecialties.filter(x => x !== s))} />
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <Label>{t('shell.restrictions.specialty.blocked')}</Label>
              <div className="flex gap-2 mt-2">
                <Select value={newBlockedSpecialty} onValueChange={setNewBlockedSpecialty}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder={t('shell.restrictions.specialty.selectPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {SPECIALTY_OPTIONS.filter(s => !blockedSpecialties.includes(s)).map(specialty => (
                      <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addBlockedSpecialty} disabled={!newBlockedSpecialty}>{t('shell.restrictions.specialty.add')}</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {blockedSpecialties.map(s => (
                  <Badge key={s} variant="destructive" className="gap-1">
                    {s}<X className="w-3 h-3 cursor-pointer" onClick={() => setBlockedSpecialties(blockedSpecialties.filter(x => x !== s))} />
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>{t('shell.restrictions.procedure.title')}</CardTitle>
                <CardDescription>{t('shell.restrictions.procedure.description')}</CardDescription>
              </div>
            </div>
            <Switch checked={procedureEnabled} onCheckedChange={setProcedureEnabled} />
          </div>
        </CardHeader>
        {procedureEnabled && (
          <CardContent className="space-y-6">
            <div>
              <Label>{t('shell.restrictions.procedure.mandatory')}</Label>
              <p className="text-xs text-muted-foreground mb-2">{t('shell.restrictions.procedure.mandatoryHelp')}</p>
              <div className="flex gap-2">
                <Select value={newMandatory} onValueChange={setNewMandatory}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder={t('shell.restrictions.procedure.selectPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {PROCEDURE_OPTIONS.filter(p => !mandatoryProcedures.includes(p)).map(proc => (
                      <SelectItem key={proc} value={proc}>{proc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addMandatoryProcedure} disabled={!newMandatory}>{t('shell.restrictions.procedure.add')}</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {mandatoryProcedures.map(p => (
                  <Badge key={p} className="gap-1 bg-green-100 text-green-700">
                    {p}<X className="w-3 h-3 cursor-pointer" onClick={() => setMandatoryProcedures(mandatoryProcedures.filter(x => x !== p))} />
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <Label>{t('shell.restrictions.procedure.blocked')}</Label>
              <p className="text-xs text-muted-foreground mb-2">{t('shell.restrictions.procedure.blockedHelp')}</p>
              <div className="flex gap-2">
                <Select value={newBlocked} onValueChange={setNewBlocked}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder={t('shell.restrictions.procedure.selectPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {PROCEDURE_OPTIONS.filter(p => !blockedProcedures.includes(p)).map(proc => (
                      <SelectItem key={proc} value={proc}>{proc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addBlockedProcedure} disabled={!newBlocked}>{t('shell.restrictions.procedure.add')}</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {blockedProcedures.map(p => (
                  <Badge key={p} variant="destructive" className="gap-1">
                    {p}<X className="w-3 h-3 cursor-pointer" onClick={() => setBlockedProcedures(blockedProcedures.filter(x => x !== p))} />
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('shell.restrictions.notes.title')}</CardTitle>
          <CardDescription>{t('shell.restrictions.notes.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('shell.restrictions.notes.placeholder')} className="min-h-[100px]" />
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorRestrictionsSettings;
