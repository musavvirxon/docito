// File: src/pages/AppointmentSession.tsx

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Video, MessageSquare, MapPin, Home, Activity,
  User, Clock, Phone, Pill, FileText, Send, Stethoscope,
  CheckCircle, XCircle, Loader2, AlertTriangle, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVideoConsultation } from '@/hooks/useVideoConsultation';
import { EnhancedDentalChart } from '@/components/dental/EnhancedDentalChart';
import { PatientProfileView } from '@/components/appointments/PatientProfileView';
import { VideoRoom } from '@/components/video';
import { cn } from '@/lib/utils';

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

const AppointmentSessionPage = ({ appointmentId: propAppointmentId }: AppointmentSessionPageProps) => {
  const { appointmentId: paramAppointmentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  
  const appointmentId = propAppointmentId || paramAppointmentId;
  
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [doctorSpecialty, setDoctorSpecialty] = useState<string>('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [activeTab, setActiveTab] = useState('session');
  const [isEnding, setIsEnding] = useState(false);
  const [showVideoRoom, setShowVideoRoom] = useState(false);
  const [videoConsultation, setVideoConsultation] = useState<any>(null);
  const [videoEnded, setVideoEnded] = useState(false); // Track if video call has ended

  const { createConsultation, joinAsDoctor, endConsultation } = useVideoConsultation();

  const fetchSessionData = useCallback(async () => {
    if (!appointmentId) return;

    setLoading(true);
    try {
      // Fetch appointment with patient info
      const { data: appt, error: apptError } = await supabase
        .from('appointments')
        .select(`
          *,
          profiles:patient_id(full_name, phone, email, avatar_url),
          doctor_patients:doctor_patient_id(full_name, phone, email)
        `)
        .eq('id', appointmentId)
        .single();

      if (apptError) throw apptError;

      const patientProfile = appt.profiles as any;
      const doctorPatient = appt.doctor_patients as any;

      setAppointment({
        id: appt.id,
        appointment_date: appt.appointment_date,
        start_time: appt.start_time,
        end_time: appt.end_time,
        status: appt.status,
        notes: appt.notes,
        appointment_type: (appt as any).appointment_type || 'in_person',
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

      if (sessionError && sessionError.code === 'PGRST116') {
        // Session doesn't exist, create one
        const { data: newSession, error: createError } = await supabase
          .from('appointment_sessions')
          .insert({
            appointment_id: appointmentId,
            doctor_id: appt.doctor_id,
            patient_id: appt.patient_id,
            doctor_patient_id: appt.doctor_patient_id,
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

      setSession(sessionData);
      setSessionNotes((sessionData?.specialty_data as any)?.notes || appt.notes || '');

      // Fetch doctor specialty
      const { data: doctor } = await supabase
        .from('doctors')
        .select('specialty')
        .eq('id', appt.doctor_id)
        .single();

      if (doctor) {
        setDoctorSpecialty(doctor.specialty || '');
      }

      // For video appointments, check for existing consultation
      if ((appt as any).appointment_type === 'video') {
        const { data: existingConsultation } = await supabase
          .from('video_consultations')
          .select('*')
          .eq('appointment_id', appointmentId)
          .single();

        if (existingConsultation) {
          setVideoConsultation(existingConsultation);
          setShowVideoRoom(true);
        }
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
      toast.error('Failed to load appointment session');
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  // Real-time updates
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

  const handleStartVideo = async () => {
    if (!appointment || !appointment.patient_id) {
      toast.error('Video calls require a registered patient');
      return;
    }

    try {
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
        await joinAsDoctor(consultation.id);
        setVideoConsultation(consultation);
        setShowVideoRoom(true);
        setVideoEnded(false);
        setActiveTab('video'); // Switch to video tab
      }
    } catch (error) {
      console.error('Error starting video:', error);
      toast.error('Failed to start video call');
    }
  };

  const handleSaveNotes = async () => {
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

      toast.success('Notes saved');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    }
  };

  const handleEndSession = async () => {
    if (!session || !appointment) return;

    setIsEnding(true);
    try {
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

      // End video consultation if active
      if (videoConsultation) {
        await endConsultation(videoConsultation.id, sessionNotes);
      }

      toast.success('Appointment completed successfully');
      navigate('/doctor-dashboard');
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
    } finally {
      setIsEnding(false);
    }
  };

  const handleLeaveVideo = () => {
    setShowVideoRoom(false);
    setVideoEnded(true); // Mark video as ended but don't end session
    toast.info('Video call ended. You can end the session when ready.');
  };

  const handleVideoEnd = (notes?: string) => {
    setSessionNotes(notes || sessionNotes);
    setShowVideoRoom(false);
    setVideoEnded(true);
  };

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
            <p className="text-muted-foreground mb-4">
              This appointment session could not be loaded.
            </p>
            <Button onClick={() => navigate('/doctor-dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = appointment.patient_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'P';

  const isDentist = doctorSpecialty.toLowerCase().includes('dent');
  const isVideoAppointment = appointment.appointment_type === 'video';
  const patientId = appointment.patient_id || appointment.doctor_patient_id || '';
  const patientType = appointment.patient_id ? 'registered' : 'direct';

  // Video room is now shown in split view, not full screen replacement
  // This allows keeping patient info visible

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
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
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
            {isVideoAppointment && !showVideoRoom && !videoEnded && (
              <Button onClick={handleStartVideo} className="gap-2">
                <Video className="h-4 w-4" />
                Start Video
              </Button>
            )}
            {showVideoRoom && (
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
            <Button
              variant="destructive"
              onClick={handleEndSession}
              disabled={isEnding}
              className="gap-2"
            >
              {isEnding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
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
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="w-full justify-start">
                  {showVideoRoom && (
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
                  {showVideoRoom && videoConsultation && (
                    <TabsContent value="video" className="mt-0 h-[calc(100vh-16rem)]">
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
                          {isVideoAppointment && !showVideoRoom && !videoEnded && (
                            <Button variant="outline" onClick={handleStartVideo} className="gap-2">
                              <Video className="h-4 w-4" />
                              Start Video
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            className="gap-2"
                            onClick={() => navigate(`/doctor-dashboard?section=calendar&followupOf=${appointment.id}&patient=${patientId}&patientType=${patientType}`)}
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
                      <EnhancedDentalChart
                        patientId={patientId}
                        appointmentId={appointment.id}
                        isEditable={true}
                      />
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
                  <PatientProfileView
                    patientId={patientId}
                    patientType={patientType as any}
                    doctorId={appointment.doctor_id}
                  />
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
