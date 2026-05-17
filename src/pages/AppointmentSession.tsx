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
  Download,
  MapPin,
  Home,
  MessageSquare,
  Star,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVideoConsultation, type VideoConsultation } from '@/hooks/useVideoConsultation';
import { EnhancedDentalChart } from '@/components/dental/EnhancedDentalChart';
import { PatientProfileView } from '@/components/appointments/PatientProfileView';
import { VideoRoom } from '@/components/video';
import { DiagnosisTab } from '@/components/visit/tabs/DiagnosisTab';
import PrescriptionCreator from '@/components/prescriptions/PrescriptionCreator';
import { useAuth } from '@/contexts/AuthContext';
import type { Diagnosis } from '@/components/visit/types';
import { isDentalSpecialty } from '@/lib/clinicalSpecialties';
import { AppointmentFinancePanel } from '@/components/appointments/AppointmentFinancePanel';
import { AppointmentProceduresPanel } from '@/components/appointments/AppointmentProceduresPanel';
import { useAppointmentProcedures } from '@/hooks/useAppointmentProcedures';
import { useAppointmentFinance } from '@/hooks/useAppointmentFinance';
import { generateAppointmentPdf } from '@/utils/generateAppointmentPdf';
import { getOrCreateAppointmentConversation } from '@/lib/messaging/getOrCreateAppointmentConversation';
import { DentalProcedurePicker } from '@/components/appointments/DentalProcedurePicker';
import { ToothDiagnosisPicker } from '@/components/appointments/ToothDiagnosisPicker';
import { PatientClinicalHistoryList } from '@/components/appointments/PatientClinicalHistoryList';
import { AppointmentTreatmentPlansSection } from '@/components/appointments/AppointmentTreatmentPlansSection';
import { useDoctorPerformance } from '@/hooks/useDoctorPerformance';
import { PerformanceReviews } from '@/components/doctor/PerformanceReviews';

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
  patient_dob?: string;
  patient_gender?: string;
  patient_address?: string;
  patient_profession?: string;
  patient_allergies?: string;
  patient_medical_history?: string;
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

type SessionTab = 'session' | 'video' | 'diagnoses' | 'dental' | 'treatmentPlan' | 'prescriptions' | 'notes';

const VALID_TABS: SessionTab[] = ['session', 'video', 'diagnoses', 'dental', 'treatmentPlan', 'prescriptions', 'notes'];

