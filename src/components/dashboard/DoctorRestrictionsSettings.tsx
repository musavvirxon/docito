import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Shield, Briefcase, AlertCircle, Loader2, Save, X } from 'lucide-react';
import { usePracticeRestrictions, WorkingHoursRestriction, SpecialtyRestriction, ProcedureRestriction } from '@/hooks/usePracticeRestrictions';
import { Separator } from '@/components/ui/separator';

interface DoctorRestrictionsSettingsProps {
  practiceId: string;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SPECIALTY_OPTIONS = [
  'General Practice',
  'Endodontics',
  'Prosthodontics',
  'Orthodontics',
  'Periodontics',
  'Oral Surgery',
  'Pediatric Dentistry',
  'Cosmetic Dentistry',
];

const PROCEDURE_OPTIONS = [
  'Initial Consultation',
  'Follow-up',
  'General Checkup',
  'Teeth Cleaning',
  'X-Ray',
  'Filling',
  'Root Canal',
  'Crown',
  'Extraction',
  'Surgical Extraction',
  'Implant',
  'Whitening',
];

const DoctorRestrictionsSettings = ({ practiceId }: DoctorRestrictionsSettingsProps) => {
  const { restrictions, loading, saveRestrictions } = usePracticeRestrictions(practiceId);
  const [saving, setSaving] = useState(false);

  // Working Hours State
  const [workingHoursEnabled, setWorkingHoursEnabled] = useState(false);
  const [workingStart, setWorkingStart] = useState('09:00');
  const [workingEnd, setWorkingEnd] = useState('18:00');
  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

  // Specialty Restriction State
  const [specialtyEnabled, setSpecialtyEnabled] = useState(false);
  const [allowedSpecialties, setAllowedSpecialties] = useState<string[]>([]);
  const [blockedSpecialties, setBlockedSpecialties] = useState<string[]>([]);
  const [newAllowedSpecialty, setNewAllowedSpecialty] = useState('');
  const [newBlockedSpecialty, setNewBlockedSpecialty] = useState('');

  // Procedure Restriction State
  const [procedureEnabled, setProcedureEnabled] = useState(false);
  const [mandatoryProcedures, setMandatoryProcedures] = useState<string[]>([]);
  const [blockedProcedures, setBlockedProcedures] = useState<string[]>([]);
  const [newMandatory, setNewMandatory] = useState('');
  const [newBlocked, setNewBlocked] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  // Load existing restrictions
  useEffect(() => {
    if (restrictions) {
      // Working Hours
      if (restrictions.working_hours_restriction) {
        setWorkingHoursEnabled(restrictions.working_hours_restriction.enabled);
        setWorkingStart(restrictions.working_hours_restriction.start);
        setWorkingEnd(restrictions.working_hours_restriction.end);
        setWorkingDays(restrictions.working_hours_restriction.days);
      }

      // Specialty
      if (restrictions.specialty_restriction) {
        setSpecialtyEnabled(restrictions.specialty_restriction.enabled);
        setAllowedSpecialties(restrictions.specialty_restriction.allowedSpecialties);
        setBlockedSpecialties(restrictions.specialty_restriction.blockedSpecialties);
      }

      // Procedure
      if (restrictions.procedure_restriction) {
        setProcedureEnabled(restrictions.procedure_restriction.enabled);
        setMandatoryProcedures(restrictions.procedure_restriction.mandatoryProcedures);
        setBlockedProcedures(restrictions.procedure_restriction.blockedProcedures);
      }

      // Notes
      setNotes(restrictions.notes || '');
    }
  }, [restrictions]);

  const toggleDay = (day: string) => {
    setWorkingDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const addAllowedSpecialty = () => {
    if (newAllowedSpecialty && !allowedSpecialties.includes(newAllowedSpecialty)) {
      setAllowedSpecialties([...allowedSpecialties, newAllowedSpecialty]);
      setNewAllowedSpecialty('');
    }
  };

  const removeAllowedSpecialty = (specialty: string) => {
    setAllowedSpecialties(allowedSpecialties.filter(s => s !== specialty));
  };

  const addBlockedSpecialty = () => {
    if (newBlockedSpecialty && !blockedSpecialties.includes(newBlockedSpecialty)) {
      setBlockedSpecialties([...blockedSpecialties, newBlockedSpecialty]);
      setNewBlockedSpecialty('');
    }
  };

  const removeBlockedSpecialty = (specialty: string) => {
    setBlockedSpecialties(blockedSpecialties.filter(s => s !== specialty));
  };

  const addMandatoryProcedure = () => {
    if (newMandatory && !mandatoryProcedures.includes(newMandatory)) {
      setMandatoryProcedures([...mandatoryProcedures, newMandatory]);
      setNewMandatory('');
    }
  };

  const removeMandatoryProcedure = (procedure: string) => {
    setMandatoryProcedures(mandatoryProcedures.filter(p => p !== procedure));
  };

  const addBlockedProcedure = () => {
    if (newBlocked && !blockedProcedures.includes(newBlocked)) {
      setBlockedProcedures([...blockedProcedures, newBlocked]);
      setNewBlocked('');
    }
  };

  const removeBlockedProcedure = (procedure: string) => {
    setBlockedProcedures(blockedProcedures.filter(p => p !== procedure));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRestrictions({
        practice_id: practiceId,
        working_hours_restriction: workingHoursEnabled ? {
          enabled: workingHoursEnabled,
          start: workingStart,
          end: workingEnd,
          days: workingDays,
        } : null,
        specialty_restriction: specialtyEnabled ? {
          enabled: specialtyEnabled,
          allowedSpecialties,
          blockedSpecialties,
        } : null,
        procedure_restriction: procedureEnabled ? {
          enabled: procedureEnabled,
          mandatoryProcedures,
          blockedProcedures,
        } : null,
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
          <h2 className="text-2xl font-bold">Doctor Restrictions</h2>
          <p className="text-muted-foreground">
            Define clinic-level restrictions that apply to all doctors
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Restrictions
            </>
          )}
        </Button>
      </div>

      {/* Summary Card */}
      {(workingHoursEnabled || specialtyEnabled || procedureEnabled) && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Active Restrictions Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {workingHoursEnabled && (
              <div>
                <strong>Working hours:</strong> {workingStart}–{workingEnd} ({workingDays.join(', ')})
              </div>
            )}
            {specialtyEnabled && allowedSpecialties.length > 0 && (
              <div>
                <strong>Allowed Specialties:</strong> {allowedSpecialties.join(', ')}
              </div>
            )}
            {procedureEnabled && mandatoryProcedures.length > 0 && (
              <div>
                <strong>Mandatory Procedures:</strong> {mandatoryProcedures.join(', ')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Working Hours Restriction */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Working Hours Restriction</CardTitle>
                <CardDescription>
                  Set clinic-wide working hours for all doctors
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={workingHoursEnabled}
              onCheckedChange={setWorkingHoursEnabled}
            />
          </div>
        </CardHeader>
        {workingHoursEnabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={workingStart}
                  onChange={(e) => setWorkingStart(e.target.value)}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={workingEnd}
                  onChange={(e) => setWorkingEnd(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label>Working Days</Label>
              <div className="flex gap-2 mt-2">
                {DAYS_OF_WEEK.map(day => (
                  <Button
                    key={day}
                    type="button"
                    variant={workingDays.includes(day) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <AlertCircle className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Doctors will not be able to set availability outside these hours or on non-working days.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Specialty Restriction */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Specialty Restriction</CardTitle>
                <CardDescription>
                  Control which specialties are allowed or blocked
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={specialtyEnabled}
              onCheckedChange={setSpecialtyEnabled}
            />
          </div>
        </CardHeader>
        {specialtyEnabled && (
          <CardContent className="space-y-6">
            {/* Allowed Specialties */}
            <div>
              <Label>Allowed Specialties</Label>
              <div className="flex gap-2 mt-2">
                <Select value={newAllowedSpecialty} onValueChange={setNewAllowedSpecialty}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTY_OPTIONS.filter(s => !allowedSpecialties.includes(s)).map(specialty => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addAllowedSpecialty} disabled={!newAllowedSpecialty}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {allowedSpecialties.map(specialty => (
                  <Badge key={specialty} variant="secondary" className="gap-1">
                    {specialty}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeAllowedSpecialty(specialty)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Blocked Specialties */}
            <div>
              <Label>Blocked Specialties</Label>
              <div className="flex gap-2 mt-2">
                <Select value={newBlockedSpecialty} onValueChange={setNewBlockedSpecialty}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTY_OPTIONS.filter(s => !blockedSpecialties.includes(s)).map(specialty => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addBlockedSpecialty} disabled={!newBlockedSpecialty}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {blockedSpecialties.map(specialty => (
                  <Badge key={specialty} variant="destructive" className="gap-1">
                    {specialty}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeBlockedSpecialty(specialty)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Procedure Restriction */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Procedure & Services Restriction</CardTitle>
                <CardDescription>
                  Define mandatory and blocked procedures
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={procedureEnabled}
              onCheckedChange={setProcedureEnabled}
            />
          </div>
        </CardHeader>
        {procedureEnabled && (
          <CardContent className="space-y-6">
            {/* Mandatory Procedures */}
            <div>
              <Label>Mandatory Procedures</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Applied automatically to all doctors (locked/uneditable)
              </p>
              <div className="flex gap-2">
                <Select value={newMandatory} onValueChange={setNewMandatory}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select procedure" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCEDURE_OPTIONS.filter(p => !mandatoryProcedures.includes(p)).map(proc => (
                      <SelectItem key={proc} value={proc}>
                        {proc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addMandatoryProcedure} disabled={!newMandatory}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {mandatoryProcedures.map(proc => (
                  <Badge key={proc} className="gap-1 bg-green-100 text-green-700">
                    {proc}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeMandatoryProcedure(proc)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Blocked Procedures */}
            <div>
              <Label>Blocked Procedures</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Cannot be added or performed by any doctor
              </p>
              <div className="flex gap-2">
                <Select value={newBlocked} onValueChange={setNewBlocked}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select procedure" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCEDURE_OPTIONS.filter(p => !blockedProcedures.includes(p)).map(proc => (
                      <SelectItem key={proc} value={proc}>
                        {proc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addBlockedProcedure} disabled={!newBlocked}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {blockedProcedures.map(proc => (
                  <Badge key={proc} variant="destructive" className="gap-1">
                    {proc}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeBlockedProcedure(proc)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Policy Notes</CardTitle>
          <CardDescription>Optional notes describing clinic policy</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe your clinic's restriction policy..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorRestrictionsSettings;