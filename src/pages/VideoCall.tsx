import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { VideoRoom, VideoWaitingRoom } from '@/components/video';
import { useVideoConsultation, VideoConsultation } from '@/hooks/useVideoConsultation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';

const VideoCall: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { 
    getConsultationByRoom, 
    joinAsDoctor, 
    joinAsPatient, 
    endConsultation,
    currentConsultation,
    setCurrentConsultation,
  } = useVideoConsultation();
  
  const [consultation, setConsultation] = useState<VideoConsultation | null>(null);
  const [userRole, setUserRole] = useState<'doctor' | 'patient' | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [otherPartyName, setOtherPartyName] = useState<string>('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeCall = async () => {
      if (!roomId) {
        setError('Invalid room ID');
        setIsLoading(false);
        return;
      }

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login', { state: { from: `/video/${roomId}` } });
          return;
        }

        // Fetch consultation
        const consultationData = await getConsultationByRoom(roomId);
        if (!consultationData) {
          setError('Consultation not found or has expired');
          setIsLoading(false);
          return;
        }

        setConsultation(consultationData);
        setCurrentConsultation(consultationData);

        // Determine user role
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('id, user_id')
          .eq('id', consultationData.doctor_id)
          .single();

        const isDoctor = doctorData?.user_id === user.id;
        const isPatient = consultationData.patient_id === user.id;

        if (!isDoctor && !isPatient) {
          setError('You are not authorized to join this consultation');
          setIsLoading(false);
          return;
        }

        setUserRole(isDoctor ? 'doctor' : 'patient');

        // Get user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();

        setUserName(profileData?.full_name || 'Unknown User');

        // Get other party name
        if (isDoctor) {
          const { data: patientProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', consultationData.patient_id)
            .single();
          setOtherPartyName(patientProfile?.full_name || 'Patient');
        } else {
          const { data: doctorProfile } = await supabase
            .from('doctors')
            .select('user_id')
            .eq('id', consultationData.doctor_id)
            .single();
          
          if (doctorProfile?.user_id) {
            const { data: docNameData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', doctorProfile.user_id)
              .single();
            setOtherPartyName(docNameData?.full_name || 'Doctor');
          }
        }

        // Check if should auto-join
        if (searchParams.get('join') === 'true') {
          setIsInRoom(true);
        }

      } catch (err) {
        console.error('Error initializing video call:', err);
        setError('Failed to load consultation');
      } finally {
        setIsLoading(false);
      }
    };

    initializeCall();
  }, [roomId, navigate, searchParams, getConsultationByRoom, setCurrentConsultation]);

  // Real-time updates for consultation
  useEffect(() => {
    if (!consultation?.id) return;

    const channel = supabase
      .channel(`consultation-${consultation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_consultations',
          filter: `id=eq.${consultation.id}`,
        },
        (payload) => {
          setConsultation(payload.new as VideoConsultation);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [consultation?.id]);

  const handleJoin = async () => {
    if (!consultation || !userRole) return;

    if (userRole === 'doctor') {
      await joinAsDoctor(consultation.id);
    } else {
      await joinAsPatient(consultation.id);
    }
    setIsInRoom(true);
  };

  const handleEnd = async (notes?: string) => {
    if (!consultation) return;
    
    await endConsultation(consultation.id, notes);
    toast({
      title: 'Consultation ended',
      description: 'The video consultation has been completed.',
    });
    navigate(userRole === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard');
  };

  const handleLeave = () => {
    setIsInRoom(false);
    navigate(userRole === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard');
  };

  const handleCancel = () => {
    navigate(userRole === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading consultation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Join</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!consultation || !userRole) {
    return null;
  }

  if (isInRoom) {
    return (
      <div className="h-screen">
        <VideoRoom
          consultation={consultation}
          userName={userName}
          userRole={userRole}
          onEnd={handleEnd}
          onLeave={handleLeave}
        />
      </div>
    );
  }

  return (
    <VideoWaitingRoom
      consultation={consultation}
      userRole={userRole}
      otherPartyName={otherPartyName}
      onJoin={handleJoin}
      onCancel={handleCancel}
    />
  );
};

export default VideoCall;