const AppointmentSessionPage = ({ appointmentId: propAppointmentId }: AppointmentSessionPageProps) => {
  const { appointmentId: paramAppointmentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const { allRoles, user } = useAuth();

  const appointmentId = propAppointmentId || paramAppointmentId;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [doctorSpecialty, setDoctorSpecialty] = useState<string>('');
  const [doctorAuthUserId, setDoctorAuthUserId] = useState<string | null>(null);
  const [sessionNotes, setSessionNotes] = useState('');
  // Structured clinical findings for the 043/u summary
  const [clinicalFindings, setClinicalFindings] = useState({
    complaint: '',
    extraOralExam: '',
    oralCavityCondition: '',
    labXrayResults: '',
    diagnosisText: '',
  });
  const [savingFindings, setSavingFindings] = useState(false);
  const [activeTab, setActiveTab] = useState<SessionTab>('session');
  const [isEnding, setIsEnding] = useState(false);
  const [showVideoRoom, setShowVideoRoom] = useState(false);
  const [videoConsultation, setVideoConsultation] = useState<VideoConsultation | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [pendingFollowUps, setPendingFollowUps] = useState<Array<{ id: string; procedure_name: string }>>([]);
  const [followUpGateOpen, setFollowUpGateOpen] = useState(false);

  const [appointmentDentalProcedures, setAppointmentDentalProcedures] = useState<AppointmentDentalProcedureRow[]>([]);
  const [loadingDentalProcedures, setLoadingDentalProcedures] = useState(false);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [doctorName, setDoctorName] = useState<string>('');
  const [clinicInfo, setClinicInfo] = useState<{ name: string; address: string }>({ name: '', address: '' });
  const [pdfDownloading, setPdfDownloading] = useState<'ru' | 'uz' | null>(null);

  // Hooks for procedures + finance (used by panels and the summary PDF)
  const { items: unifiedProcedures, addProcedure: dentalAddProcedure, removeProcedure: dentalRemoveProcedure, refresh: refreshProcedures } = useAppointmentProcedures({
    appointmentId,
    doctorId: appointment?.doctor_id,
    patientId: appointment?.patient_id || null,
    doctorPatientId: appointment?.doctor_patient_id || null,
  });
  const finance = useAppointmentFinance(appointmentId, appointment?.patient_id || undefined);
  const { recentReviews, stats: doctorPerfStats } = useDoctorPerformance();

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
        const sd = (sessionData as any).specialty_data || {};
        const cf = (sd && typeof sd === 'object' && sd.clinical_findings) || {};
        setClinicalFindings({
          complaint: cf.complaint || '',
          extraOralExam: cf.extraOralExam || '',
          oralCavityCondition: cf.oralCavityCondition || '',
          labXrayResults: cf.labXrayResults || '',
          diagnosisText: cf.diagnosisText || '',
        });
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
            user_id,
            specialty
          ),
          patient:profiles (
            user_id,
            full_name,
            phone,
            email,
            avatar_url,
            date_of_birth,
            gender,
            address,
            profession
          ),
          direct_patient:doctor_patients (
            id,
            full_name,
            phone,
            email,
            date_of_birth,
            gender,
            address,
            profession,
            allergies,
            medical_history
          )
        `
        )
        .eq('id', appointmentId)
        .maybeSingle();

      if (apptError) throw apptError;
      if (!appointmentData) throw new Error('Appointment not found');

      const reg = (appointmentData as any).patient || null;
      const dir = (appointmentData as any).direct_patient || null;

      const patientName = reg?.full_name || dir?.full_name || 'Patient';
      const patientPhone = reg?.phone || dir?.phone || '';
      const patientEmail = reg?.email || dir?.email || '';
      const patientAvatar = reg?.avatar_url || '';
      const patientDob = reg?.date_of_birth || dir?.date_of_birth || '';
      const patientGender = reg?.gender || dir?.gender || '';
      const patientAddress = reg?.address || dir?.address || '';
      const patientProfession = reg?.profession || dir?.profession || '';
      const patientAllergies = dir?.allergies || '';
      const patientMedicalHistory = dir?.medical_history || '';

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
        patient_dob: patientDob,
        patient_gender: patientGender,
        patient_address: patientAddress,
        patient_profession: patientProfession,
        patient_allergies: patientAllergies,
        patient_medical_history: patientMedicalHistory,
      });

      setDoctorSpecialty(appointmentData.doctor?.specialty || '');
      setDoctorAuthUserId((appointmentData.doctor as any)?.user_id || null);

      // Doctor name + clinic info (for the Summary PDF header)
      if (appointmentData.doctor_id) {
        const { data: docProfile } = await supabase
          .from('doctor_profiles_view')
          .select('full_name, practice_name, practice_address')
          .eq('id', appointmentData.doctor_id)
          .maybeSingle();
        if (docProfile) {
          setDoctorName((docProfile as any).full_name || '');
          setClinicInfo({
            name: (docProfile as any).practice_name || '',
            address: (docProfile as any).practice_address || '',
          });
        }
      }

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
  const isDentist = isDentalSpecialty(doctorSpecialty);
  // Show clinical management tabs (Treatment Plan / Rx) for the appointment's
  // doctor, staff, or admin roles — not for the patient viewing their own visit.
  const allRolesList = allRoles || [];
  const isAppointmentDoctor = !!user?.id && !!doctorAuthUserId && user.id === doctorAuthUserId;
  const hasClinicianRole = allRolesList.some((r) =>
    ['doctor', 'staff', 'admin', 'clinic_admin', 'pharmacy_admin', 'lab_admin', 'imaging_admin', 'super_admin'].includes(r as string),
  );
  const canManagePrescriptions = isAppointmentDoctor || hasClinicianRole;

  // Ensure active tab remains valid when the appointment type changes
  useEffect(() => {
    if (!appointment) return;
    if (!isVideoAppointment && activeTab === 'video') {
      handleTabChange('session');
    }
    if (!isDentist && activeTab === 'dental') {
      handleTabChange('session');
    }
    if (!canManagePrescriptions && (activeTab === 'treatmentPlan' || activeTab === 'prescriptions')) {
      handleTabChange('session');
    }
  }, [appointment, isVideoAppointment, isDentist, canManagePrescriptions, activeTab, handleTabChange]);

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
    if (!appointment) return;

    const hasRegistered = !!appointment.patient_id;
    const hasGuest = !!appointment.doctor_patient_id;
    if (!hasRegistered && !hasGuest) {
      toast.error(t('doctor.session.videoNoPatient', 'No patient is attached to this appointment'));
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

      // Otherwise create a new consultation (guest if no registered patient)
      const consult = await createConsultation({
        appointment_id: appointment.id,
        doctor_id: appointment.doctor_id,
        ...(hasRegistered
          ? { patient_id: appointment.patient_id! }
          : { doctor_patient_id: appointment.doctor_patient_id! }),
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

  const finalizeEndSession = useCallback(async () => {
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

  const checkPendingFollowUps = useCallback(async () => {
    if (!appointment?.doctor_id) return [] as Array<{ id: string; procedure_name: string }>;
    const patientId = appointment.patient_id || appointment.doctor_patient_id;
    if (!patientId) return [];

    try {
      // Find treatment plans for this doctor + patient
      const planQuery = supabase
        .from('treatment_plans')
        .select('id')
        .eq('doctor_id', appointment.doctor_id);

      const { data: plans } = appointment.patient_id
        ? await planQuery.eq('patient_id', appointment.patient_id)
        : await planQuery.eq('doctor_patient_id', appointment.doctor_patient_id as string);

      const planIds = (plans || []).map((p: any) => p.id);
      if (planIds.length === 0) return [];

      const { data: rows } = await supabase
        .from('treatment_plan_procedures')
        .select('id, procedure_name, follow_up_required, follow_up_appointment_id, follow_up_skipped_at')
        .in('treatment_plan_id', planIds)
        .eq('follow_up_required', true)
        .is('follow_up_appointment_id', null)
        .is('follow_up_skipped_at', null);

      return (rows || []).map((r: any) => ({
        id: r.id as string,
        procedure_name: (r.procedure_name as string) || '—',
      }));
    } catch (err) {
      console.error('Error checking follow-ups:', err);
      return [];
    }
  }, [appointment?.doctor_id, appointment?.patient_id, appointment?.doctor_patient_id]);

  const handleEndSession = useCallback(async () => {
    if (!session?.id) return;
    const pending = await checkPendingFollowUps();
    if (pending.length > 0) {
      setPendingFollowUps(pending);
      setFollowUpGateOpen(true);
      return;
    }
    await finalizeEndSession();
  }, [session?.id, checkPendingFollowUps, finalizeEndSession]);

  const [isFinishing, setIsFinishing] = useState(false);
  const handleFinishAppointment = useCallback(async () => {
    if (!appointment?.id) return;
    try {
      setIsFinishing(true);
      // Close session if open
      if (session?.id) {
        await supabase
          .from('appointment_sessions')
          .update({ session_status: 'completed', ended_at: new Date().toISOString(), notes: sessionNotes })
          .eq('id', session.id);
      }
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', appointment.id);
      if (error) throw error;
      toast.success(t('doctor.session.finished', 'Appointment marked as completed'));
      navigate('/doctor-dashboard?section=calendar');
    } catch (err) {
      console.error('Finish appointment failed', err);
      toast.error(t('doctor.session.finishError', 'Failed to finish appointment'));
    } finally {
      setIsFinishing(false);
    }
  }, [appointment?.id, session?.id, sessionNotes, navigate, t]);

  const handleSkipFollowUps = useCallback(async () => {
    try {
      const ids = pendingFollowUps.map((p) => p.id);
      if (ids.length > 0) {
        await supabase
          .from('treatment_plan_procedures')
          .update({ follow_up_skipped_at: new Date().toISOString() })
          .in('id', ids);
      }
      setFollowUpGateOpen(false);
      setPendingFollowUps([]);
      await finalizeEndSession();
    } catch (err) {
      console.error('Error skipping follow-ups:', err);
      toast.error(t('doctor.session.followUp.skipError', 'Failed to skip follow-ups'));
    }
  }, [pendingFollowUps, finalizeEndSession, t]);

  const handleBookFollowUp = useCallback(() => {
    setFollowUpGateOpen(false);
    const patientId = appointment?.patient_id || appointment?.doctor_patient_id;
    if (patientId) {
      navigate(`/doctor-dashboard?tab=calendar&book=1&patient=${patientId}`);
    } else {
      navigate('/doctor-dashboard?tab=calendar');
    }
  }, [appointment?.patient_id, appointment?.doctor_patient_id, navigate]);

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

  const handleSaveClinicalFindings = useCallback(async () => {
    if (!appointmentId) {
      toast.error(t('doctor.session.findingsNoSession', 'Appointment not loaded'));
      return;
    }
    setSavingFindings(true);
    try {
      let workingSession = session;

      // Auto-create the session row if the doctor hasn't formally started yet,
      // so saving findings always works.
      if (!workingSession?.id) {
        const { data: created, error: createErr } = await supabase
          .from('appointment_sessions')
          .insert({
            appointment_id: appointmentId,
            session_status: 'in_progress',
            started_at: new Date().toISOString(),
            specialty_data: {},
          } as any)
          .select('*')
          .single();
        if (createErr) throw createErr;
        workingSession = created as SessionData;
        setSession(workingSession);
      }

      const existing =
        (workingSession as any).specialty_data && typeof (workingSession as any).specialty_data === 'object'
          ? (workingSession as any).specialty_data
          : {};
      const next = { ...existing, clinical_findings: clinicalFindings };
      const { error } = await supabase
        .from('appointment_sessions')
        .update({ specialty_data: next })
        .eq('id', workingSession.id);
      if (error) throw error;
      setSession((prev) => (prev ? ({ ...prev, specialty_data: next } as any) : prev));
      toast.success(t('doctor.session.findingsSaved', 'Clinical findings saved'));
    } catch (err) {
      console.error('Error saving clinical findings:', err);
      toast.error(t('doctor.session.findingsSaveError', 'Failed to save clinical findings'));
    } finally {
      setSavingFindings(false);
    }
  }, [appointmentId, session, clinicalFindings, t]);

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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const returnDate = sessionStorage.getItem('calendarReturnDate');
                const returnView = sessionStorage.getItem('calendarReturnView') || 'week';
                sessionStorage.removeItem('calendarReturnDate');
                sessionStorage.removeItem('calendarReturnView');
                navigate('/doctor-dashboard?section=calendar', {
                  state: { returnDate, returnView },
                });
              }}
            >
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

            {appointmentId && appointment && (() => {
              const downloadSummary = async (lang: 'ru' | 'uz') => {
                if (pdfDownloading) return;
                setPdfDownloading(lang);
                try {
                  // Build tooth findings from unified procedures (dental + general)
                  const toothFindings = unifiedProcedures.flatMap((p) =>
                    (p.toothNumbers || []).map((tooth) => ({
                      tooth,
                      label: p.notes ? `${p.name} — ${p.notes}` : p.name,
                    })),
                  );
                  // Combine session notes + diagnosis text
                  const diagnosisText = diagnoses
                    .map((d: any) => d.name || d.code || d.description)
                    .filter(Boolean)
                    .join('; ');
                  const treatmentText = [
                    sessionNotes,
                    unifiedProcedures
                      .map((p) => `• ${p.name}${p.toothNumbers?.length ? ` (${p.toothNumbers.join(', ')})` : ''}`)
                      .join('\n'),
                  ]
                    .filter(Boolean)
                    .join('\n\n');

                  // Compute age from DOB
                  let ageStr: string | undefined;
                  let dobLabel: string | undefined;
                  if (appointment.patient_dob) {
                    const dob = new Date(appointment.patient_dob);
                    if (!Number.isNaN(dob.getTime())) {
                      const now = new Date();
                      let a = now.getFullYear() - dob.getFullYear();
                      const m = now.getMonth() - dob.getMonth();
                      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) a--;
                      if (a >= 0) ageStr = String(a);
                      dobLabel = format(dob, 'dd.MM.yyyy');
                    }
                  }

                  // Localized gender for the form
                  const genderRaw = (appointment.patient_gender || '').toLowerCase();
                  const genderLabel =
                    lang === 'ru'
                      ? genderRaw === 'male'
                        ? 'муж'
                        : genderRaw === 'female'
                          ? 'жен'
                          : appointment.patient_gender || ''
                      : genderRaw === 'male'
                        ? 'erkak'
                        : genderRaw === 'female'
                          ? 'ayol'
                          : appointment.patient_gender || '';

                  // Combine declared complaints from medical history / allergies + structured complaint
                  const complaintsText = [
                    clinicalFindings.complaint?.trim() || '',
                    appointment.patient_allergies
                      ? `${lang === 'ru' ? 'Аллергии' : 'Allergiyalar'}: ${appointment.patient_allergies}`
                      : '',
                    appointment.patient_medical_history
                      ? `${lang === 'ru' ? 'Анамнез' : 'Anamnez'}: ${appointment.patient_medical_history}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join('\n');

                  // Prefer the dentist's typed diagnosis over the structured diagnoses list when present
                  const finalDiagnosis = clinicalFindings.diagnosisText?.trim() || diagnosisText;

                  await generateAppointmentPdf(
                    {
                      clinicName: clinicInfo.name,
                      clinicAddress: clinicInfo.address,
                      patientName: appointment.patient_name || '',
                      gender: genderLabel,
                      age: ageStr,
                      dob: dobLabel,
                      address: appointment.patient_address || '',
                      profession: appointment.patient_profession || '',
                      phone: appointment.patient_phone || '',
                      appointmentDate: appointment.appointment_date || '',
                      appointmentTime: appointment.start_time || '',
                      diagnosis: finalDiagnosis,
                      complaints: complaintsText,
                      externalExam: clinicalFindings.extraOralExam || '',
                      oralCavity: clinicalFindings.oralCavityCondition || '',
                      xrayLab: clinicalFindings.labXrayResults || '',
                      treatment: treatmentText,
                      serviceName: appointment.appointment_type || '',
                      doctorName,
                      doctorSpecialty: doctorSpecialty || '',
                      notes: appointment.notes || '',
                      totalAmount: finance.totalBilled,
                      amountPaid: finance.totalPaid,
                      balance: finance.outstanding,
                      currency: finance.currency,
                      toothFindings,
                    },
                    lang,
                  );
                  toast.success(t('doctor.session.summary.downloaded', 'Summary PDF downloaded'));
                } catch (err) {
                  console.error('Summary PDF failed', err);
                  toast.error(t('doctor.session.summary.failed', 'Failed to generate PDF'));
                } finally {
                  setPdfDownloading(null);
                }
              };
              return (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadSummary('ru')}
                    disabled={!!pdfDownloading}
                    className="gap-2"
                  >
                    {pdfDownloading === 'ru' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    043/у RU
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadSummary('uz')}
                    disabled={!!pdfDownloading}
                    className="gap-2"
                  >
                    {pdfDownloading === 'uz' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    043/u UZ
                  </Button>
                </div>
              );
            })()}


            {session && (
              <Button variant="destructive" onClick={handleEndSession} disabled={isEnding} className="gap-2">
                {isEnding ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {t('doctor.session.end', 'End Session')}
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
                <TabsList className="!flex !h-auto w-full flex-wrap justify-start gap-1 mb-4">
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

                  {canManagePrescriptions && (
                    <TabsTrigger value="treatmentPlan" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Treatment Plan
                    </TabsTrigger>
                  )}

                  {canManagePrescriptions && (
                    <TabsTrigger value="prescriptions" className="gap-2">
                      <Pill className="h-4 w-4" />
                      Rx
                    </TabsTrigger>
                  )}

                  <TabsTrigger value="notes" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </TabsTrigger>

                  <TabsTrigger value="reviews" className="gap-2">
                    <Star className="h-4 w-4" />
                    Reviews
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 pr-2">
                  {isVideoAppointment && (
                    <TabsContent value="video" className="mt-0 space-y-4 min-h-[70vh]">
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
                    {/* TYPE-SPECIFIC FEATURE CARD (FIX 3) */}
                    {(() => {
                      const apptType = String(appointment?.appointment_type || '').toLowerCase();
                      if (apptType === 'video') {
                        return (
                          <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4 space-y-2">
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                              <Video className="h-4 w-4" /> Video Consultation
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" onClick={startOrJoinVideo}>
                                {videoConsultation && canJoinExistingVideo ? 'Join Video Call' : 'Start Video Call'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                const link = `${window.location.origin}/video-call/${videoConsultation?.id || appointment.id}`;
                                navigator.clipboard?.writeText(link);
                                toast.success('Video link copied');
                              }}>
                                Copy Link
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Ensure patient has the meeting link before starting.
                            </p>
                          </div>
                        );
                      }
                      if (apptType === 'in_person' || apptType === 'in-person') {
                        return (
                          <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4">
                            <p className="text-sm font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                              <MapPin className="h-4 w-4" /> In-Person Visit
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Room / Chair: ___________ &nbsp;&nbsp; Check-in:{' '}
                              <span className="font-medium">{(appointment as any)?.check_in_time || 'Not checked in'}</span>
                            </p>
                            <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={async () => {
                              try {
                                await supabase.from('appointments').update({ check_in_time: new Date().toISOString() } as any).eq('id', appointment.id);
                                toast.success('Patient checked in');
                                fetchSessionData();
                              } catch { toast.error('Check-in failed'); }
                            }}>
                              Mark Checked In
                            </Button>
                          </div>
                        );
                      }
                      if (apptType === 'home_visit' || apptType === 'home-visit' || apptType === 'home') {
                        const addr = (appointment as any)?.patient?.address || (appointment as any)?.address || '';
                        return (
                          <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-4 space-y-2">
                            <p className="text-sm font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-2">
                              <Home className="h-4 w-4" /> Home Visit
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Address: <span className="font-medium">{addr || '—'}</span>
                            </p>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="text-xs h-7"
                                onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(addr)}`, '_blank')}>
                                Open in Maps
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-7"
                                onClick={() => toast.info('Travel log coming soon')}>
                                Log Travel Time
                              </Button>
                            </div>
                          </div>
                        );
                      }
                      if (apptType === 'follow_up' || apptType === 'follow-up') {
                        return (
                          <div className="rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-800 p-4 space-y-2">
                            <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                              <RefreshCw className="h-4 w-4" /> Follow-up
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Previous visit:{' '}
                              <span className="font-medium">
                                {(appointment as any)?.previous_appointment_date || '—'}
                              </span>
                            </p>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="text-xs h-7"
                                onClick={() => toast.info('View previous visit coming soon')}>
                                View Previous Notes
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-7"
                                onClick={() => toast.info('Schedule next follow-up coming soon')}>
                                Schedule Next Follow-up
                              </Button>
                            </div>
                          </div>
                        );
                      }
                      if (apptType === 'message' || apptType === 'messaging') {
                        return (
                          <div className="rounded-xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-800 p-4 space-y-2">
                            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" /> Message Consultation
                            </p>
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (!appointment) return;
                                const conv = await getOrCreateAppointmentConversation({
                                  appointmentId: appointment.id,
                                  doctorUserId: appointment.doctor_id,
                                  patientUserId: appointment.patient_id,
                                  patientName: appointment.patient_name,
                                });
                                if (conv) {
                                  navigate(`/messages?c=${conv}`);
                                } else {
                                  toast.error('Cannot open chat — patient must be a registered user');
                                }
                              }}
                            >
                              Open Chat Thread
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              Async consultation — respond at your convenience.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}

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
                          {canManagePrescriptions && (
                            <Button variant="outline" className="gap-2" onClick={() => handleTabChange('prescriptions')}>
                              <Pill className="h-4 w-4" />
                              Prescription
                            </Button>
                          )}
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

                    {/* Clinical Findings — feeds the 043/u summary PDF */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>Clinical Findings</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveClinicalFindings}
                            disabled={savingFindings || !appointmentId}
                          >
                            {savingFindings ? 'Saving…' : 'Save'}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Complaint</Label>
                            <Textarea
                              rows={2}
                              value={clinicalFindings.complaint}
                              onChange={(e) =>
                                setClinicalFindings((s) => ({ ...s, complaint: e.target.value }))
                              }
                              placeholder="Patient's chief complaint…"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Extra-oral examination</Label>
                            <Textarea
                              rows={2}
                              value={clinicalFindings.extraOralExam}
                              onChange={(e) =>
                                setClinicalFindings((s) => ({ ...s, extraOralExam: e.target.value }))
                              }
                              placeholder="Face, lymph nodes, TMJ…"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Condition of oral cavity</Label>
                            <Textarea
                              rows={2}
                              value={clinicalFindings.oralCavityCondition}
                              onChange={(e) =>
                                setClinicalFindings((s) => ({ ...s, oralCavityCondition: e.target.value }))
                              }
                              placeholder="Mucosa, gingiva, palate…"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Lab & X-ray results</Label>
                            <Textarea
                              rows={2}
                              value={clinicalFindings.labXrayResults}
                              onChange={(e) =>
                                setClinicalFindings((s) => ({ ...s, labXrayResults: e.target.value }))
                              }
                              placeholder="Imaging findings, lab values…"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Diagnosis (free text — overrides structured list in PDF)</Label>
                          <Textarea
                            rows={2}
                            value={clinicalFindings.diagnosisText}
                            onChange={(e) =>
                              setClinicalFindings((s) => ({ ...s, diagnosisText: e.target.value }))
                            }
                            placeholder="Working diagnosis…"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          These fields, together with procedures and billing on this page, are merged into the 043/u summary PDF.
                        </p>
                      </CardContent>
                    </Card>

                    {/* Patient Finance (real, persisted) */}
                    {appointment && (
                      <AppointmentFinancePanel
                        appointmentId={appointment.id}
                        patientId={appointment.patient_id}
                        patientName={appointment.patient_name || ''}
                        appointmentDate={appointment.appointment_date}
                        procedures={unifiedProcedures}
                      />
                    )}

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
                    {isDentist && patientId && (
                      <ToothDiagnosisPicker patientId={patientId} />
                    )}
                    {!isDentist && (
                      <>
                        <DiagnosisTab
                          diagnoses={diagnoses}
                          mode="current"
                          onAddDiagnosis={handleAddDiagnosis}
                          onRemoveDiagnosis={handleRemoveDiagnosis}
                        />
                        {appointment && appointment.doctor_id && (
                          <AppointmentProceduresPanel
                            appointmentId={appointmentId!}
                            doctorId={appointment.doctor_id}
                            patientId={appointment.patient_id || null}
                            doctorPatientId={appointment.doctor_patient_id || null}
                            isDentist={false}
                          />
                        )}
                        {patientId && (
                          <PatientClinicalHistoryList
                            patientId={patientId}
                            excludeAppointmentId={appointmentId}
                          />
                        )}
                      </>
                    )}
                  </TabsContent>

                  {isDentist && (
                    <TabsContent value="dental" className="mt-0 space-y-4">
                      {/* Inline (big) procedure adder — auto-bills via useAppointmentProcedures */}
                      {appointment && (
                        <DentalProcedurePicker
                          procedures={unifiedProcedures}
                          onRemove={async (item) => {
                            await dentalRemoveProcedure(item);
                            await refreshProcedures();
                          }}
                          onSubmit={async (input) => {
                            await dentalAddProcedure(input);
                            await refreshProcedures();
                            await finance.refresh();
                          }}
                        />
                      )}

                      {/* Procedures list (read/manage) is rendered in the main session view above to avoid duplication */}

                      {/* Legacy: read-only history of dental procedures for this appointment */}
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
                    </TabsContent>
                  )}

                  {canManagePrescriptions && (
                    <TabsContent value="treatmentPlan" className="mt-0 space-y-4">
                      {appointment && (
                        <AppointmentTreatmentPlansSection
                          doctorId={appointment.doctor_id}
                          doctorAuthUserId={doctorAuthUserId}
                          patientId={appointment.patient_id || null}
                          doctorPatientId={appointment.doctor_patient_id || null}
                          patientName={appointment.patient_name}
                          canManage={canManagePrescriptions}
                        />
                      )}
                    </TabsContent>
                  )}

                  {canManagePrescriptions && (
                    <TabsContent value="prescriptions" className="mt-0">
                      <PrescriptionCreator
                        patientId={patientId}
                        doctorId={appointment.doctor_id}
                        appointmentId={appointmentId}
                        onSuccess={() => toast.success('Prescription created & PDF downloaded')}
                      />
                    </TabsContent>
                  )}

                  <TabsContent value="notes" className="mt-0 space-y-4">
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

                  <TabsContent value="reviews" className="mt-0 space-y-4">
                    <PerformanceReviews
                      reviews={recentReviews || []}
                      averageRating={doctorPerfStats?.averageRating || 0}
                      totalReviews={doctorPerfStats?.totalReviews || 0}
                    />
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

      <AlertDialog open={followUpGateOpen} onOpenChange={setFollowUpGateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('doctor.session.followUp.title', 'Pending follow-up appointments')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {t(
                    'doctor.session.followUp.description',
                    'The following procedures require a follow-up that has not been booked yet:'
                  )}
                </p>
                <ul className="list-disc pl-5 text-sm text-foreground">
                  {pendingFollowUps.map((p) => (
                    <li key={p.id}>{p.procedure_name}</li>
                  ))}
                </ul>
                <p className="text-sm text-muted-foreground">
                  {t(
                    'doctor.session.followUp.choose',
                    'You can book the follow-up now or skip it and finish the appointment.'
                  )}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>
              {t('doctor.session.followUp.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleSkipFollowUps();
              }}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              {t('doctor.session.followUp.skip', 'Skip & finish')}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBookFollowUp();
              }}
            >
              {t('doctor.session.followUp.book', 'Book follow-up')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AppointmentSessionPage;
