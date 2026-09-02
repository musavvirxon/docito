// src/hooks/useRoomBed.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RoomType = 'general' | 'icu' | 'private' | 'ward' | 'operating' | 'recovery' | 'consultation' | 'pediatric';
export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'closed';
export type BedStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
export type BedType = 'standard' | 'icu' | 'pediatric' | 'bariatric' | 'adjustable';

export interface ClinicRoom {
  id: string;
  practice_id: string;
  name: string;
  room_number: string | null;
  floor: string | null;
  room_type: RoomType;
  status: RoomStatus;
  capacity: number;
  color: string | null;
  notes: string | null;
  primary_doctor_id: string | null;
  primary_doctor_name?: string | null;
  show_on_display?: boolean;

  created_at: string;
  updated_at: string;
}

export interface ClinicBed {
  id: string;
  room_id: string;
  practice_id: string;
  bed_number: string;
  bed_type: BedType;
  status: BedStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  current_assignment?: BedAssignment | null;
}

export interface BedAssignment {
  id: string;
  bed_id: string;
  practice_id: string;
  patient_id: string | null;
  doctor_id: string | null;
  appointment_id: string | null;
  assigned_by: string;
  admitted_at: string;
  discharged_at: string | null;
  status: 'active' | 'discharged';
  notes: string | null;
  // joined
  patient_name?: string | null;
  doctor_name?: string | null;
}

export interface RoomWithBeds extends ClinicRoom {
  beds: ClinicBed[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseRoomBedOptions {
  practiceId: string | null;
  role: 'admin' | 'doctor' | 'staff';
  doctorId?: string | null;
}

export function useRoomBed({ practiceId, role, doctorId }: UseRoomBedOptions) {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<RoomWithBeds[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!practiceId) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Rooms
      const { data: roomData, error: roomErr } = await (supabase as any)
        .from('clinic_rooms')
        .select('*')
        .eq('practice_id', practiceId)
        .order('floor', { ascending: true, nullsFirst: true })
        .order('room_number', { ascending: true });

      if (roomErr) throw roomErr;

      // 2. Beds
      const { data: bedData, error: bedErr } = await (supabase as any)
        .from('clinic_beds')
        .select('*')
        .eq('practice_id', practiceId)
        .order('bed_number', { ascending: true });

      if (bedErr) throw bedErr;

      // 3. Active assignments (hydrate patient/doctor names in follow-up queries — no PostgREST embed)
      const { data: assignData, error: assignErr } = await (supabase as any)
        .from('bed_assignments')
        .select('*')
        .eq('practice_id', practiceId)
        .eq('status', 'active');

      if (assignErr) throw assignErr;

      const patientIds = Array.from(
        new Set((assignData ?? []).map((a: any) => a.patient_id).filter(Boolean)),
      ) as string[];
      const doctorIds = Array.from(
        new Set((assignData ?? []).map((a: any) => a.doctor_id).filter(Boolean)),
      ) as string[];

      const [{ data: patientRows }, { data: doctorRows }] = await Promise.all([
        patientIds.length
          ? (supabase as any)
              .from('profiles')
              .select('id, full_name')
              .in('id', patientIds)
          : Promise.resolve({ data: [] as any[] }),
        doctorIds.length
          ? (supabase as any)
              .from('doctors')
              .select('id, profiles:user_id ( full_name )')
              .in('id', doctorIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const patientNameById = new Map<string, string>();
      (patientRows ?? []).forEach((p: any) => patientNameById.set(p.id, p.full_name));
      const doctorNameById = new Map<string, string>();
      (doctorRows ?? []).forEach((d: any) => doctorNameById.set(d.id, d.profiles?.full_name ?? ''));

      // Map assignments by bed_id
      const assignByBed = new Map<string, BedAssignment>();
      (assignData ?? []).forEach((a: any) => {
        assignByBed.set(a.bed_id, {
          ...a,
          patient_name: a.patient_id ? patientNameById.get(a.patient_id) ?? null : null,
          doctor_name: a.doctor_id ? doctorNameById.get(a.doctor_id) ?? null : null,
        });
      });


      // Combine
      const bedsByRoom = new Map<string, ClinicBed[]>();
      (bedData ?? []).forEach((b: any) => {
        const bed: ClinicBed = { ...b, current_assignment: assignByBed.get(b.id) ?? null };
        const arr = bedsByRoom.get(b.room_id) ?? [];
        arr.push(bed);
        bedsByRoom.set(b.room_id, arr);
      });

      // Hydrate primary doctor names for rooms
      const roomDoctorIds = Array.from(
        new Set((roomData ?? []).map((r: any) => r.primary_doctor_id).filter(Boolean)),
      ) as string[];
      const { data: roomDocRows } = roomDoctorIds.length
        ? await (supabase as any)
            .from('doctors')
            .select('id, profiles:user_id ( full_name )')
            .in('id', roomDoctorIds)
        : { data: [] as any[] };
      const roomDoctorNameById = new Map<string, string>();
      (roomDocRows ?? []).forEach((d: any) => roomDoctorNameById.set(d.id, d.profiles?.full_name ?? ''));

      const combined: RoomWithBeds[] = (roomData ?? []).map((r: any) => ({
        ...r,
        primary_doctor_name: r.primary_doctor_id ? roomDoctorNameById.get(r.primary_doctor_id) ?? null : null,
        beds: bedsByRoom.get(r.id) ?? [],
      }));

      setRooms(combined);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [practiceId]);

  // ── Real-time ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!practiceId) return;
    fetchData();

    channelRef.current = supabase
      .channel(`rooms-beds-${practiceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clinic_rooms', filter: `practice_id=eq.${practiceId}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clinic_beds',  filter: `practice_id=eq.${practiceId}` }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bed_assignments', filter: `practice_id=eq.${practiceId}` }, fetchData)
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [practiceId, fetchData]);

  // ── Room CRUD ───────────────────────────────────────────────────────────────
  const addRoom = useCallback(async (data: Omit<ClinicRoom, 'id' | 'created_at' | 'updated_at'>) => {
    if (!practiceId) return;
    const { error: e } = await (supabase as any).from('clinic_rooms').insert({ ...data, practice_id: practiceId });
    if (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); return; }
    toast({ title: 'Room added' });
  }, [practiceId, toast]);

  const updateRoom = useCallback(async (id: string, data: Partial<ClinicRoom>) => {
    const { error: e } = await (supabase as any).from('clinic_rooms').update(data).eq('id', id);
    if (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); return; }
    toast({ title: 'Room updated' });
  }, [toast]);

