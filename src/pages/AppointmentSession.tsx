import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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

type SessionTab = 'session' | 'video' | 'dental' | 'prescriptions' | 'notes';

const VALID_TABS: SessionTab[] = ['session', 'video', 'dental', 'prescriptions', 'notes'];

const AppointmentSessionPage = ({ appointmentId: propAppointmentId }: AppointmentSessionPageProps) => {
  const { appointmentId: paramAppointmentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');

  const appointmentId = propAppointmentId || paramAppointmentId;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [doctorSpecialty, setDoctorSpecialty] = useState<string>('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [activeTab, setActiveTab] = useState<SessionTab>('session');
  const [isEnding, setIsEnding] = useState(false);
  const [showVideoRoom, setShowVideoRoom] = useState(false);
  const [videoConsultation, setVideoConsultation] = useState<VideoConsultation | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);

  const { createConsultation, joinAsDoctor, endConsultation } = useVideoConsultation();

  const uiPersistKey = useMemo(() => {
    if (!appointmentId) return null;
    return `appt-session-ui:${appointmentId}`;
  }, [appointmentId]);

  const videoEndOnceRef = useRef(false);

  const persistTab = useCallback(
    (tab: SessionTab) => {
      if (!uiPersistKey) return;
      try {
        localStorage.setItem(uiPersistKey, JSON.stringify({ tab }));
      } catch {
        // ignore
      }
    },
    [uiPersistKey]
  );

  const applyTabToUrl = useCallback(
    (tab: SessionTab) => {
      const next = new URLSearchParams(searchParams);
      next.set('tab', tab);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      const nextTab = (VALID_TABS.includes(tab as SessionTab) ? (tab as SessionTab) : 'session') as SessionTab;
      setActiveTab(nextTab);
      persistTab(nextTab);
      applyTabToUrl(nextTab);
    },
    [applyTabToUrl, persistTab]
  );

  // Initialize tab from URL/localStorage
  useEffect(() => {
    if (!appointmentId) return;

    const urlTab = searchParams.get('tab');
    if (urlTab && VALID_TABS.includes(urlTab as SessionTab)) {
      setActiveTab(urlTab as SessionTab);
      return;
    }

    if (!uiPersistKey) return;
    try {
      const raw = localStorage.getItem(uiPersistKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const storedTab = parsed?.tab;
      if (storedTab && VALID_TABS.includes(storedTab as SessionTab)) {
        setActiveTab(storedTab as SessionTab);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

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
          doctor_patients:doctor_patient_id(full_name, phone, email)
        `
        )
        .eq('id', appointmentId)
        .single();

      if (apptError) throw apptError;

      const patientProfile = (appt as any).profiles as any;
      const doctorPatient = (appt as any).doctor_patients as any;

      const apptType = ((appt as any).appointment_type || 'in_person') as string;

      setAppointment({
        id: appt.id,
        appointment_date: appt.appointment_date,
        start_time: appt.start_time,
        end_time: appt.end_time,
        status: appt.status,
        notes: appt.notes,
        appointment_type: apptType,
        patient_id: appt.patient_id,
        doctor_patient_id: appt.doctor_patient_id,
        doctor_id: appt.doctor_id,
        patient_name: patientProfile?.full_name || doctorPatient?.full_name || 'Patient',
        patient_phone: patientProfile?.phone || doctorPatient?.phone,
        patient_email: patientProfile?.email || doctorPatient?.email,
        patient_avatar: patientProfile?.avatar_url,
      });

      // Fetch or create session
      let { data: sessionData, error: sessionError } = await supabase
        .from('appointment_sessions')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single();

      if (sessionError && (sessionError as any).code === 'PGRST116') {
        // Session doesn't exist, create one
        const { data: newSession, error: createError } = await supabase
          .from('appointment_sessions')
          .insert({
            appointment_id: appointmentId,
            doctor_id: appt.doctor_id,
            patient_id: appt.patient_id,
            doctor_patient_id: appt.doctor_patient_id,
            session_type: apptType,
            session_status: 'active',
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;
        sessionData = newSession as any;
      } else if (sessionError) {
        throw sessionError;
      }

      setSession(sessionData as any);
      setSessionNotes((sessionData as any)?.specialty_data?.notes || appt.notes || '');

      // Fetch doctor specialty
      const { data: doctor } = await supabase
        .from('doctors')
        .select('specialty')
        .eq('id', appt.doctor_id)
        .single();

      if (doctor) {
        setDoctorSpecialty((doctor as any).specialty || '');
      }

      // For video appointments, fetch existing consultation (if any)
      if (apptType === 'video') {
        const { data: existingConsultation } = await supabase
          .from('video_consultations')
          .select('*')
          .eq('appointment_id', appointmentId)
          .order('created_at', { ascending: false })
          .maybeSingle();

        if (existingConsultation) {
          const consult = existingConsultation as VideoConsultation;
          setVideoConsultation(consult);
          if (consult.status === 'completed' || consult.status === 'cancelled' || consult.status === 'no_show') {
            setVideoEnded(true);
            setShowVideoRoom(false);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
      toast.error(t('doctor.session.loadError', 'Failed to load appointment session'));
    } finally {
      setLoading(false);
    }
  }, [appointmentId, t]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  // Real-time updates for session
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointment_sessions', filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new as SessionData)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  // Keep local ended flag in sync with consultation status
  useEffect(() => {
    if (!videoConsultation) return;
    if (
      videoConsultation.status === 'completed' ||
      videoConsultation.status === 'cancelled' ||
      videoConsultation.status === 'no_show'
    ) {
      setVideoEnded(true);
      setShowVideoRoom(false);
    }
  }, [videoConsultation]);

  const isVideoAppointment = appointment?.appointment_type === 'video';
  const isDentist = (doctorSpecialty || '').toLowerCase().includes('dent');

  // Ensure active tab remains valid when the appointment type changes
  useEffect(() => {
    if (!appointment) return;
    if (!isVideoAppointment && activeTab === 'video') {
      handleTabChange('session');
    }
    if (!isDentist && activeTab === 'dental') {
      handleTabChange('session');
    }
  }, [appointment, isVideoAppointment, isDentist, activeTab, handleTabChange]);

  const canJoinExistingVideo = useMemo(() => {
    if (!videoConsultation) return false;
    return ['scheduled', 'waiting', 'in_progress'].includes(videoConsultation.status);
  }, [videoConsultation]);

  const startOrJoinVideo = useCallback(async () => {
    if (!appointment || !appointment.patient_id) {
      toast.error(t('doctor.session.videoRequiresRegistered', 'Video calls require a registered patient'));
      return;
    }

    try {
      // Prefer re-joining an existing consultation
      if (videoConsultation && canJoinExistingVideo) {
        const updated = await joinAsDoctor(videoConsultation.id);
        const next = (updated || videoConsultation) as VideoConsultation;
        setVideoConsultation(next);
        setShowVideoRoom(true);
        setVideoEnded(false);
        videoEndOnceRef.current = false;
        handleTabChange('video');
        return;
      }

      // Otherwise create a new consultation
      const scheduledEnd = new Date();
      scheduledEnd.setMinutes(scheduledEnd.getMinutes() + 30);

      const consultation = await createConsultation({
        appointment_id: appointment.id,
        doctor_id: appointment.doctor_id,
        patient_id: appointment.patient_id,
        scheduled_start: new Date().toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
      });

      if (consultation) {
        const joined = await joinAsDoctor(consultation.id);
        setVideoConsultation((joined || consultation) as VideoConsultation);
        setShowVideoRoom(true);
        setVideoEnded(false);
        videoEndOnceRef.current = false;
        handleTabChange('video');
      }
    } catch (error) {
      console.error('Error starting/joining video:', error);
      toast.error(t('doctor.session.videoStartError', 'Failed to start video call'));
    }
  }, [appointment, videoConsultation, canJoinExistingVideo, createConsultation, joinAsDoctor, handleTabChange, t]);

  const handleSaveNotes = useCallback(async () => {
    if (!session) return;

    try {
      await supabase
        .from('appointment_sessions')
        .update({
          specialty_data: {
            ...session.specialty_data,
            notes: sessionNotes,
          },
        })
        .eq('id', session.id);

      toast.success(t('doctor.session.notesSaved', 'Notes saved'));
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error(t('doctor.session.notesSaveError', 'Failed to save notes'));
    }
  }, [session, sessionNotes, t]);

  const finalizeVideoIfNeeded = useCallback(
    async (notes?: string) => {
      if (!videoConsultation) return;
      if (
        videoConsultation.status === 'completed' ||
        videoConsultation.status === 'cancelled' ||
        videoConsultation.status === 'no_show'
      ) {
        setVideoEnded(true);
        return;
      }

      if (videoEndOnceRef.current) return;
      videoEndOnceRef.current = true;

      try {
        const ended = await endConsultation(videoConsultation.id, notes || sessionNotes);
        if (ended) setVideoConsultation(ended as VideoConsultation);
        setVideoEnded(true);
      } catch (e) {
        console.error('Error ending video consultation:', e);
        setVideoEnded(true);
      }
    },
    [videoConsultation, endConsultation, sessionNotes]
  );

  const handleEndSession = useCallback(async () => {
    if (!session || !appointment) return;

    setIsEnding(true);
    try {
      // If video was used, end the consultation first, but do NOT auto-complete session until user clicks End Session (this action)
      if (videoConsultation && !videoEnded) {
        await finalizeVideoIfNeeded(sessionNotes);
      }

      // Update session status
      await supabase
        .from('appointment_sessions')
        .update({
          session_status: 'completed',
          ended_at: new Date().toISOString(),
          specialty_data: {
            ...session.specialty_data,
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

      toast.success(t('doctor.session.completed', 'Appointment completed successfully'));
      navigate('/doctor-dashboard');
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error(t('doctor.session.endError', 'Failed to end session'));
    } finally {
      setIsEnding(false);
    }
  }, [session, appointment, sessionNotes, navigate, videoConsultation, videoEnded, finalizeVideoIfNeeded, t]);

  const handleLeaveVideo = useCallback(async () => {
    // Leave video UI and finalize consultation, but do NOT end the appointment session.
    setShowVideoRoom(false);
    setActiveTab('session');
    persistTab('session');
    applyTabToUrl('session');

    if (!videoConsultation) return;
    await finalizeVideoIfNeeded(sessionNotes);
    toast.info(t('doctor.session.videoEndedDeferred', 'Video call ended. You can end the session when ready.'));
  }, [applyTabToUrl, finalizeVideoIfNeeded, persistTab, sessionNotes, videoConsultation, t]);

  const handleVideoEnd = useCallback(
    async (notes?: string) => {
      if (notes) setSessionNotes(notes);
      setShowVideoRoom(false);
      setActiveTab('session');
      persistTab('session');
      applyTabToUrl('session');

      await finalizeVideoIfNeeded(notes || sessionNotes);
    },
    [applyTabToUrl, finalizeVideoIfNeeded, persistTab, sessionNotes]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">{t('doctor.session.loading', 'Loading appointment session...')}</p>
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
            <h2 className="text-xl font-semibold mb-2">{t('doctor.session.notFoundTitle', 'Session Not Found')}</h2>
            <p className="text-muted-foreground mb-4">{t('doctor.session.notFoundBody', 'This appointment session could not be loaded.')}</p>
            <Button onClick={() => navigate('/doctor-dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('doctor.session.backToDashboard', 'Back to Dashboard')}
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

  const patientId = appointment.patient_id || appointment.doctor_patient_id || '';
  const patientType = appointment.patient_id ? 'registered' : 'direct';
  const patientParam = `${patientType === 'registered' ? 'reg' : 'dp'}:${patientId}`;

  const showVideoStartButton =
    isVideoAppointment && !showVideoRoom && !videoEnded && (!videoConsultation || canJoinExistingVideo);

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
            {showVideoStartButton && (
              <Button onClick={startOrJoinVideo} className="gap-2">
                <Video className="h-4 w-4" />
                {videoConsultation && canJoinExistingVideo ? 'Join Video' : 'Start Video'}
              </Button>
            )}

            {isVideoAppointment && showVideoRoom && (
              <Button variant="outline" onClick={handleLeaveVideo} className="gap-2">
                <XCircle className="h-4 w-4" />
                Leave Video
              </Button>
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
        <ResizablePanelGroup
          orientation="horizontal"
          className="min-h-[calc(100vh-8rem)]"
          autoSaveId={appointmentId ? `appointment-session:${appointmentId}:layout` : 'appointment-session:layout'}
        >
          {/* Left Panel - Session Tools */}
          <ResizablePanel defaultSize={65} minSize={40}>
            <div className="pr-4 h-full">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
                <TabsList className="w-full justify-start">
                  {isVideoAppointment && (
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
                  {/* Video Tab Content */}
                  {isVideoAppointment && (
                    <TabsContent value="video" className="mt-0 h-[calc(100vh-16rem)]">
                      {showVideoRoom && videoConsultation ? (
                        <Card className="h-full">
                          <CardContent className="p-0 h-full">
                            <VideoRoom
                              consultation={videoConsultation}
                              userName="Doctor"
                              userRole="doctor"
                              onEnd={handleVideoEnd}
                              onLeave={handleLeaveVideo}
                            />
                          </CardContent>
                        </Card>
                      ) : (
                        <Card className="h-full">
                          <CardContent className="h-full flex flex-col items-center justify-center text-center p-6">
                            <Video className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Video Call</h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                              {videoEnded
                                ? 'The video call has been completed. You can continue documentation and end the session when ready.'
                                : videoConsultation && canJoinExistingVideo
                                ? 'A video consultation already exists for this appointment. Join when you are ready.'
                                : 'Start the video call when you are ready.'}
                            </p>

                            {!videoEnded && (
                              <Button onClick={startOrJoinVideo} className="gap-2 mt-4">
                                <Video className="h-4 w-4" />
                                {videoConsultation && canJoinExistingVideo ? 'Join Video' : 'Start Video'}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      )}
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
                          {isVideoAppointment && !videoEnded && !showVideoRoom && (
                            <Button variant="outline" onClick={startOrJoinVideo} className="gap-2">
                              <Video className="h-4 w-4" />
                              {videoConsultation && canJoinExistingVideo ? 'Join Video' : 'Start Video'}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() =>
                              navigate(`/doctor-dashboard?section=calendar&followupOf=${appointment.id}&patient=${patientParam}`)
                            }
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
