// src/components/rooms/AddRoomModal.tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import type { ClinicRoom, RoomType, RoomStatus, RoomWithBeds } from '@/hooks/useRoomBed';

const ROOM_TYPES: RoomType[] = ['general','icu','private','ward','operating','recovery','consultation','pediatric'];
const ROOM_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#64748b'];
const UNASSIGNED = '__unassigned__';

interface DoctorOption {
  id: string;
  name: string;
}

interface AddRoomModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<ClinicRoom, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  practiceId: string;
  editRoom?: RoomWithBeds | null;
  /** 'cabinet' preselects consultation type and requires a doctor. */
  mode?: 'room' | 'cabinet';
}

export function AddRoomModal({ open, onClose, onSave, practiceId, editRoom, mode = 'room' }: AddRoomModalProps) {
  const { t } = useTranslation('rooms');
  const isCabinet = mode === 'cabinet' || editRoom?.room_type === 'consultation';
  const [saving, setSaving] = useState(false);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [form, setForm] = useState({
    name: '', room_number: '', floor: '',
    room_type: 'general' as RoomType, status: 'available' as RoomStatus,
    capacity: 1, color: ROOM_COLORS[0], notes: '',
    primary_doctor_id: null as string | null,
  });

  // Fetch doctors of this practice for the "primary doctor" picker.
  useEffect(() => {
    if (!open || !practiceId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('doctors')
        .select('id, profiles:user_id ( full_name )')
        .eq('practice_id', practiceId);
      const opts: DoctorOption[] = (data ?? [])
        .map((d: any) => ({ id: d.id, name: d.profiles?.full_name ?? '—' }))
        .sort((a: DoctorOption, b: DoctorOption) => a.name.localeCompare(b.name));
      setDoctors(opts);
    })();
  }, [open, practiceId]);

  useEffect(() => {
    if (editRoom) {
      setForm({
        name: editRoom.name, room_number: editRoom.room_number ?? '', floor: editRoom.floor ?? '',
        room_type: editRoom.room_type, status: editRoom.status, capacity: editRoom.capacity,
        color: editRoom.color ?? ROOM_COLORS[0], notes: editRoom.notes ?? '',
        primary_doctor_id: editRoom.primary_doctor_id ?? null,
      });
    } else if (mode === 'cabinet') {
      setForm({ name: '', room_number: '', floor: '', room_type: 'consultation', status: 'available', capacity: 1, color: '#0ea5e9', notes: '', primary_doctor_id: null });
    } else {
      setForm({ name: '', room_number: '', floor: '', room_type: 'general', status: 'available', capacity: 1, color: ROOM_COLORS[0], notes: '', primary_doctor_id: null });
    }
  }, [editRoom, open, mode]);

  const set = (k: string) => (v: string | number | null) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (isCabinet && !form.primary_doctor_id) return;
    setSaving(true);
    await onSave({
      practice_id: practiceId,
      name: form.name.trim(),
      room_number: form.room_number || null,
      floor: form.floor || null,
      room_type: form.room_type,
      status: form.status,
      capacity: form.capacity,
      color: form.color,
      notes: form.notes || null,
      primary_doctor_id: form.primary_doctor_id,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editRoom
              ? (isCabinet ? t('addCabinetModal.editTitle', 'Edit Cabinet') : t('addRoomModal.editTitle'))
              : (isCabinet ? t('addCabinetModal.title', 'Add Cabinet') : t('addRoomModal.title'))}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>{t('addRoomModal.name')}</Label>
              <Input placeholder={t('addRoomModal.namePlaceholder')} value={form.name} onChange={e => set('name')(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t('addRoomModal.roomNumber')}</Label>
              <Input placeholder={t('addRoomModal.roomNumberPlaceholder')} value={form.room_number} onChange={e => set('room_number')(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t('addRoomModal.floor')}</Label>
              <Input placeholder={t('addRoomModal.floorPlaceholder')} value={form.floor} onChange={e => set('floor')(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t('addRoomModal.roomType')}</Label>
              <Select value={form.room_type} onValueChange={v => set('room_type')(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map(rt => <SelectItem key={rt} value={rt}>{t(`roomType.${rt}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('addRoomModal.capacity')}</Label>
              <Input type="number" min={1} max={50} value={form.capacity} onChange={e => set('capacity')(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t('addRoomModal.primaryDoctor', 'Assigned doctor')}</Label>
            <Select
              value={form.primary_doctor_id ?? UNASSIGNED}
              onValueChange={v => set('primary_doctor_id')(v === UNASSIGNED ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('addRoomModal.primaryDoctorPlaceholder', 'Pick a doctor (optional)')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>{t('addRoomModal.noDoctor', 'No assigned doctor')}</SelectItem>
                {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('addRoomModal.primaryDoctorHint', 'Patients see this doctor as the one working in this room / counter.')}
            </p>
          </div>

          <div className="space-y-1">
            <Label>{t('addRoomModal.color')}</Label>
            <div className="flex gap-2 flex-wrap">
              {ROOM_COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => set('color')(c)}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: form.color === c ? '#000' : 'transparent' }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t('addRoomModal.notes')}</Label>
            <Textarea placeholder={t('addRoomModal.notesPlaceholder')} rows={2} value={form.notes} onChange={e => set('notes')(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving ? t('saving') : editRoom ? t('saveChanges') : t('addRoom')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
