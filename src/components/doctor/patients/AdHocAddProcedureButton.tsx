import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Stethoscope, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AddProcedureModal } from '@/components/appointments/AddProcedureModal';
import { useAppointmentProcedures, type AddProcedureInput } from '@/hooks/useAppointmentProcedures';
import { isDentalSpecialty } from '@/lib/clinicalSpecialties';

interface Props {
  doctorId: string;
  doctorPatientId?: string | null;
  patientUserId?: string | null;
  doctorSpecialty?: string | null;
  label?: string;
}

/**
 * Creates an ad-hoc "walk-in" appointment for today and immediately opens the
 * Add Procedure modal so a doctor can record procedures outside a scheduled session.
 */
export function AdHocAddProcedureButton({
  doctorId,
  doctorPatientId,
  patientUserId,
  doctorSpecialty,
  label = 'Add Procedure',
}: Props) {
  const [creating, setCreating] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const procedures = useAppointmentProcedures({
    appointmentId: appointmentId || undefined,
    doctorId,
    patientId: patientUserId || null,
    doctorPatientId: doctorPatientId || null,
  });

  const handleClick = useCallback(async () => {
    if (!doctorId || (!doctorPatientId && !patientUserId)) {
      toast.error('Patient information missing');
      return;
    }
    setCreating(true);
    try {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const start = `${hh}:${mm}:00`;
      const endDate = new Date(now.getTime() + 30 * 60 * 1000);
      const end = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:00`;
      const today = now.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          doctor_id: doctorId,
          patient_id: patientUserId || null,
          doctor_patient_id: doctorPatientId || null,
          appointment_date: today,
          start_time: start,
          end_time: end,
          appointment_type: 'in_person',
          status: 'completed',
          started_at: now.toISOString(),
          completed_at: now.toISOString(),
          notes: 'Ad-hoc procedure entry',
        } as any)
        .select('id')
        .single();
      if (error) throw error;
      setAppointmentId((data as any).id);
      setOpen(true);
    } catch (err: any) {
      console.error('Failed to create ad-hoc appointment', err);
      toast.error(err?.message || 'Failed to start procedure entry');
    } finally {
      setCreating(false);
    }
  }, [doctorId, doctorPatientId, patientUserId]);

  const handleSubmit = useCallback(
    async (input: AddProcedureInput) => {
      await procedures.addProcedure(input);
      setOpen(false);
    },
    [procedures],
  );

  const isDentist = isDentalSpecialty(doctorSpecialty || '');

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleClick} disabled={creating}>
        {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Stethoscope className="w-4 h-4 mr-2" />}
        {label}
      </Button>
      {appointmentId && (
        <AddProcedureModal
          open={open}
          onOpenChange={setOpen}
          isDentist={isDentist}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}

export default AdHocAddProcedureButton;
