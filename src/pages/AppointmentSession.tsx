// Path: src/pages/AppointmentSession.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Video,
  Activity,
  User,
  Clock,
  Pill,
  FileText,
  Send,
  Stethoscope,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVideoConsultation, type VideoConsultation } from '@/hooks/useVideoConsultation';
import { EnhancedDentalChart } from '@/components/dental/EnhancedDentalChart';
import { PatientProfileView } from '@/components/appointments/PatientProfileView';
import { VideoRoom } from '@/components/video';

interface AppointmentSessionPageProps {
  appointmentId?: string;
}

interface SessionData {
  id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id?: string;
  doctor_patient_id?: string;
  session_type: string;
  session_status: string;
  started_at?: string;
  ended_at?: string;
  specialty_data?: any;
}

interface AppointmentData {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  appointment_type: string;
  patient_id?: string;
  doctor_patient_id?: string;
  doctor_id: string;
  patient_name?: string;
  patient_phone?: string;
  patient_email?: string;
  patient_avatar?: string;
}

type SessionTab = 'video' | 'session' | 'dental' | 'prescriptions' | 'notes';

const TAB_FALLBACK: SessionTab = 'session';

const AppointmentSessionPage = ({ appointmentId: propAppointmentId }: AppointmentSessionPageProps) => {
  const { appointmentId: paramAppointmentId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');

  const appointmentId = propAppointmentId || paramAppointmentId;

  const storageKey = useMemo(() => {
    if (!appointmentId) return null;
    return `appointment_session_state:${appointmentId}`;
  }, [appointmentId]);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [doctorSpecialty, setDoctorSpecialty] = useState<string>('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [activeTab, setActiveTab] = useState<SessionTab>(TAB_FALLBACK);
  const [isEnding, setIsEnding] = useState(false);

  // Video state
  const [videoConsultation, setVideoConsultation] = useState<VideoConsultation | null>(null);
  const [showVideoRoom, setShowVideoRoom] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);

  const { createConsultation, joinAsDoctor } = useVideoConsultation();

  const persistState = useCallback(
    (next: Partial<{ activeTab: SessionTab; showVideoRoom: boolean; videoEnded: boolean }>) => {
      if (!storageKey) return;
      try {
        const prevRaw = localStorage.getItem(storageKey);
        const prev = prevRaw ? (JSON.parse(prevRaw) as any) : {};
        const merged = { ...prev, ...next, updatedAt: Date.now() };
        localStorage.setItem(storageKey, JSON.stringify(merged));
      } catch {
        // ignore
      }
    },
    [storageKey],
  );

  const loadPersistedState = useCallback(() => {
    if (!storageKey) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as any;
    } catch {
      return null;
    }
  }, [storageKey]);

  const endVideoConsultation = useCallback(
    async (consultationId: string, notes?: string) => {
      // Mark video consultation completed (call ended), but DO NOT end the appointment session.
      // This supports the deferred end flow: video ends first, session ends when doctor clicks "End Session".
      const { data: latest, error: fetchErr } = await supabase
        .from('video_consultations')
        .select('id, status, actual_start, notes')
        .eq('id', consultationId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!latest) return null;

      if ((latest as any).status === 'completed' || (latest as any).status === 'cancelled') {
        return latest as any;
      }

      const start = (latest as any).actual_start ? new Date((latest as any).actual_start) : new Date();
      const end = new Date();
      const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

      const { data: updated, error: updErr } = await supabase
        .from('video_consultations')
        .update({
          status: 'completed',
          actual_end: end.toISOString(),
          duration_minutes: durationMinutes,
          notes: (notes ?? (latest as any).notes) || null,
        })
        .eq('id', consultationId)
        .select('*')
        .single();

      if (updErr) throw updErr;
      return updated as unknown as VideoConsultation;
    },
    [],
  );

  const fetchSessionData = useCallback(async () => {
    if (!appointmentId) return;

    setLoading(true);
    try {
      // Fetch appointment with patient info
      const { data: appt, error: apptError } = await supabase
        .from('appointments')
        .select(
          `
          *,
          profiles:patient_id(full_name, phone, email, avatar_url),
          doctor_patients:doctor_patient_id(full_name, phone, email, date_of_birth, created_at)
        `,
        )
        .eq('id', appointmentId)
        .single();

      if (apptError) throw apptError;

      const patientProfile = (appt as any).profiles as any;
      const doctorPatient = (appt as any).doctor_patients as any;

      const apptData: AppointmentData = {
        id: (appt as any).id,
        appointment_date: (appt as any).appointment_date,
        start_time: (appt as any).start_time,
        end_time: (appt as any).end_time,
        status: (appt as any).status,
        notes: (appt as any).notes,
        appointment_type: (appt as any).appointment_type || 'in_person',
        patient_id: (appt as any).patient_id,
        doctor_patient_id: (appt as any).doctor_patient_id,
        doctor_id: (appt as any).doctor_id,
        patient_name: patientProfile?.full_name || doctorPatient?.full_name || 'Patient',
        patient_phone: patientProfile?.phone || doctorPatient?.phone,
        patient_email: patientProfile?.email || doctorPatient?.email,
        patient_avatar: patientProfile?.avatar_url,
      };

      setAppointment(apptData);

      // Fetch or create session
      let { data: sessionData, error: sessionError } = await supabase
        .from('appointment_sessions')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single();

      if (sessionError && (sessionError as any).code === 'PGRST116') {
        const { data: newSession, error: createError } = await supabase
          .from('appointment_sessions')
          .insert({
            appointment_id: appointmentId,
            doctor_id: (appt as any).doctor_id,
            patient_id: (appt as any).patient_id,
            doctor_patient_id: (appt as any).doctor_patient_id,
            session_type: (appt as any).appointment_type || 'in_person',
            session_status: 'active',
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;
        sessionData = newSession;
      } else if (sessionError) {
        throw sessionError;
      }

      setSession(sessionData as SessionData);

      // Load notes
      const initialNotes = (sessionData as any)?.specialty_data?.notes || (appt as any).notes || '';
      setSessionNotes(initialNotes);

      // Fetch doctor specialty (doctors.user_id = appointments.doctor_id)
      const { data: doctor, error: docErr } = await supabase
        .from('doctors')
        .select('specialty')
        .eq('user_id', (appt as any).doctor_id)
        .maybeSingle();

      if (!docErr && doctor) {
        setDoctorSpecialty((doctor as any).specialty || '');
      }

      // Restore persisted UI state
      const persisted = loadPersistedState();
      const persistedTab = (persisted?.activeTab as SessionTab | undefined) || TAB_FALLBACK;

      // For video appointments, look for an existing consultation
      if ((appt as any).appointment_type === 'video') {
        const { data: existingConsultation, error: vcErr } = await supabase
          .from('video_consultations')
          .select('*')
          .eq('appointment_id', appointmentId)
          .maybeSingle();

        if (!vcErr && existingConsultation) {
          const vc = existingConsultation as unknown as VideoConsultation;
          setVideoConsultation(vc);

          const completed = vc.status === 'completed' || vc.status === 'cancelled' || vc.status === 'no_show';
          setVideoEnded(completed);

          // If persisted state says video was open AND consultation isn't completed, reopen video room
          const wantVideo = !!persisted?.showVideoRoom;
          const shouldShow = wantVideo && !completed;

          setShowVideoRoom(shouldShow);

          // Tab selection logic:
          // - If persisted tab is video but we can't show video, fallback to session
          // - If video is showing and no persisted tab, prefer video
          let nextTab: SessionTab = persistedTab;
          if (nextTab === 'video' && !shouldShow) nextTab = TAB_FALLBACK;
          if (!persisted?.activeTab && shouldShow) nextTab = 'video';

          setActiveTab(nextTab);
        } else {
          // No consultation yet
          setVideoConsultation(null);
          setVideoEnded(false);
          setShowVideoRoom(false);
          setActiveTab(persistedTab === 'video' ? TAB_FALLBACK : persistedTab);
        }
      } else {
        // Non-video appointment
        setVideoConsultation(null);
        setVideoEnded(false);
        setShowVideoRoom(false);
        setActiveTab(persistedTab === 'video' ? TAB_FALLBACK : persistedTab);
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
      toast.error('Failed to load appointment session');
    } finally {
      setLoading(false);
    }
  }, [appointmentId, loadPersistedState]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  // Real-time updates (session)
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointment_sessions', filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new as SessionData),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  // Persist tab changes
  useEffect(() => {
    persistState({ activeTab });
  }, [activeTab, persistState]);

  // Persist video UI state
  useEffect(() => {
    persistState({ showVideoRoom, videoEnded });
  }, [showVideoRoom, videoEnded, persistState]);

  const handleStartOrJoinVideo = useCallback(async () => {
    if (!appointment || !appointment.patient_id) {
      toast.error('Video calls require a registered patient');
      return;
    }

    try {
      // If we already have a consultation and it's not completed, just (re)join
      if (videoConsultation && videoConsultation.status !== 'completed' && videoConsultation.status !== 'cancelled') {
        const joined = await joinAsDoctor(videoConsultation.id);
        if (joined) setVideoConsultation(joined as VideoConsultation);

        setVideoEnded(false);
        setShowVideoRoom(true);
        setActiveTab('video');
        return;
      }

      // Otherwise, create a new consultation
      const scheduledEnd = new Date();
      scheduledEnd.setMinutes(scheduledEnd.getMinutes() + 30);

      const created = await createConsultation({
        appointment_id: appointment.id,
        doctor_id: appointment.doctor_id,
        patient_id: appointment.patient_id,
        scheduled_start: new Date().toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
      });

      if (!created) return;

      const joined = await joinAsDoctor(created.id);
      const finalConsultation = (joined || created) as VideoConsultation;

      setVideoConsultation(finalConsultation);
      setShowVideoRoom(true);
      setVideoEnded(false);
      setActiveTab('video');
    } catch (error) {
      console.error('Error starting/joining video:', error);
      toast.error('Failed to start video call');
    }
  }, [appointment, videoConsultation, createConsultation, joinAsDoctor]);

  const handleSaveNotes = useCallback(async () => {
    if (!session) return;

    try {
      await supabase
        .from('appointment_sessions')
        .update({
          specialty_data: {
            ...(session.specialty_data || {}),
            notes: sessionNotes,
          },
        })
        .eq('id', session.id);

      toast.success('Notes saved');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    }
  }, [session, sessionNotes]);

  const handleEndSession = useCallback(async () => {
    if (!session || !appointment) return;

    setIsEnding(true);
    try {
      // If video is still open and consultation not completed, end it now (safety)
      if (videoConsultation && showVideoRoom && !videoEnded) {
        try {
          const ended = await endVideoConsultation(videoConsultation.id, sessionNotes);
          if (ended) setVideoConsultation(ended);
          setVideoEnded(true);
          setShowVideoRoom(false);
        } catch (e) {
          // Don't block ending session, but warn
          console.error('Failed to end video consultation during session end:', e);
        }
      }

      // Update session status (completed)
      await supabase
        .from('appointment_sessions')
        .update({
          session_status: 'completed',
          ended_at: new Date().toISOString(),
          specialty_data: {
            ...(session.specialty_data || {}),
            notes: sessionNotes,
          },
        })
        .eq('id', session.id);

      // Update appointment status
      await supabase
        .from('appointments')
        .update({
          status: 'completed' as any,
          completed_at: new Date().toISOString(),
          notes: sessionNotes || appointment.notes,
        })
        .eq('id', appointment.id);

      toast.success('Appointment completed successfully');
      if (storageKey) {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
      }
      navigate('/doctor-dashboard');
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
    } finally {
      setIsEnding(false);
    }
  }, [
    session,
    appointment,
    navigate,
    videoConsultation,
    showVideoRoom,
    videoEnded,
    endVideoConsultation,
    sessionNotes,
    storageKey,
  ]);

  const handleLeaveVideo = useCallback(() => {
    // Menu persistence: do not dispose/hangup by unmounting.
    // Switching away from the video tab keeps the call alive due to TabsContent forceMount.
    setActiveTab('session');
    toast.info('Video call is still running. End the call when ready, then complete the session.');
  }, []);

  const handleVideoEnd = useCallback(
    async (notes?: string) => {
      const nextNotes = notes ?? sessionNotes;
      setSessionNotes(nextNotes);

      if (videoConsultation) {
        try {
          const ended = await endVideoConsultation(videoConsultation.id, nextNotes);
          if (ended) setVideoConsultation(ended);
        } catch (e: any) {
          console.error('Error ending video consultation:', e);
          toast.error(e?.message || 'Failed to end video consultation');
        }
      }

      setShowVideoRoom(false);
      setVideoEnded(true);
      setActiveTab('session');
      toast.info('Video call ended. Complete notes, then click "End Session" when ready.');
    },
    [videoConsultation, endVideoConsultation, sessionNotes],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading appointment session...</p>
        </div>
      </div>
    );
  }

  if (!appointment || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Session Not Found</h2>
            <p className="text-muted-foreground mb-4">This appointment session could not be loaded.</p>
            <Button onClick={() => navigate('/doctor-dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials =
    appointment.patient_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'P';

  const isDentist = doctorSpecialty.toLowerCase().includes('dent');
  const isVideoAppointment = appointment.appointment_type === 'video';

  const patientId = appointment.patient_id || appointment.doctor_patient_id || '';
  const patientType = appointment.patient_id ? 'registered' : 'direct';

  const videoTabEnabled = isVideoAppointment && !!videoConsultation && !videoEnded;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={appointment.patient_avatar} />
                <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold">{appointment.patient_name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(appointment.appointment_date), 'MMM d')} • {appointment.start_time}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isVideoAppointment && !videoEnded && (
              <>
                {!videoTabEnabled && (
                  <Button onClick={handleStartOrJoinVideo} className="gap-2">
                    <Video className="h-4 w-4" />
                    Start Video
                  </Button>
                )}
                {videoTabEnabled && showVideoRoom && (
                  <Button variant="outline" onClick={handleLeaveVideo} className="gap-2">
                    <XCircle className="h-4 w-4" />
                    Leave Video
                  </Button>
                )}
              </>
            )}

            {isVideoAppointment && videoEnded && (
              <Badge variant="secondary" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Video Completed
              </Badge>
            )}

            <Button variant="destructive" onClick={handleEndSession} disabled={isEnding} className="gap-2">
              {isEnding ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              End Session
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <ResizablePanelGroup orientation="horizontal" className="min-h-[calc(100vh-8rem)]">
          {/* Left Panel - Session Tools */}
          <ResizablePanel defaultSize={65} minSize={40}>
            <div className="pr-4 h-full">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SessionTab)} className="h-full flex flex-col">
                <TabsList className="w-full justify-start">
                  {videoTabEnabled && (
                    <TabsTrigger value="video" className="gap-2">
                      <Video className="h-4 w-4" />
                      Video Call
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="session" className="gap-2">
                    <Activity className="h-4 w-4" />
                    Session
                  </TabsTrigger>
                  {isDentist && (
                    <TabsTrigger value="dental" className="gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Dental Chart
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="prescriptions" className="gap-2">
                    <Pill className="h-4 w-4" />
                    Prescriptions
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 mt-4">
                  {/* Video Tab Content (force-mounted to keep call alive across tabs) */}
                  {videoTabEnabled && videoConsultation && (
                    <TabsContent value="video" forceMount className="mt-0 h-[calc(100vh-16rem)]">
                      <Card className="h-full">
                        <CardContent className="p-0 h-full">
                          {showVideoRoom ? (
                            <VideoRoom
                              consultation={videoConsultation}
                              userName="Doctor"
                              userRole="doctor"
                              onEnd={handleVideoEnd}
                              onLeave={handleVideoEnd}
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center p-6">
                              <div className="text-center text-muted-foreground">
                                <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="mb-4">Video call is available.</p>
                                <Button onClick={handleStartOrJoinVideo} className="gap-2">
                                  <Video className="h-4 w-4" />
                                  Join Video
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )}

                  <TabsContent value="session" className="mt-0 space-y-4">
                    {/* Quick Actions */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {isVideoAppointment && !videoEnded && (
                            <Button variant="outline" onClick={handleStartOrJoinVideo} className="gap-2">
                              <Video className="h-4 w-4" />
                              Start Video
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => {
                              const encodedPatient =
                                patientType === 'registered' ? `reg:${patientId}` : `dp:${patientId}`;
                              navigate(
                                `/doctor-dashboard?section=calendar&followupOf=${encodeURIComponent(
                                  appointment.id,
                                )}&patient=${encodeURIComponent(encodedPatient)}`,
                              );
                            }}
                          >
                            <Calendar className="h-4 w-4" />
                            Book Follow-up
                          </Button>

                          <Button variant="outline" className="gap-2">
                            <Pill className="h-4 w-4" />
                            Prescription
                          </Button>
                          <Button variant="outline" className="gap-2">
                            <FileText className="h-4 w-4" />
                            Referral
                          </Button>
                          <Button variant="outline" className="gap-2">
                            <Send className="h-4 w-4" />
                            Lab Order
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Session Notes */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>Session Notes</span>
                          <Button variant="ghost" size="sm" onClick={handleSaveNotes}>
                            Save
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={sessionNotes}
                          onChange={(e) => setSessionNotes(e.target.value)}
                          placeholder="Add notes for this appointment..."
                          className="min-h-[200px]"
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {isDentist && (
                    <TabsContent value="dental" className="mt-0">
                      <EnhancedDentalChart patientId={patientId} appointmentId={appointment.id} isEditable={true} />
                    </TabsContent>
                  )}

                  <TabsContent value="prescriptions" className="mt-0">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-8 text-muted-foreground">
                          <Pill className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>Prescription management coming soon</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="notes" className="mt-0">
                    <Card>
                      <CardContent className="pt-6">
                        <Textarea
                          value={sessionNotes}
                          onChange={(e) => setSessionNotes(e.target.value)}
                          placeholder="Add notes for this appointment..."
                          className="min-h-[400px]"
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Patient Info */}
          <ResizablePanel defaultSize={35} minSize={25}>
            <div className="pl-4 h-full">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Patient Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PatientProfileView patientId={patientId} patientType={patientType as 'registered' | 'direct'} />
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
};

export default AppointmentSessionPage;