  const deleteRoom = useCallback(async (id: string) => {
    const { error: e } = await (supabase as any).from('clinic_rooms').delete().eq('id', id);
    if (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); return; }
    toast({ title: 'Room deleted' });
  }, [toast]);

  // ── Bed CRUD ────────────────────────────────────────────────────────────────
  const addBed = useCallback(async (data: Omit<ClinicBed, 'id' | 'created_at' | 'updated_at' | 'current_assignment'>) => {
    if (!practiceId) return;
    const { error: e } = await (supabase as any).from('clinic_beds').insert({ ...data, practice_id: practiceId });
    if (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); return; }
    toast({ title: 'Bed added' });
  }, [practiceId, toast]);

  const updateBed = useCallback(async (id: string, data: Partial<ClinicBed>) => {
    const { error: e } = await (supabase as any).from('clinic_beds').update(data).eq('id', id);
    if (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); return; }
  }, [toast]);

  const deleteBed = useCallback(async (id: string) => {
    const { error: e } = await (supabase as any).from('clinic_beds').delete().eq('id', id);
    if (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); return; }
    toast({ title: 'Bed removed' });
  }, [toast]);

  const updateBedStatus = useCallback(async (id: string, status: BedStatus) => {
    const { error: e } = await (supabase as any).from('clinic_beds').update({ status }).eq('id', id);
    if (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  }, [toast]);

  // ── Assignment ──────────────────────────────────────────────────────────────
  const assignBed = useCallback(async (params: {
    bed_id: string;
    patient_id?: string | null;
    doctor_id?: string | null;
    appointment_id?: string | null;
    assigned_by: string;
    notes?: string;
  }) => {
    if (!practiceId) return;
    const { error: e } = await (supabase as any).from('bed_assignments').insert({
      ...params,
      practice_id: practiceId,
      status: 'active',
    });
    if (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); return; }
    await updateBedStatus(params.bed_id, 'occupied');
    toast({ title: 'Patient assigned to bed' });
  }, [practiceId, updateBedStatus, toast]);

  const unassignBed = useCallback(async (assignmentId: string, bedId: string) => {
    const { error: e } = await (supabase as any)
      .from('bed_assignments')
      .update({ status: 'discharged', discharged_at: new Date().toISOString() })
      .eq('id', assignmentId);
    if (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); return; }
    await updateBedStatus(bedId, 'cleaning');
    toast({ title: 'Patient discharged. Bed set to cleaning.' });
  }, [updateBedStatus, toast]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = {
    totalRooms: rooms.length,
    totalBeds: rooms.reduce((s, r) => s + r.beds.length, 0),
    availableBeds: rooms.reduce((s, r) => s + r.beds.filter(b => b.status === 'available').length, 0),
    occupiedBeds: rooms.reduce((s, r) => s + r.beds.filter(b => b.status === 'occupied').length, 0),
    cleaningBeds: rooms.reduce((s, r) => s + r.beds.filter(b => b.status === 'cleaning').length, 0),
    maintenanceBeds: rooms.reduce((s, r) => s + r.beds.filter(b => b.status === 'maintenance').length, 0),
  };

  return {
    rooms,
    stats,
    loading,
    error,
    refresh: fetchData,
    addRoom,
    updateRoom,
    deleteRoom,
    addBed,
    updateBed,
    deleteBed,
    updateBedStatus,
    assignBed,
    unassignBed,
  };
}
