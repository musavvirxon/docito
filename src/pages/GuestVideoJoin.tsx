import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Video, UserPlus, LogIn, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { VideoRoom } from '@/components/video';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { VideoConsultation } from '@/hooks/useVideoConsultation';

interface ConsultationInfo {
  consultation_id: string;
  appointment_id: string | null;
  doctor_id: string;
  doctor_patient_id: string | null;
  scheduled_start: string;
  scheduled_end: string;
  doctor_name: string;
  patient_full_name: string;
  patient_phone: string | null;
  patient_email: string | null;
  already_claimed: boolean;
}

export default function GuestVideoJoin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [info, setInfo] = useState<ConsultationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [joining, setJoining] = useState(false);
  const [consultationRow, setConsultationRow] = useState<VideoConsultation | null>(null);
  const [joinAsGuest, setJoinAsGuest] = useState(false);
  const [guestName, setGuestName] = useState('');

  const fetchInfo = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_consultation_by_guest_token', { _token: token });
    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      setError('Invalid or expired invite link');
    } else {
      const row = Array.isArray(data) ? data[0] : data;
      setInfo(row as ConsultationInfo);
      setGuestName((row as ConsultationInfo).patient_full_name || '');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  const handleClaim = async () => {
    if (!token) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_doctor_patient', { _guest_token: token });
      if (error) throw error;
      toast.success('Your records have been linked to your account');
      setClaimed(true);
      // refresh info
      await fetchInfo();
      // fetch consultation row (now points to patient_id)
      const result: any = data;
      const consultId = result?.consultation_id;
      if (consultId) {
        const { data: vc } = await supabase
          .from('video_consultations').select('*').eq('id', consultId).maybeSingle();
        if (vc) setConsultationRow(vc as VideoConsultation);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to link your records');
    } finally {
      setClaiming(false);
    }
  };

  const handleStartGuestJoin = async () => {
    if (!info) return;
    setJoining(true);
    try {
      // We need a VideoConsultation-shaped object for the VideoRoom (room_id, etc.)
      // The RPC didn't return room_id; fetch via an edge call by passing guestToken only.
      // Simplest: read it from a public-safe column — but vc has RLS. Use the livekit-token
      // endpoint result is sufficient for connection; VideoRoom needs consultation.room_id
      // up front. Fetch room_id via a minimal RPC call: reuse the same token request.
      const resp = await supabase.functions.invoke('livekit-token', {
        body: { guestToken: token, displayName: guestName || 'Guest' },
      });
      if (resp.error || !resp.data?.roomId) {
        throw new Error(resp.error?.message || 'Failed to prepare video');
      }
      setConsultationRow({
        id: info.consultation_id,
        appointment_id: info.appointment_id,
        doctor_id: info.doctor_id,
        patient_id: null,
        doctor_patient_id: info.doctor_patient_id,
        guest_token: token || null,
        room_id: resp.data.roomId,
        room_url: '',
        status: 'in_progress',
        scheduled_start: info.scheduled_start,
        scheduled_end: info.scheduled_end,
        actual_start: null, actual_end: null,
        doctor_joined_at: null, patient_joined_at: null,
        duration_minutes: null, notes: null, recording_url: null,
        created_at: '', updated_at: '',
      });
      setJoinAsGuest(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-muted-foreground">{error || 'Invite not found'}</p>
            <Button onClick={() => navigate('/')}>Go home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active video room
  if (consultationRow && (joinAsGuest || claimed)) {
    return (
      <div className="min-h-screen bg-background">
        <VideoRoom
          consultation={consultationRow}
          userName={user ? (user.email || 'Patient') : (guestName || 'Guest')}
          userRole={user ? 'patient' : 'guest'}
          guestToken={joinAsGuest && !user ? (token || undefined) : undefined}
          onEnd={() => navigate('/')}
          onLeave={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Video appointment with {info.doctor_name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Patient on file: <span className="font-medium text-foreground">{info.patient_full_name}</span></p>
            <p>Scheduled: {new Date(info.scheduled_start).toLocaleString()}</p>
          </div>

          {info.already_claimed && !user && (
            <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
              This record has already been linked to an account. Sign in to access it.
            </div>
          )}

          {user ? (
            <div className="space-y-3">
              {info.already_claimed ? (
                <Button className="w-full gap-2" onClick={handleStartGuestJoin} disabled={joining}>
                  {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                  Join video call
                </Button>
              ) : (
                <>
                  <p className="text-sm">
                    Link this clinic record to your account. Your appointment history, prescriptions, and notes will appear in your patient profile.
                  </p>
                  <Button className="w-full gap-2" onClick={handleClaim} disabled={claiming}>
                    {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Link & continue
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                className="w-full gap-2"
                onClick={() => navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`)}
              >
                <LogIn className="h-4 w-4" /> Sign in to claim this record
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => navigate(`/auth?mode=signup&redirect=${encodeURIComponent(location.pathname)}`)}
              >
                <UserPlus className="h-4 w-4" /> Create an account
              </Button>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full gap-2"
                onClick={handleStartGuestJoin}
                disabled={joining}
              >
                {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                Join as guest (no account)
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Signing in keeps your medical history together in one profile.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
