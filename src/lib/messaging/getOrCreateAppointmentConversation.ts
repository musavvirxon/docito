import { supabase } from '@/integrations/supabase/client';

/**
 * Find or create a conversation tied to a specific appointment.
 * Both the doctor and the patient (if registered) are added as participants.
 *
 * Returns the conversation id, or null if it cannot be resolved
 * (e.g. patient is a doctor_patients record with no auth user).
 */
export async function getOrCreateAppointmentConversation(params: {
  appointmentId: string;
  doctorUserId: string;
  patientUserId?: string | null;
  patientName?: string | null;
}): Promise<string | null> {
  const { appointmentId, doctorUserId, patientUserId, patientName } = params;

  // 1. Try to find an existing conversation bound to this appointment.
  const { data: existing, error: findErr } = await supabase
    .from('conversations')
    .select('id')
    .eq('context_type', 'appointment')
    .eq('context_id', appointmentId)
    .maybeSingle();

  if (findErr) {
    console.error('[chat] find conversation failed', findErr);
  }

  if (existing?.id) return existing.id as string;

  // Need both sides to start a thread.
  if (!patientUserId) {
    console.warn('[chat] cannot create conversation – patient has no user account');
    return null;
  }

  // 2. Create a new conversation.
  const { data: created, error: createErr } = await supabase
    .from('conversations')
    .insert({
      type: 'direct',
      name: patientName ? `Appointment with ${patientName}` : 'Appointment chat',
      created_by: doctorUserId,
      context_type: 'appointment',
      context_id: appointmentId,
    } as any)
    .select('id')
    .single();

  if (createErr || !created?.id) {
    console.error('[chat] create conversation failed', createErr);
    return null;
  }

  const conversationId = created.id as string;

  // 3. Add both participants.
  const { error: partErr } = await supabase
    .from('conversation_participants')
    .insert([
      { conversation_id: conversationId, user_id: doctorUserId, role: 'doctor' },
      { conversation_id: conversationId, user_id: patientUserId, role: 'patient' },
    ] as any);

  if (partErr) {
    console.error('[chat] add participants failed', partErr);
  }

  return conversationId;
}
