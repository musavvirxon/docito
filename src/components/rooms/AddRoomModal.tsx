// src/components/rooms/AddRoomModal.tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ClinicRoom, RoomType, RoomStatus, RoomWithBeds } from '@/hooks/useRoomBed';

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'general',       label: 'General Ward' },
  { value: 'icu',           label: 'ICU' },
  { value: 'private',       label: 'Private Room' },
  { value: 'ward',          label: 'Shared Ward' },
  { value: 'operating',     label: 'Operating Room' },
  { value: 'recovery',      label: 'Recovery Room' },
  { value: 'consultation',  label: 'Consultation Room' },
  { value: 'pediatric',     label: 'Pediatric Room' },
];

const ROOM_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#64748b',
];

interface AddRoomModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<ClinicRoom, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  practiceId: string;
  editRoom?: RoomWithBeds | null;
}

export function AddRoomModal({ open, onClose, onSave, practiceId, editRoom }: AddRoomModalProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    room_number: '',
    floor: '',
    room_type: 'general' as RoomType,
    status: 'available' as RoomStatus,
    capacity: 1,
    color: ROOM_COLORS[0],
    notes: '',
  });

  useEffect(() => {
    if (editRoom) {
      setForm({
        name: editRoom.name,
        room_number: editRoom.room_number ?? '',
        floor: editRoom.floor ?? '',
        room_type: editRoom.room_type,
        status: editRoom.status,
        capacity: editRoom.capacity,
        color: editRoom.color ?? ROOM_COLORS[0],
        notes: editRoom.notes ?? '',
      });
    } else {
      setForm({ name: '', room_number: '', floor: '', room_type: 'general', status: 'available', capacity: 1, color: ROOM_COLORS[0], notes: '' });
    }
  }, [editRoom, open]);

  const set = (k: string) => (v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
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
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editRoom ? 'Edit Room' : 'Add Room'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Room Name *</Label>
              <Input placeholder="e.g. ICU Ward A" value={form.name} onChange={e => set('name')(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Room Number</Label>
              <Input placeholder="101" value={form.room_number} onChange={e => set('room_number')(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Floor</Label>
              <Input placeholder="1" value={form.floor} onChange={e => set('floor')(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Room Type</Label>
              <Select value={form.room_type} onValueChange={v => set('room_type')(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROOM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Bed Capacity</Label>
              <Input type="number" min={1} max={50} value={form.capacity} onChange={e => set('capacity')(Number(e.target.value))} />
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-1">
            <Label>Room Color</Label>
            <div className="flex gap-2 flex-wrap">
              {ROOM_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color')(c)}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: form.color === c ? '#000' : 'transparent' }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea placeholder="Any special notes about this room..." rows={2} value={form.notes} onChange={e => set('notes')(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || saving}>
            {saving ? 'Saving...' : editRoom ? 'Save Changes' : 'Add Room'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
