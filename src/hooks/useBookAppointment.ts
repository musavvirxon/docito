// File: src/hooks/useBookAppointment.ts
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface BookingData {
  entityId?: string | null;
  providerId: string;
  slotStart: string;
  durationMinutes?: number;
  appointmentType?: string;
  notes?: string;
}

export interface BookingHoldResult {
  hold_id: string;
  expires_at: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: string;
  provider_id: string;
  entity_id: string | null;
}

type BookAppointmentFnResponse =
  | { ok: true; hold_id: string; expires_at: string; appointment_date: string; start_time: string; end_time: string; appointment_type: string; provider_id: string; entity_id: string | null }
  | { ok: false; error: string; code?: string };

export function useBookAppointment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingHoldResult | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const bookAppointment = useCallback(
    async (data: BookingData): Promise<BookingHoldResult | null> => {
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Authentication Required',
          description: 'Please sign in to book an appointment',
        });
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: session } = await supabase.auth.getSession();
        const accessToken = session.session?.access_token;

        if (!accessToken) {
          toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'Your session has expired. Please sign in again.',
          });
          return null;
        }

        const { data: fnData, error: fnError } = await supabase.functions.invoke<BookAppointmentFnResponse>(
          'book-appointment',
          {
            body: {
              patient_id: user.id,
              entity_id: data.entityId ?? null,
              provider_id: data.providerId,
              slot_start: data.slotStart,
              duration_minutes: data.durationMinutes ?? 30,
              appointment_type: data.appointmentType,
              notes: data.notes,
            },
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (fnError) throw fnError;

        if (!fnData) {
          throw new Error('No response from booking service');
        }

        if (!fnData.ok) {
          const errorData = fnData as { ok: false; error: string; code?: string };
          const msg = errorData.error || 'Failed to create booking hold';
          setError(msg);
          toast({
            variant: 'destructive',
            title: 'Booking failed',
            description: msg,
          });
          return null;
        }

        const hold: BookingHoldResult = {
          hold_id: fnData.hold_id,
          expires_at: fnData.expires_at,
          appointment_date: fnData.appointment_date,
          start_time: fnData.start_time,
          end_time: fnData.end_time,
          appointment_type: fnData.appointment_type,
          provider_id: fnData.provider_id,
          entity_id: fnData.entity_id,
        };

        setResult(hold);

        toast({
          title: 'Almost there!',
          description: 'Please confirm your appointment to finalize booking.',
        });

        return hold;
      } catch (err: any) {
        console.error('Booking error:', err);
        const msg = err?.message || 'Failed to create booking hold';
        setError(msg);
        toast({
          variant: 'destructive',
          title: 'Booking failed',
          description: msg,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast, user]
  );

  return { bookAppointment, loading, error, result };
}
