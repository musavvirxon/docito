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
  RefreshCw,
  CircleDot,
  DollarSign,
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
import { DiagnosisTab } from '@/components/visit/tabs/DiagnosisTab';
import PrescriptionCreator from '@/components/prescriptions/PrescriptionCreator';
import type { Diagnosis } from '@/components/visit/types';

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

interface AppointmentDentalProcedureRow {
  id: string;
  procedure_name: string;
  tooth_numbers: number[];
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  cost: number | null;
  notes: string | null;
  performed_at: string | null;
  created_at: string;
  doctor?: { full_name: string | null } | null;
}

type SessionTab = 'session' | 'video' | 'diagnoses' | 'dental' | 'prescriptions' | 'notes';

const VALID_TABS: SessionTab[] = ['session', 'video', 'diagnoses', 'dental', 'prescriptions', 'notes'];

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

  const [appointmentDentalProcedures, setAppointmentDentalProcedures] = useState<AppointmentDentalProcedureRow[]>([]);
  const [loadingDentalProcedures, setLoadingDentalProcedures] = useState(false);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);

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

  // Restore persisted UI state (tab)
  useEffect(() => {
    if (!uiPersistKey) return;
    try {
      const raw = localStorage.getItem(uiPersistKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.tab && VALID_TABS.includes(parsed.tab)) {
        setActiveTab(parsed.tab);
      }
    } catch {
      // ignore
    }
  }, [uiPersistKey]);

  // Read tab from URL on load
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && VALID_TABS.includes(urlTab as SessionTab)) {
      setActiveTab(urlTab as SessionTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSessionData = useCallback(async () => {
    if (!appointmentId) return;

    try {
      setLoading(true);

      const { data: sessionData, error: sessionError } = await supabase
        .from('appointment_sessions')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      if (sessionError) throw sessionError;

      // Session may not exist yet (e.g. patient viewing before doctor starts)
      if (sessionData) {
        setSession(sessionData as SessionData);
        setSessionNotes(typeof sessionData.notes === 'string' ? sessionData.notes : '');
      } else {
        setSession(null);
      }

      const { data: appointmentData, error: apptError } = await supabase
        .from('appointments')
        .select(
          `
          *,
          doctor:doctors (
            id,
            specialty
          ),
          patient:profiles (
            user_id,
            full_name,
            phone,
            email,
            avatar_url
          ),
          direct_patient:doctor_patients (
            id,
            full_name,
            phone,
            email
          )
        `
        )
        .eq('id', appointmentId)
        .maybeSingle();

      if (apptError) throw apptError;
      if (!appointmentData) throw new Error('Appointment not found');

      const patientName = appointmentData.patient?.full_name || appointmentData.direct_patient?.full_name || 'Patient';
      const patientPhone = appointmentData.patient?.phone || appointmentData.direct_patient?.phone || '';
      const patientEmail = appointmentData.patient?.email || appointmentData.direct_patient?.email || '';
      const patientAvatar = appointmentData.patient?.avatar_url || '';

      setAppointment({
        id: appointmentData.id,
        appointment_date: appointmentData.appointment_date,
        start_time: appointmentData.start_time,
        end_time: appointmentData.end_time,
        status: appointmentData.status,
        notes: appointmentData.notes,
        appointment_type: appointmentData.appointment_type,
        patient_id: appointmentData.patient_id || undefined,
        doctor_patient_id: appointmentData.doctor_patient_id || undefined,
        doctor_id: appointmentData.doctor_id,
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_email: patientEmail,
        patient_avatar: patientAvatar,
      });

      setDoctorSpecialty(appointmentData.doctor?.specialty || '');

      // If video appointment, preload existing consultation (if any)
      if (appointmentData.appointment_type === 'video') {
        const { data: existingConsultation } = await supabase
          .from('video_consultations')
          .select('*')
          .eq('appointment_id', appointmentId)
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

  const formatMoney = useCallback((amount: number | null | undefined) => {
    const n = Number(amount ?? 0);
    const safe = Number.isFinite(n) ? n : 0;
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(safe);
    } catch {
      return `$${safe.toFixed(2)}`;
    }
  }, []);

  const dentalStatusBadgeClass = useCallback((status: AppointmentDentalProcedureRow['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'cancelled':
        return 'bg-red-500/10 text-red-700 dark:text-red-300';
      case 'planned':
      default:
        return 'bg-muted text-muted-foreground';
    }
  }, []);

  const fetchAppointmentDentalProcedures = useCallback(async () => {
    if (!appointmentId) return;

    setLoadingDentalProcedures(true);
    try {
      const { data, error } = await supabase
        .from('tooth_procedure_history')
        .select('id,procedure_name,tooth_numbers,status,cost,notes,performed_at,created_at,doctor:doctor_profiles_view(full_name)')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppointmentDentalProcedures((data as any) || []);
    } catch (error: any) {
      console.error('Error loading appointment dental procedures:', error);
      toast.error(t('doctor.session.dentalProceduresLoadError', 'Failed to load dental procedures'));
      setAppointmentDentalProcedures([]);
    } finally {
      setLoadingDentalProcedures(false);
    }
  }, [appointmentId, t]);

  useEffect(() => {
    if (!isDentist) return;
    fetchAppointmentDentalProcedures();
  }, [isDentist, fetchAppointmentDentalProcedures]);

  // Fetch diagnoses for this appointment
  const fetchDiagnoses = useCallback(async () => {
    if (!appointmentId) return;
    try {
      const { data, error } = await supabase
        .from('appointment_diagnoses')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDiagnoses(
        (data || []).map((d: any) => ({
          id: d.id,
          code: d.icd10_code || '',
          name: d.diagnosis_title || '',
          type: (d.diagnosis_type === 'secondary' ? 'secondary' : 'primary') as 'primary' | 'secondary',
          notes: d.notes || undefined,
          createdAt: d.created_at,
        }))
      );
    } catch (err) {
      console.error('Error loading diagnoses:', err);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchDiagnoses();
  }, [fetchDiagnoses]);

  const handleAddDiagnosis = useCallback(
    async (diag: Omit<Diagnosis, 'id' | 'createdAt'>) => {
      if (!appointmentId || !appointment?.doctor_id) return;
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;

        const { error } = await supabase.from('appointment_diagnoses').insert({
          appointment_id: appointmentId,
          doctor_id: appointment.doctor_id,
          created_by: userId || appointment.doctor_id,
          diagnosis_title: diag.name,
          icd10_code: diag.code || null,
          notes: diag.notes || null,
          patient_id: appointment.patient_id || null,
          doctor_patient_id: appointment.doctor_patient_id || null,
          diagnosis_type: diag.type || 'primary',
        } as any);

        if (error) throw error;
        toast.success('Diagnosis added');
        fetchDiagnoses();
      } catch (err: any) {
        console.error('Error adding diagnosis:', err);
        toast.error('Failed to add diagnosis');
      }
    },
    [appointmentId, appointment, fetchDiagnoses]
  );

  const handleRemoveDiagnosis = useCallback(
    async (id: string) => {
      try {
        const { error } = await supabase.from('appointment_diagnoses').delete().eq('id', id);
        if (error) throw error;
        toast.success('Diagnosis removed');
        fetchDiagnoses();
      } catch (err: any) {
        console.error('Error removing diagnosis:', err);
        toast.error('Failed to remove diagnosis');
      }
    },
    [fetchDiagnoses]
  );

  const appointmentDentalSummary = useMemo(() => {
    const counts = new Map<string, number>();
    let totalCost = 0;

    for (const row of appointmentDentalProcedures) {
      const name = row.procedure_name || 'Procedure';
      const toothCount = Array.isArray(row.tooth_numbers) && row.tooth_numbers.length ? row.tooth_numbers.length : 1;
      counts.set(name, (counts.get(name) || 0) + toothCount);

      if (typeof row.cost === 'number' && Number.isFinite(row.cost)) {
        totalCost += row.cost;
      }
    }

    const summaryParts = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, qty]) => `${name} ×${qty}`);

    return {
      totalCost,
      summaryParts,
      entries: appointmentDentalProcedures.length,
    };
  }, [appointmentDentalProcedures]);

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
      const consult = await createConsultation({
        appointment_id: appointment.id,
        doctor_id: appointment.doctor_id,
        patient_id: appointment.patient_id,
        scheduled_start: new Date().toISOString(),
        scheduled_end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });

      if (consult) {
        setVideoConsultation(consult);
        setShowVideoRoom(true);
        setVideoEnded(false);
        videoEndOnceRef.current = false;
        handleTabChange('video');
      }
    } catch (error) {
      console.error('Error starting video consultation:', error);
      toast.error(t('doctor.session.videoStartError', 'Failed to start video consultation'));
    }
  }, [appointment, canJoinExistingVideo, createConsultation, handleTabChange, joinAsDoctor, t, videoConsultation]);

  const finalizeVideoIfNeeded = useCallback(
    async (notes?: string) => {
      if (!videoConsultation?.id || videoEndOnceRef.current) return;

      videoEndOnceRef.current = true;
      try {
        await endConsultation(videoConsultation.id, notes);
        setVideoEnded(true);
        setShowVideoRoom(false);
      } catch (err) {
        console.error('Error ending video consultation:', err);
      }
    },
    [endConsultation, videoConsultation?.id]
  );

  const handleEndSession = useCallback(async () => {
    if (!session?.id) return;
    try {
      setIsEnding(true);

      const { error } = await supabase
        .from('appointment_sessions')
        .update({ session_status: 'completed', ended_at: new Date().toISOString(), notes: sessionNotes })
        .eq('id', session.id);

      if (error) throw error;

      // mark appointment completed if not already
      if (appointment?.id) {
        await supabase
          .from('appointments')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', appointment.id);
      }

      toast.success(t('doctor.session.ended', 'Session ended'));
      navigate('/doctor-dashboard');
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error(t('doctor.session.endError', 'Failed to end session'));
    } finally {
      setIsEnding(false);
    }
  }, [appointment?.id, navigate, session?.id, sessionNotes, t]);

  const handleSaveNotes = useCallback(async () => {
    if (!session?.id) return;
    try {
      const { error } = await supabase
        .from('appointment_sessions')
        .update({ notes: sessionNotes })
        .eq('id', session.id);

      if (error) throw error;
      toast.success(t('doctor.session.notesSaved', 'Notes saved'));
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error(t('doctor.session.notesSaveError', 'Failed to save notes'));
    }
  }, [session?.id, sessionNotes, t]);

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

  if (!appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('doctor.session.notFoundTitle', 'Appointment Not Found')}</h2>
            <p className="text-muted-foreground mb-4">{t('doctor.session.notFoundBody', 'This appointment could not be loaded.')}</p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('doctor.session.backToDashboard', 'Go Back')}
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
              <Button variant="outline" onClick={() => handleVideoEnd(sessionNotes)} className="gap-2">
                <XCircle className="h-4 w-4" />
                End Video
              </Button>
            )}

            {session && (
              <Button variant="destructive" onClick={handleEndSession} disabled={isEnding} className="gap-2">
                {isEnding ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                End Session
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-6">
        <ResizablePanelGroup orientation="horizontal" className="min-h-[calc(100vh-8rem)]">
          <ResizablePanel defaultSize={65} minSize={50}>
            <div className="pr-4 h-full">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 mb-4">
                  <TabsTrigger value="session" className="gap-2">
                    <Activity className="h-4 w-4" />
                    Session
                  </TabsTrigger>

                  {isVideoAppointment && (
                    <TabsTrigger value="video" className="gap-2">
                      <Video className="h-4 w-4" />
                      Video
                    </TabsTrigger>
                  )}

                  <TabsTrigger value="diagnoses" className="gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Diagnoses
                  </TabsTrigger>

                  {isDentist && (
                    <TabsTrigger value="dental" className="gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Dental
                    </TabsTrigger>
                  )}

                  <TabsTrigger value="prescriptions" className="gap-2">
                    <Pill className="h-4 w-4" />
                    Rx
                  </TabsTrigger>

                  <TabsTrigger value="notes" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 pr-2">
                  {isVideoAppointment && (
                    <TabsContent value="video" className="mt-0 space-y-4">
                      {showVideoRoom && videoConsultation ? (
                        <VideoRoom
                          consultation={videoConsultation}
                          userName="Doctor"
                          userRole="doctor"
                          onEnd={handleVideoEnd}
                          onLeave={() => setShowVideoRoom(false)}
                        />
                      ) : (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Video Consultation</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Start or join the video call for this appointment.
                            </p>
                            {isVideoAppointment && !videoEnded && (
                              <Button onClick={startOrJoinVideo} className="gap-2">
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

                  <TabsContent value="diagnoses" className="mt-0 space-y-4">
                    {isDentist && (
                      <EnhancedDentalChart patientId={patientId} appointmentId={appointment.id} isEditable={false} />
                    )}
                    <DiagnosisTab
                      diagnoses={diagnoses}
                      mode="current"
                      onAddDiagnosis={handleAddDiagnosis}
                      onRemoveDiagnosis={handleRemoveDiagnosis}
                    />
                  </TabsContent>

                  {isDentist && (
                    <TabsContent value="dental" className="mt-0 space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <CircleDot className="h-4 w-4" />
                              Dental Procedures (This Appointment)
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="gap-2"
                              onClick={fetchAppointmentDentalProcedures}
                              disabled={loadingDentalProcedures}
                            >
                              <RefreshCw className={`h-4 w-4 ${loadingDentalProcedures ? 'animate-spin' : ''}`} />
                              Refresh
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="text-sm text-muted-foreground">
                              {appointmentDentalSummary.summaryParts.length
                                ? appointmentDentalSummary.summaryParts.join(' • ')
                                : 'No dental procedures recorded for this appointment yet.'}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="h-4 w-4 text-primary" />
                              <span className="text-muted-foreground">Total:</span>
                              <span className="font-semibold">{formatMoney(appointmentDentalSummary.totalCost)}</span>
                            </div>
                          </div>

                          {loadingDentalProcedures && appointmentDentalProcedures.length === 0 && (
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading procedures...
                            </div>
                          )}

                          {appointmentDentalProcedures.length > 0 && (
                            <div className="space-y-2">
                              {appointmentDentalProcedures.map((row) => {
                                const when = row.performed_at || row.created_at;
                                const dateLabel = when ? format(new Date(when), 'MMM d, yyyy • HH:mm') : '';
                                const teeth = Array.isArray(row.tooth_numbers)
                                  ? row.tooth_numbers.slice().sort((a, b) => a - b)
                                  : [];

                                return (
                                  <div
                                    key={row.id}
                                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm">{row.procedure_name}</span>
                                        <Badge className={dentalStatusBadgeClass(row.status)}>
                                          {row.status.replace('_', ' ')}
                                        </Badge>
                                        {teeth.length > 0 && (
                                          <Badge variant="outline" className="text-xs">
                                            Teeth: {teeth.join(', ')}
                                          </Badge>
                                        )}
                                      </div>

                                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                                        {dateLabel && <span>{dateLabel}</span>}
                                        {row.doctor?.full_name && <span>• Dr. {row.doctor.full_name}</span>}
                                      </div>

                                      {row.notes && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {row.notes}
                                        </div>
                                      )}
                                    </div>

                                    <div className="shrink-0 text-sm font-semibold">
                                      {formatMoney(row.cost)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground">
                            Tip: each entry’s cost is stored as total (unit cost × number of selected teeth).
                          </div>
                        </CardContent>
                      </Card>

                      <EnhancedDentalChart patientId={patientId} appointmentId={appointment.id} isEditable={true} />
                    </TabsContent>
                  )}

                  <TabsContent value="prescriptions" className="mt-0">
                    <PrescriptionCreator
                      patientId={patientId}
                      doctorId={appointment.doctor_id}
                      onSuccess={() => toast.success('Prescription created & PDF downloaded')}
                    />
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
