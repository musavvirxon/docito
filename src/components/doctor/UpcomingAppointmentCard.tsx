// src/components/doctor/UpcomingAppointmentCard.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, User, Phone, Mail, MapPin, FileText, Pill, Heart, Stethoscope, AlertCircle, ChevronRight, Activity, MessageSquare, Video, CalendarPlus, Trash2, DollarSign } from "lucide-react";
import { AppointmentFinancePanel } from "@/components/appointments/AppointmentFinancePanel";
import { PatientProfileView } from "@/components/appointments/PatientProfileView";

import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useMessageAction } from "@/hooks/useMessageAction";
import { toast } from "sonner";


interface Appointment {
  id: string;
  doctor_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  patient_id?: string | null;
  doctor_patient_id?: string | null;
  appointment_type?: string | null;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  patient_avatar?: string;
  patient_address?: string;
}

interface PatientDetails {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  address?: string;
  date_of_birth?: string;
  gender?: string;
  emergency_contact?: string;
  medical_history?: any;
  allergies?: string[];
  current_medications?: string[];
  blood_type?: string;
  height?: number;
  weight?: number;
}

interface MedicalRecord {
  id: string;
  record_type: string;
  title: string;
  description: string;
  date: string;
  doctor_name?: string;
  attachments?: string[];
}

interface Treatment {
  id: string;
  treatment_type: string;
  name: string;
  description: string;
  start_date: string;
  end_date?: string;
  status: string;
  notes?: string;
}

interface AppointmentHistory {
  id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  notes?: string;
}

interface AppointmentDiagnosis {
  id: string;
  diagnosis_title: string;
  icd10_code?: string | null;
  notes?: string | null;
  created_at: string;
}

interface DiagnosisTemplate {
  id: string;
  title: string;
  icd10_code?: string | null;
  description?: string | null;
}

