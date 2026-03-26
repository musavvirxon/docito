import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VideoConsultation {
  id: string;
  appointment_id: string | null;
  doctor_id: string;
  patient_id: string;
  room_id: string;
  room_url: string;
  status: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  doctor_joined_at: string | null;
  patient_joined_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateConsultationParams {
  appointment_id?: string;
  doctor_id: string;
  patient_id: string;
  scheduled_start: string;
  scheduled_end: string;
  notes?: string;
}

const generateRoomId = () => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `docito-${hex}`;
};

export const useVideoConsultation = () => {
  const [consultations, setConsultations] = useState<VideoConsultation[]>([]);
  const [currentConsultation, setCurrentConsultation] = useState<VideoConsultation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchConsultations = useCallback(async (filters?: { 
    doctor_id?: string; 
    patient_id?: string;
    status?: string;
  }) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('video_consultations')
        .select('*')
        .order('scheduled_start', { ascending: true });

      if (filters?.doctor_id) {
        query = query.eq('doctor_id', filters.doctor_id);
      }
      if (filters?.patient_id) {
        query = query.eq('patient_id', filters.patient_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setConsultations(data as VideoConsultation[]);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch video consultations',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createConsultation = async (params: CreateConsultationParams): Promise<VideoConsultation | null> => {
    try {
      const roomId = generateRoomId();
      const roomUrl = `${window.location.origin}/video/${roomId}`;

      const { data, error } = await supabase
        .from('video_consultations')
        .insert({
          ...params,
          room_id: roomId,
          room_url: roomUrl,
          status: 'scheduled',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Video consultation scheduled successfully',
      });

      return data as VideoConsultation;
    } catch (error) {
      console.error('Error creating consultation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create video consultation',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateConsultationStatus = async (
    id: string, 
    status: VideoConsultation['status'],
    additionalData?: Partial<VideoConsultation>
  ) => {
    try {
      const { data, error } = await supabase
        .from('video_consultations')
        .update({ status, ...additionalData })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setConsultations(prev => 
        prev.map(c => c.id === id ? data as VideoConsultation : c)
      );

      if (currentConsultation?.id === id) {
        setCurrentConsultation(data as VideoConsultation);
      }

      return data as VideoConsultation;
    } catch (error) {
      console.error('Error updating consultation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update consultation status',
        variant: 'destructive',
      });
      return null;
    }
  };

  const joinAsDoctor = async (id: string) => {
    return updateConsultationStatus(id, 'in_progress', {
      doctor_joined_at: new Date().toISOString(),
      actual_start: new Date().toISOString(),
    });
  };

  const joinAsPatient = async (id: string) => {
    const consultation = consultations.find(c => c.id === id);
    const newStatus = consultation?.doctor_joined_at ? 'in_progress' : 'waiting';
    
    return updateConsultationStatus(id, newStatus, {
      patient_joined_at: new Date().toISOString(),
    });
  };

  const endConsultation = async (id: string, notes?: string) => {
    const consultation = consultations.find(c => c.id === id);
    const startTime = consultation?.actual_start ? new Date(consultation.actual_start) : new Date();
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    return updateConsultationStatus(id, 'completed', {
      actual_end: endTime.toISOString(),
      duration_minutes: durationMinutes,
      notes: notes || consultation?.notes,
    });
  };

  const getConsultationById = async (id: string): Promise<VideoConsultation | null> => {
    try {
      const { data, error } = await supabase
        .from('video_consultations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as VideoConsultation;
    } catch (error) {
      console.error('Error fetching consultation:', error);
      return null;
    }
  };

  const getConsultationByRoom = async (roomId: string): Promise<VideoConsultation | null> => {
    try {
      const { data, error } = await supabase
        .from('video_consultations')
        .select('*')
        .eq('room_id', roomId)
        .single();

      if (error) throw error;
      return data as VideoConsultation;
    } catch (error) {
      console.error('Error fetching consultation by room:', error);
      return null;
    }
  };

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('video-consultations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_consultations',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setConsultations(prev => [...prev, payload.new as VideoConsultation]);
          } else if (payload.eventType === 'UPDATE') {
            setConsultations(prev =>
              prev.map(c => c.id === payload.new.id ? payload.new as VideoConsultation : c)
            );
            if (currentConsultation?.id === payload.new.id) {
              setCurrentConsultation(payload.new as VideoConsultation);
            }
          } else if (payload.eventType === 'DELETE') {
            setConsultations(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentConsultation?.id]);

  return {
    consultations,
    currentConsultation,
    setCurrentConsultation,
    isLoading,
    fetchConsultations,
    createConsultation,
    updateConsultationStatus,
    joinAsDoctor,
    joinAsPatient,
    endConsultation,
    getConsultationById,
    getConsultationByRoom,
  };
};
