import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  User, Phone, Mail, MapPin, Calendar, Clock, Pill, FileText,
  AlertTriangle, Activity, Stethoscope, Image, TestTube, Heart,
  ChevronRight, ArrowLeft, Loader2, Download, Wallet, ShieldCheck, BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { downloadPrescriptionPdf } from '@/lib/api/prescription-api';
import { downloadAppointmentSummaryPdf } from '@/lib/api/appointment-summary-api';
import PatientEntityHistoryPanel from '@/components/appointments/PatientEntityHistoryPanel';
import type { ViewerEntityType } from '@/hooks/usePatientEntityHistory';

interface PatientProfileViewProps {
  patientId: string;
  patientType: 'registered' | 'direct';
  onBack?: () => void;
  compact?: boolean;
  /** Viewer entity scope — enables Billing/Insurance/Analytics/Activity tabs. */
  viewerEntity?: { type: ViewerEntityType; id: string };
}

interface PatientData {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  avatar_url?: string;
  allergies?: string;
  medical_history?: string;
  dental_history?: string;
  current_medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

interface AppointmentHistoryItem {
  id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  notes?: string;
  procedure_name?: string;
  doctor_name?: string;
}

interface LabResult {
  id: string;
  test_name: string;
  test_type: string;
  status: string;
  result_text?: string;
  is_abnormal?: boolean;
  created_at: string;
}

interface ImagingResult {
  id: string;
  exam_name: string;
  modality: string;
  status: string;
  findings?: string;
  created_at: string;
}
interface PrescriptionItem {
  id: string;
  prescription_number?: string;
  status: string;
  created_at: string;
  items_count?: number;
}

export const PatientProfileView = ({
  patientId,
  patientType,
  onBack,
  compact = false,
  viewerEntity,
}: PatientProfileViewProps) => {
  const { t } = useTranslation('dashboard');
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [appointments, setAppointments] = useState<AppointmentHistoryItem[]>([]);
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [imagingResults, setImagingResults] = useState<ImagingResult[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [downloadingSummary, setDownloadingSummary] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleDownloadSummary = useCallback(async (apptId: string) => {
    setDownloadingSummary(apptId);
    try {
      await downloadAppointmentSummaryPdf(apptId);
      toast.success(t('patientProfile.summary.downloaded', 'Appointment summary downloaded'));
    } catch (err: any) {
      toast.error(err?.message || t('patientProfile.summary.failed', 'Failed to download summary'));
    } finally {
      setDownloadingSummary(null);
    }
  }, [t]);


  const fetchPatientData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch patient info based on type
      if (patientType === 'registered') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', patientId)
          .single();

        if (profile) {
          setPatient({
            id: profile.user_id,
            full_name: profile.full_name || 'Unknown Patient',
            email: profile.email,
            phone: profile.phone,
            date_of_birth: profile.date_of_birth,
            gender: profile.gender,
            address: profile.address,
            avatar_url: profile.avatar_url,
            allergies: (profile as any).allergies || undefined,
            medical_history: (profile as any).medical_history || undefined,
          });
        }
      } else {
        const { data: doctorPatient } = await supabase
          .from('doctor_patients')
          .select('*')
          .eq('id', patientId)
          .single();

        if (doctorPatient) {
          setPatient({
            id: doctorPatient.id,
            full_name: doctorPatient.full_name,
            email: doctorPatient.email || undefined,
            phone: doctorPatient.phone,
            date_of_birth: doctorPatient.date_of_birth,
            gender: doctorPatient.gender || undefined,
            address: doctorPatient.address || undefined,
            allergies: doctorPatient.allergies || undefined,
            medical_history: doctorPatient.medical_history || undefined,
            dental_history: doctorPatient.dental_history || undefined,
            current_medications: doctorPatient.current_medications || undefined,
            emergency_contact_name: doctorPatient.emergency_contact_name || undefined,
            emergency_contact_phone: doctorPatient.emergency_contact_phone || undefined,
          });
        }
      }

      // Fetch appointment history
      const appointmentQuery = patientType === 'registered'
        ? supabase
            .from('appointments')
            .select('*, procedures:procedure_id(name)')
            .eq('patient_id', patientId)
            .order('appointment_date', { ascending: false })
            .limit(20)
        : supabase
            .from('appointments')
            .select('*, procedures:procedure_id(name)')
            .eq('doctor_patient_id', patientId)
            .order('appointment_date', { ascending: false })
            .limit(20);

      const { data: apptData } = await appointmentQuery;
      setAppointments((apptData || []).map((a: any) => ({
        id: a.id,
        appointment_date: a.appointment_date,
        start_time: a.start_time,
        status: a.status,
        notes: a.notes,
        procedure_name: a.procedures?.name,
      })));

      // Fetch lab results (only for registered patients)
      if (patientType === 'registered') {
        const { data: labData } = await supabase
          .from('clinic_lab_orders')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(10);

        setLabResults((labData || []).map((l: any) => ({
          id: l.id,
          test_name: l.test_name,
          test_type: l.test_type,
          status: l.status,
          result_text: l.result_text,
          is_abnormal: l.is_abnormal,
          created_at: l.created_at,
        })));

        // Fetch imaging results
        const { data: imgData } = await supabase
          .from('clinic_imaging_orders')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(10);

        setImagingResults((imgData || []).map((i: any) => ({
          id: i.id,
          exam_name: i.exam_name,
          modality: i.modality,
          status: i.status,
          findings: i.findings,
          created_at: i.created_at,
        })));
      }

      // Fetch prescriptions for the patient
      if (patientType === 'registered') {
        const { data: rxData } = await supabase
          .from('prescriptions')
          .select('id, prescription_number, status, created_at')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(20);

        setPrescriptions((rxData || []).map((rx: any) => ({
          id: rx.id,
          prescription_number: rx.prescription_number,
          status: rx.status || 'active',
          created_at: rx.created_at,
        })));
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setLoading(false);
    }
  }, [patientId, patientType]);

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId, fetchPatientData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Patient not found</p>
      </div>
    );
  }

  const initials = patient.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'P';

  const age = patient.date_of_birth
    ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {/* Header with Back Button */}
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      )}

      {/* Patient Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className={cn("border-2 border-background shadow-lg", compact ? "h-14 w-14" : "h-20 w-20")}>
              <AvatarImage src={patient.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h2 className={cn("font-semibold truncate", compact ? "text-lg" : "text-2xl")}>
                {patient.full_name}
              </h2>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {age && (
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="h-3 w-3" />
                    {age} years old
                  </Badge>
                )}
                {patient.gender && (
                  <Badge variant="outline" className="capitalize">
                    {patient.gender}
                  </Badge>
                )}
                {patientType === 'direct' && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Direct Patient
                  </Badge>
                )}
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                {patient.phone && (
                  <a href={`tel:${patient.phone}`} className="flex items-center gap-1 hover:text-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {patient.phone}
                  </a>
                )}
                {patient.email && (
                  <a href={`mailto:${patient.email}`} className="flex items-center gap-1 hover:text-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {patient.email}
                  </a>
                )}
                {patient.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {patient.address}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allergies Alert */}
      {patient.allergies && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">Allergies</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {patient.allergies}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            {t('patientProfile.tabs.overview', 'Overview')}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <FileText className="h-4 w-4" />
            {t('patientProfile.tabs.history', 'Medical History')}
          </TabsTrigger>
          <TabsTrigger value="appointments" className="gap-2">
            <Calendar className="h-4 w-4" />
            {t('patientProfile.tabs.appointments', 'Appointments')}
          </TabsTrigger>
          {patientType === 'registered' && (
            <>
              <TabsTrigger value="prescriptions" className="gap-2">
                <Pill className="h-4 w-4" />
                {t('patientProfile.tabs.prescriptions', 'Prescriptions')}
              </TabsTrigger>
              <TabsTrigger value="labs" className="gap-2">
                <TestTube className="h-4 w-4" />
                {t('patientProfile.tabs.labs', 'Lab Results')}
              </TabsTrigger>
              <TabsTrigger value="imaging" className="gap-2">
                <Image className="h-4 w-4" />
                {t('patientProfile.tabs.imaging', 'Imaging')}
              </TabsTrigger>
            </>
          )}
          {viewerEntity && (
            <>
              <TabsTrigger value="billing" className="gap-2">
                <Wallet className="h-4 w-4" />
                {t('patientProfile.tabs.billing', 'Billing')}
              </TabsTrigger>
              <TabsTrigger value="insurance" className="gap-2">
                <ShieldCheck className="h-4 w-4" />
                {t('patientProfile.tabs.insurance', 'Insurance')}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                {t('patientProfile.tabs.analytics', 'Analytics')}
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="h-4 w-4" />
                {t('patientProfile.tabs.activity', 'Activity')}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {viewerEntity && (
          <>
            <TabsContent value="billing" className="mt-4">
              <PatientEntityHistoryPanel patientId={patientId} entityType={viewerEntity.type} entityId={viewerEntity.id} variant="billing" />
            </TabsContent>
            <TabsContent value="insurance" className="mt-4">
              <PatientEntityHistoryPanel patientId={patientId} entityType={viewerEntity.type} entityId={viewerEntity.id} variant="insurance" />
            </TabsContent>
            <TabsContent value="analytics" className="mt-4">
              <PatientEntityHistoryPanel patientId={patientId} entityType={viewerEntity.type} entityId={viewerEntity.id} variant="analytics" />
            </TabsContent>
            <TabsContent value="activity" className="mt-4">
              <PatientEntityHistoryPanel patientId={patientId} entityType={viewerEntity.type} entityId={viewerEntity.id} variant="activity" />
            </TabsContent>
          </>
        )}

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Medications */}
            {patient.current_medications && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    Current Medications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{patient.current_medications}</p>
                </CardContent>
              </Card>
            )}

            {/* Emergency Contact */}
            {patient.emergency_contact_name && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{patient.emergency_contact_name}</p>
                  {patient.emergency_contact_phone && (
                    <a 
                      href={`tel:${patient.emergency_contact_phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {patient.emergency_contact_phone}
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recent Appointments */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Recent Appointments
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('appointments')}>
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No appointment history</p>
                ) : (
                  <div className="space-y-2">
                    {appointments.slice(0, 3).map((appt) => (
                      <div key={appt.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(appt.appointment_date), 'MMM d, yyyy')} at {appt.start_time}
                          </p>
                          {appt.procedure_name && (
                            <p className="text-xs text-muted-foreground">{appt.procedure_name}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="capitalize text-xs">
                          {appt.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="grid grid-cols-1 gap-4">
            {patient.medical_history && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    Medical History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{patient.medical_history}</p>
                </CardContent>
              </Card>
            )}

            {patient.dental_history && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" />
                    Dental History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{patient.dental_history}</p>
                </CardContent>
              </Card>
            )}

            {!patient.medical_history && !patient.dental_history && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No medical history recorded</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[400px]">
                {appointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No appointment history</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((appt) => (
                      <div 
                        key={appt.id} 
                        className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">
                              {format(new Date(appt.appointment_date), 'EEEE, MMMM d, yyyy')}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="h-3.5 w-3.5" />
                              {appt.start_time}
                            </p>
                            {appt.procedure_name && (
                              <Badge variant="secondary" className="mt-2">
                                {appt.procedure_name}
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {appt.status}
                          </Badge>
                        </div>
                        {appt.notes && (
                          <p className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                            {appt.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[400px]">
                {prescriptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Pill className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No prescriptions found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {prescriptions.map((rx) => (
                      <div key={rx.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">
                              Rx #{rx.prescription_number || rx.id.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(rx.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">{rx.status}</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={downloadingPdf === rx.id}
                              onClick={async () => {
                                setDownloadingPdf(rx.id);
                                try {
                                  await downloadPrescriptionPdf(rx.id, rx.prescription_number);
                                  toast.success('Prescription PDF downloaded');
                                } catch (err: any) {
                                  toast.error(err.message || 'Failed to download PDF');
                                } finally {
                                  setDownloadingPdf(null);
                                }
                              }}
                            >
                              {downloadingPdf === rx.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labs" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[400px]">
                {labResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <TestTube className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No lab results available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {labResults.map((lab) => (
                      <div 
                        key={lab.id} 
                        className={cn(
                          "p-3 rounded-lg border bg-card",
                          lab.is_abnormal && "border-red-200 bg-red-50 dark:bg-red-950/20"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              {lab.test_name}
                              {lab.is_abnormal && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {lab.test_type} • {format(new Date(lab.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {lab.status}
                          </Badge>
                        </div>
                        {lab.result_text && (
                          <p className="text-sm mt-2 pt-2 border-t">{lab.result_text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imaging" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[400px]">
                {imagingResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Image className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No imaging results available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {imagingResults.map((img) => (
                      <div key={img.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{img.exam_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {img.modality} • {format(new Date(img.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {img.status}
                          </Badge>
                        </div>
                        {img.findings && (
                          <p className="text-sm mt-2 pt-2 border-t">{img.findings}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientProfileView;
