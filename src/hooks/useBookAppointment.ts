import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface BookingData {
  entityId: string;
  providerId?: string;
  slotStart: string;
  appointmentType?: string;
  notes?: string;
}

interface BookingResult {
  appointment_id: string;
  status: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
}

export function useBookAppointment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const bookAppointment = useCallback(async (data: BookingData): Promise<BookingResult | null> => {
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
      
      const response = await supabase.functions.invoke('book-appointment', {
        body: {
          patient_id: user.id,
          entity_id: data.entityId,
          provider_id: data.providerId,
          slot_start: data.slotStart,
          appointment_type: data.appointmentType,
          notes: data.notes,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      setResult(response.data);
      toast({
        title: 'Appointment Booked!',
        description: `Your appointment is scheduled for ${response.data.appointment_date} at ${response.data.start_time}`,
      });
      
      return response.data;
    } catch (err: any) {
      const message = err.message || 'Failed to book appointment';
      setError(message);
      
      if (message.includes('SLOT_TAKEN')) {
        toast({
          variant: 'destructive',
          title: 'Slot Unavailable',
          description: 'This time slot is no longer available. Please select another.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Booking Failed',
          description: message,
        });
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return {
    bookAppointment,
    loading,
    error,
    result,
    reset,
  };
}
