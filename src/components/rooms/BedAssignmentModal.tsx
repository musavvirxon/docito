// src/components/rooms/BedAssignmentModal.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, BedDouble, User } from 'lucide-react';
import { BED_STATUS } from './RoomFloorPlan';
import type { ClinicBed, RoomWithBeds, BedStatus } from '@/hooks/useRoomBed';

interface BedAssignmentModalProps {
  open: boolean;
  onClose: () => void;
  bed: ClinicBed | null;
  room: RoomWithBeds | null;
  practiceId: string;
  userId: string;
  canAssign: boolean;
  onAssign: (params: { bed_id: string; patient_id?: string | null; doctor_id?: string | null; assigned_by: string; notes?: string }) => Promise<void>;
  onUnassign: (assignmentId: string, bedId: string) => Promise<void>;
  onStatusChange: (bedId: string, status: BedStatus) => Promise<void>;
}

export function BedAssignmentModal({
  open, onClose, bed, room, practiceId, userId, canAssign, onAssign, onUnassign, onStatusChange,
}: BedAssignmentModalProps) {
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [notes, setNotes] = useState('');
  const [newStatus, setNewStatus] = useState<BedStatus>('available');
  const [saving, setSaving] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const assignment = bed?.current_assignment;
  const isOccupied = bed?.status === 'occupied';

  // Fetch patients for this practice
  useEffect(() => {
    if (!open || !practiceId) return;
    setLoadingPatients(true);
    (supabase as any)
      .from('patients')
      .select('id, full_name')
      .eq('practice_id', practiceId)
      .order('full_name')
      .then(({ data }) => {
        setPatients((data ?? []).map((p: any) => ({ id: p.id, name: p.full_name })));
        setLoadingPatients(false);
      });
  }, [open, practiceId]);

  // Reset form when bed changes
  useEffect(() => {
    setSelectedPatient('');
    setNotes('');
    if (bed) setNewStatus(bed.status);
  }, [bed, open]);

  const handleAssign = async () => {
    if (!bed) return;
    setSaving(true);
    await onAssign({ bed_id: bed.id, patient_id: selectedPatient || null, assigned_by: userId, notes });
    setSaving(false);
    onClose();
  };

  const handleUnassign = async () => {
    if (!bed || !assignment) return;
    setSaving(true);
    await onUnassign(assignment.id, bed.id);
    setSaving(false);
    onClose();
  };

  const handleStatusChange = async () => {
    if (!bed || newStatus === bed.status) return;
    setSaving(true);
    await onStatusChange(bed.id, newStatus);
    setSaving(false);
    onClose();
  };

  if (!bed || !room) return null;

  const cfg = BED_STATUS[bed.status];

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="w-4 h-4" />
            Bed {bed.bed_number} — {room.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current status */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            <span className="text-sm font-medium">{cfg.label}</span>
            <Badge variant="outline" className="ml-auto text-xs capitalize">{bed.bed_type}</Badge>
          </div>

          {/* Current assignment info */}
          {isOccupied && assignment && (
            <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 space-y-1">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1"><User className="w-3.5 h-3.5" />Occupied</p>
              {assignment.patient_name && <p className="text-sm font-medium">{assignment.patient_name}</p>}
              {assignment.doctor_name && <p className="text-xs text-muted-foreground">Assigned by Dr. {assignment.doctor_name}</p>}
              <p className="text-xs text-muted-foreground">Since {new Date(assignment.admitted_at).toLocaleDateString()}</p>
            </div>
          )}

          {/* Assign patient (only for available beds) */}
          {canAssign && !isOccupied && bed.status !== 'maintenance' && bed.status !== 'cleaning' && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Assign Patient</h4>
              <div className="space-y-1">
                <Label className="text-xs">Patient (optional)</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient} disabled={loadingPatients}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingPatients ? 'Loading...' : 'Select patient'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific patient</SelectItem>
                    {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Textarea placeholder="Admission notes..." rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
          )}

          {/* Discharge (for occupied beds) */}
          {canAssign && isOccupied && assignment && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
              <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                Discharge patient
              </div>
              <p className="text-xs text-muted-foreground">This will discharge the patient and set the bed to "Cleaning".</p>
            </div>
          )}

          {/* Status change (for staff/admin) */}
          {canAssign && !isOccupied && (
            <div className="space-y-1">
              <Label className="text-xs">Change Bed Status</Label>
              <Select value={newStatus} onValueChange={v => setNewStatus(v as BedStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {canAssign && isOccupied && assignment && (
            <Button variant="destructive" onClick={handleUnassign} disabled={saving}>
              {saving ? 'Discharging...' : 'Discharge Patient'}
            </Button>
          )}
          {canAssign && !isOccupied && bed.status !== 'maintenance' && bed.status !== 'cleaning' && (
            <Button onClick={handleAssign} disabled={saving}>
              {saving ? 'Assigning...' : 'Assign to Bed'}
            </Button>
          )}
          {canAssign && !isOccupied && newStatus !== bed.status && (
            <Button variant="secondary" onClick={handleStatusChange} disabled={saving}>
              {saving ? 'Updating...' : 'Update Status'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