export const UpcomingAppointmentCard = ({ appointments }: { appointments: Appointment[] }) => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startConversation } = useMessageAction();

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [profilePatient, setProfilePatient] = useState<{ id: string; type: 'registered' | 'direct' } | null>(null);
  const [appointmentAmountToBill, setAppointmentAmountToBill] = useState<number>(0);


  // Diagnoses
  const [dxLoading, setDxLoading] = useState(false);
  const [diagnosisTemplates, setDiagnosisTemplates] = useState<DiagnosisTemplate[]>([]);
  const [appointmentDiagnoses, setAppointmentDiagnoses] = useState<AppointmentDiagnosis[]>([]);
  const [dxTemplateId, setDxTemplateId] = useState<string>("__none__");
  const [dxCustomTitle, setDxCustomTitle] = useState("");
  const [dxCustomCode, setDxCustomCode] = useState("");
  const [dxNotes, setDxNotes] = useState("");

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || monthDiff === 0 && today.getDate() < birthDate.getDate()) {
      age--;
    }
    return age;
  };


  const loadDiagnosisData = async (appointment: Appointment) => {
    setDxLoading(true);
    try {
      // Fetch appointment diagnoses
      const { data: dxRows } = await (supabase as any)
        .from("appointment_diagnoses")
        .select("id, diagnosis_title, icd10_code, notes, created_at")
        .eq("appointment_id", appointment.id)
        .order("created_at", { ascending: false });

      setAppointmentDiagnoses((dxRows || []) as any);
      
      // Fetch procedure templates as diagnosis templates (fallback)
      const { data: templates } = await (supabase as any)
        .from("procedure_templates")
        .select("id, name, description, category")
        .eq("is_active", true)
        .order("name", { ascending: true });

      // Map procedure templates to diagnosis template format
      const mappedTemplates = (templates || []).map((t: any) => ({
        id: t.id,
        title: t.name,
        icd10_code: null,
        description: t.description
      }));
      setDiagnosisTemplates(mappedTemplates);
    } catch (error) {
      console.error("Error loading diagnosis data:", error);
      setAppointmentDiagnoses([]);
      setDiagnosisTemplates([]);
    } finally {
      setDxLoading(false);
    }
  };

  const addAppointmentDiagnosis = async () => {
    if (!selectedAppointment) return;
    if (!user?.id) return;

    try {
      const tpl = dxTemplateId !== "__none__" ? diagnosisTemplates.find((x) => x.id === dxTemplateId) : null;
      const diagnosis_title = tpl ? tpl.title : dxCustomTitle.trim();
      const icd10_code = tpl ? tpl.icd10_code : (dxCustomCode.trim() || null);

      if (!diagnosis_title) return;

      const payload: any = {
        appointment_id: selectedAppointment.id,
        doctor_id: selectedAppointment.doctor_id,
        patient_id: selectedAppointment.patient_id || null,
        doctor_patient_id: selectedAppointment.doctor_patient_id || null,
        diagnosis_template_id: tpl ? tpl.id : null,
        diagnosis_title,
        icd10_code,
        notes: dxNotes.trim() || null,
        created_by: user.id,
      };

      const { error } = await (supabase as any).from("appointment_diagnoses").insert(payload);
      if (error) throw error;

      setDxNotes("");
      setDxCustomTitle("");
      setDxCustomCode("");
      setDxTemplateId("__none__");

      await loadDiagnosisData(selectedAppointment);
    } catch (error) {
      console.error("Error adding diagnosis:", error);
    }
  };

  const deleteAppointmentDiagnosis = async (dxId: string) => {
    try {
      const { error } = await (supabase as any).from("appointment_diagnoses").delete().eq("id", dxId);
      if (error) throw error;
      if (selectedAppointment) await loadDiagnosisData(selectedAppointment);
    } catch (error) {
      console.error("Error deleting diagnosis:", error);
    }
  };

  const handleAppointmentClick = async (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
    const [{ data: charges }] = await Promise.all([
      supabase
        .from('billing_transactions')
        .select('amount, amount_cents, transaction_type')
        .eq('appointment_id', appointment.id),
      loadDiagnosisData(appointment),
    ]);
    const total = ((charges as any[]) || [])
      .filter((b) => !['discount', 'refund'].includes(String(b.transaction_type || '').toLowerCase()))
      .reduce((sum, b) => sum + (b.amount_cents != null ? Number(b.amount_cents) / 100 : Number(b.amount) || 0), 0);
    setAppointmentAmountToBill(total);
  };


  const handlePatientClick = () => {
    const appt = selectedAppointment;
    if (!appt) return;

    if (appt.patient_id) {
      setProfilePatient({ id: appt.patient_id, type: 'registered' });
      setShowAppointmentModal(false);
      setShowPatientModal(true);
      return;
    }

    if (appt.doctor_patient_id) {
      setProfilePatient({ id: appt.doctor_patient_id, type: 'direct' });
      setShowAppointmentModal(false);
      setShowPatientModal(true);
      return;
    }

    toast.error(
      t("doctor.patientDetails.noLinkedPatient", "No patient record is linked to this appointment.")
    );
  };

  const handlePatientModalChange = (open: boolean) => {
    setShowPatientModal(open);
    if (!open && selectedAppointment) {
      setShowAppointmentModal(true);
    }
  };



  const handleMessagePatient = async (patientId: string) => {
    setShowAppointmentModal(false);
    await startConversation(patientId);
  };

  const handleScheduleAppointment = async (_patientId: string) => {
    setShowAppointmentModal(false);
    navigate("/doctor/dashboard?section=calendar");
  };

  const handleVideoCall = async (_patientId: string) => {
    if (!selectedAppointment) return;
    setShowAppointmentModal(false);
    navigate(`/appointment-session/${selectedAppointment.id}?tab=video`);
  };


  if (!appointments || appointments.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">{t("doctor.upcomingAppointments.noAppointments", "No upcoming appointments")}</h3>
          <p className="text-muted-foreground text-sm">{t("doctor.upcomingAppointments.scheduleIsClear", "Your schedule is clear for now")}</p>
        </CardContent>
      </Card>
    );
  }

  const nextAppointment = appointments[0];

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {t("doctor.currentAppointment.title", "Current/Upcoming Appointment")}
            </span>
            <Badge variant={nextAppointment.status === "confirmed" ? "default" : "secondary"}>
              {t(`doctor.appointmentStatus.${nextAppointment.status}`, nextAppointment.status)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Appointment Info */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={nextAppointment.patient_avatar} />
                  <AvatarFallback>
                    {nextAppointment.patient_name?.split(' ').map(n => n[0]).join('') || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{nextAppointment.patient_name || t('doctor.patient.unnamed', 'Unnamed patient')}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(nextAppointment.appointment_date), "MMM dd, yyyy")} at {nextAppointment.start_time}
                    </span>
                    <span className="flex items-center gap-1">
                      <Stethoscope className="w-4 h-4" />
                      {nextAppointment.appointment_type === 'video' ? t("doctor.appointmentDetails.videoConsultation", "Video Consultation") : t("doctor.appointmentDetails.inPerson", "In-Person")}
                    </span>
                  </div>
                </div>
              </div>
              <Button onClick={() => handleAppointmentClick(nextAppointment)} className="bg-primary hover:bg-primary/90">
                {t("doctor.currentAppointment.viewDetails", "View Details")}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Notes */}
            {nextAppointment.notes && (
              <div className="p-3 bg-background/50 rounded-lg border">
                <p className="text-sm text-muted-foreground">{t("doctor.appointmentDetails.notes", "Notes")}</p>
                <p className="text-sm">{nextAppointment.notes}</p>
              </div>
            )}

            {/* Appointment Count */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{t("doctor.currentAppointment.upcomingCount", { count: appointments.length })}</span>
              <Button variant="ghost" size="sm" onClick={() => navigate("/doctor/dashboard?section=calendar")}>
                {t("doctor.currentAppointment.viewAll", "View All")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Details Modal */}
      <Dialog open={showAppointmentModal} onOpenChange={setShowAppointmentModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("doctor.appointmentDetails.title", "Appointment Details")}</DialogTitle>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-6">
              {/* Appointment Information */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("doctor.appointmentDetails.date", "Date")}</p>
                      <p className="font-medium">{format(new Date(selectedAppointment.appointment_date), "MMMM dd, yyyy")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("doctor.appointmentDetails.time", "Time")}</p>
                      <p className="font-medium">{selectedAppointment.start_time} - {selectedAppointment.end_time}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("doctor.appointmentDetails.type", "Type")}</p>
                      <p className="font-medium">
                        {selectedAppointment.appointment_type === 'video' 
                          ? t("doctor.appointmentDetails.videoConsultation", "Video Consultation")
                          : t("doctor.appointmentDetails.inPerson", "In-Person")
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("doctor.appointmentDetails.status", "Status")}</p>
                      <Badge variant={selectedAppointment.status === "confirmed" ? "default" : "secondary"}>
                        {t(`doctor.appointmentStatus.${selectedAppointment.status}`, selectedAppointment.status)}
                      </Badge>
                    </div>
                  </div>

                  {selectedAppointment.notes && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">{t("doctor.appointmentDetails.notes", "Notes")}</p>
                      <p className="mt-1">{selectedAppointment.notes}</p>
                    </div>
                  )}

                </CardContent>
              </Card>

              <AppointmentFinancePanel
                appointmentId={selectedAppointment.id}
                patientId={selectedAppointment.patient_id || null}
                patientName={selectedAppointment.patient_name || ""}
                appointmentDate={selectedAppointment.appointment_date}
              />

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedAppointment.patient_id && handleMessagePatient(selectedAppointment.patient_id)}
                  disabled={!selectedAppointment.patient_id}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t("doctor.appointmentDetails.message", "Message Patient")}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectedAppointment.patient_id && handleScheduleAppointment(selectedAppointment.patient_id)}
                  disabled={!selectedAppointment.patient_id}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  {t("doctor.appointmentDetails.schedule", "Schedule Follow-up")}
                </Button>
                
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => selectedAppointment.patient_id && handleVideoCall(selectedAppointment.patient_id)}
                  disabled={!selectedAppointment.patient_id}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Video className="w-4 h-4 mr-2" />
                  {t("doctor.appointmentDetails.videoCall", "Start Video Call")}
                </Button>
              </div>

              {/* Patient Info Card */}
              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={handlePatientClick}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={selectedAppointment.patient_avatar} />
                        <AvatarFallback>
                          {selectedAppointment.patient_name?.split(' ').map(n => n[0]).join('') || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{selectedAppointment.patient_name || t('doctor.patient.unnamed', 'Unnamed patient')}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {selectedAppointment.patient_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {selectedAppointment.patient_email}
                            </span>
                          )}
                          {selectedAppointment.patient_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {selectedAppointment.patient_phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-primary">
                      <span className="text-sm font-medium">{t("doctor.appointmentDetails.viewPatient", "View Patient Details")}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Diagnosis Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" />
                    {t("doctor.appointmentDetails.diagnosesTitle", "Diagnoses")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dxLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {appointmentDiagnoses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t("doctor.appointmentDetails.noDiagnoses", "No diagnoses added yet.")}
                        </p>
                      ) : (
                        appointmentDiagnoses.map((dx) => (
                          <div key={dx.id} className="p-3 border rounded-lg flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{dx.diagnosis_title}</p>
                                {dx.icd10_code ? <Badge variant="outline">{dx.icd10_code}</Badge> : null}
                              </div>
                              {dx.notes ? <p className="text-sm text-muted-foreground">{dx.notes}</p> : null}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteAppointmentDiagnosis(dx.id)}
                              className="shrink-0"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <div className="border-t pt-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">
                          {t("doctor.appointmentDetails.addDiagnosis", "Add diagnosis")}
                        </span>
                        <Select value={dxTemplateId} onValueChange={setDxTemplateId}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("doctor.appointmentDetails.selectDiagnosis", "Select from library or add custom") as any} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">{t("doctor.appointmentDetails.customDiagnosis", "Custom diagnosis")}</SelectItem>
                            {diagnosisTemplates.map((tpl) => (
                              <SelectItem key={tpl.id} value={tpl.id}>
                                {tpl.title}{tpl.icd10_code ? ` (${tpl.icd10_code})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {dxTemplateId === "__none__" ? (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">
                              {t("doctor.appointmentDetails.diagnosisName", "Diagnosis")}
                            </span>
                            <Input value={dxCustomTitle} onChange={(e) => setDxCustomTitle(e.target.value)} placeholder={t("doctor.appointmentDetails.diagnosisNamePlaceholder", "e.g. Hypertension") as any} />
                          </div>
                          <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">
                              {t("doctor.appointmentDetails.diagnosisCode", "ICD-10 (optional)")}
                            </span>
                            <Input value={dxCustomCode} onChange={(e) => setDxCustomCode(e.target.value)} placeholder={t("doctor.appointmentDetails.diagnosisCodePlaceholder", "e.g. I10") as any} />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">
                            {t("doctor.appointmentDetails.selectedDiagnosis", "Selected")}
                          </span>
                          <div className="p-3 border rounded-lg text-sm">
                            {(() => {
                              const tpl = diagnosisTemplates.find((x) => x.id === dxTemplateId);
                              if (!tpl) return t("doctor.appointmentDetails.loadingDiagnosis", "Loading...");
                              return (
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium">{tpl.title}</p>
                                    {tpl.icd10_code ? <Badge variant="outline">{tpl.icd10_code}</Badge> : null}
                                  </div>
                                  {tpl.description ? <p className="text-muted-foreground">{tpl.description}</p> : null}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-sm text-muted-foreground">
                        {t("doctor.appointmentDetails.diagnosisNotes", "Notes")}
                      </span>
                      <Textarea value={dxNotes} onChange={(e) => setDxNotes(e.target.value)} placeholder={t("doctor.appointmentDetails.diagnosisNotesPlaceholder", "Optional notes, rationale, plan...") as any} />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={addAppointmentDiagnosis}
                        disabled={dxTemplateId === "__none__" ? dxCustomTitle.trim().length === 0 : false}
                      >
                        {t("doctor.appointmentDetails.addDiagnosisBtn", "Add")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Patient Details Modal — full patient profile */}
      <Dialog open={showPatientModal} onOpenChange={handlePatientModalChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("doctor.patientDetails.title", "Patient Details")}</DialogTitle>
          </DialogHeader>

          {profilePatient && (
            <PatientProfileView
              patientId={profilePatient.id}
              patientType={profilePatient.type}
              compact
              onBack={() => handlePatientModalChange(false)}
            />
          )}
        </DialogContent>
      </Dialog>

    </>
  );
};
