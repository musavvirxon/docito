// src/components/rooms/AddBedModal.tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ClinicBed, BedType, BedStatus, RoomWithBeds } from '@/hooks/useRoomBed';

const BED_TYPES: BedType[] = ['standard','icu','pediatric','bariatric','adjustable'];

interface AddBedModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<ClinicBed, 'id' | 'created_at' | 'updated_at' | 'current_assignment'>) => Promise<void>;
  room: RoomWithBeds;
  editBed?: ClinicBed | null;
}

export function AddBedModal({ open, onClose, onSave, room, editBed }: AddBedModalProps) {
  const { t } = useTranslation('rooms');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bed_number: '',
    bed_type: 'standard' as BedType,
    status: 'available' as BedStatus,
    notes: '',
  });

  useEffect(() => {
    if (editBed) {
      setForm({ bed_number: editBed.bed_number, bed_type: editBed.bed_type, status: editBed.status, notes: editBed.notes ?? '' });
    } else {
      const nums = room.beds.map(b => parseInt(b.bed_number)).filter(n => !isNaN(n));
      const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      setForm({ bed_number: String(next), bed_type: 'standard', status: 'available', notes: '' });
    }
  }, [editBed, open, room]);

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.bed_number.trim()) return;
    setSaving(true);
    await onSave({
      room_id: room.id,
      practice_id: room.practice_id,
      bed_number: form.bed_number.trim(),
      bed_type: form.bed_type,
      status: form.status,
      notes: form.notes || null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editBed ? t('addBedModal.editTitle') : t('addBedModal.titleFor', { room: room.name })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>{t('addBedModal.bedNumber')}</Label>
            <Input placeholder={t('addBedModal.bedNumberPlaceholder')} value={form.bed_number} onChange={e => set('bed_number')(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>{t('addBedModal.bedType')}</Label>
            <Select value={form.bed_type} onValueChange={v => set('bed_type')(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BED_TYPES.map(bt => <SelectItem key={bt} value={bt}>{t(`bedType.${bt}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t('addBedModal.initialStatus')}</Label>
            <Select value={form.status} onValueChange={v => set('status')(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">{t('bedStatus.available')}</SelectItem>
                <SelectItem value="maintenance">{t('bedStatus.maintenance')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t('addBedModal.notes')}</Label>
            <Textarea placeholder={t('addBedModal.notesPlaceholder')} rows={2} value={form.notes} onChange={e => set('notes')(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={!form.bed_number.trim() || saving}>
            {saving ? t('saving') : editBed ? t('saveChanges') : t('addBed')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
