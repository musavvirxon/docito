import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TimeSlot {
  start_at: string;
  end_at: string;
  available: boolean;
  reason?: string;
}

interface UseAvailabilityOptions {
  entityId?: string;
  providerId?: string;
  appointmentType?: string;
}

export function useAvailability(options: UseAvailabilityOptions = {}) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAvailability = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-availability', {
        body: {
          entity_id: options.entityId,
          provider_id: options.providerId,
          from,
          to,
          appointment_type: options.appointmentType,
        },
      });

      if (fnError) throw fnError;

      setSlots(data?.slots || []);
      return data?.slots || [];
    } catch (err: any) {
      const message = err.message || 'Failed to fetch availability';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [options.entityId, options.providerId, options.appointmentType, toast]);

  const getAvailableSlotsForDate = useCallback((date: string) => {
    return slots.filter(slot => 
      slot.start_at.startsWith(date) && slot.available
    );
  }, [slots]);

  return {
    slots,
    loading,
    error,
    fetchAvailability,
    getAvailableSlotsForDate,
    availableSlots: slots.filter(s => s.available),
  };
}
