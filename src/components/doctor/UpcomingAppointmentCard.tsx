import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Pill,
  Heart,
  Stethoscope,
  AlertCircle,
  ChevronRight,
  Activity,
  MessageSquare,
  Video,
  CalendarPlus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;

  appointment_type?: string | null;

  patient_id?: string | null;
  doctor_patient_id?: string | null;

  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  patient_avatar?: string;
}

interface PatientDetails {
  id?: string;
  user_id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  avatar_url?: string;
  address?: string;
  created_at?: string;
}

interface MedicalRecord {
  id: string;
  title: string;
  description?: string;
  record_type: string;
  record_date: string;
  doctor_name?: string;
  practice_name?: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  status: string;
  instructions?: string;
}

interface TreatmentPlan {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  estimated_cost?: number;
  created_at: string;
  procedures?: any[];
}

interface AppointmentHistory {
  id: string;
  appointment_date: string;
  start_time: string;
  status: string;
  notes?: string;
}

interface UpcomingAppointmentCardProps {
  appointments: Appointment[];
}

export const UpcomingAppointmentCard = ({ appointments }: UpcomingAppointmentCardProps) => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [appointmentHistory, setAppointmentHistory] = useState<AppointmentHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  const handleMessagePatient = (appointment: Appointment) => {
    if (!appointment.patient_id) {
      toast.error("Messaging is only available for registered patients.");
      return;
    }
    navigate(`/messages?recipient=${appointment.patient_id}`);
  };

  const handleScheduleAppointment = (appointment: Appointment) => {
    const pid = appointment.patient_id || "";
    navigate(`/doctor-dashboard?section=calendar${pid ? `&patient=${pid}` : ""}`);
  };

  const handleStartVideoOrAppointment = async (appointment: Appointment) => {
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-start-appointment", {
        body: { appointment_id: appointment.id },
      });

      if (error) throw error;

      if (data?.can_start) {
        const type = (appointment.appointment_type || "in_person").toString();

        if (type === "video") {
          const room = data?.consultation?.room_id || data?.consultation?.room_url;
          if (room) {
            toast.success("Starting video consultation…");
            navigate(`/video/${room}?join=true`);
            return;
          }
          toast.error("Video room not available for this appointment.");
          return;
        }

        toast.success("Appointment started.");
        return;
      }

      toast.success("Start request sent.");
    } catch (err: any) {
      console.error("Start failed:", err);
      toast.error(err?.message ?? "Failed to start appointment");
    } finally {
      setStarting(false);
    }
  };

  // Get the current or next upcoming appointment
  const now = new Date();
  const currentOrNextAppointment = appointments
    .filter((apt) => {
      const aptDate = new Date(`${apt.appointment_date}T${apt.start_time}`);
      return aptDate >= new Date(now.setHours(0, 0, 0, 0)) && (apt.status === "confirmed" || apt.status === "pending");
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.appointment_date}T${a.start_time}`);
      const dateB = new Date(`${b.appointment_date}T${b.start_time}`);
      return dateA.getTime() - dateB.getTime();
    })[0];

  const fetchPatientDetails = async (appointment: Appointment) => {
    setLoading(true);
    try {
      setPatientDetails(null);
      setMedicalRecords([]);
      setMedications([]);
      setTreatmentPlans([]);
      setAppointmentHistory([]);

      // Registered patient
      if (appointment.patient_id) {
        const patientId = appointment.patient_id;

        const { data: profileData, error: profileErr } = await supabase.from("profiles").select("*").eq("user_id", patientId).single();
        if (profileErr) console.warn("Profile fetch error:", profileErr);
        if (profileData) setPatientDetails(profileData as any);

        const { data: recordsData, error: recordsErr } = await supabase
          .from("medical_records")
          .select("*")
          .eq("patient_id", patientId)
          .order("record_date", { ascending: false });
        if (recordsErr) console.warn("Medical records fetch error:", recordsErr);
        setMedicalRecords((recordsData || []) as MedicalRecord[]);

        const { data: medsData, error: medsErr } = await supabase
          .from("medications")
          .select("*")
          .eq("patient_id", patientId)
          .order("start_date", { ascending: false });
        if (medsErr) console.warn("Medications fetch error:", medsErr);
        setMedications((medsData || []) as Medication[]);

        const { data: plansData, error: plansErr } = await supabase
          .from("treatment_plans")
          .select(
            `
            *,
            treatment_plan_procedures (
              id,
              procedure_name,
              estimated_cost,
              status
            )
          `,
          )
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false });
        if (plansErr) console.warn("Treatment plans fetch error:", plansErr);
        setTreatmentPlans(
          ((plansData || []) as any[]).map((plan) => ({
            ...plan,
            procedures: plan.treatment_plan_procedures || [],
          })) as TreatmentPlan[],
        );

        const { data: doctor } = await supabase.from("doctors").select("id").eq("user_id", user?.id).single();
        if (doctor) {
          const { data: historyData, error: historyErr } = await supabase
            .from("appointments")
            .select("id, appointment_date, start_time, status, notes")
            .eq("doctor_id", doctor.id)
            .eq("patient_id", patientId)
            .order("appointment_date", { ascending: false });
          if (historyErr) console.warn("Appointment history fetch error:", historyErr);
          setAppointmentHistory((historyData || []) as AppointmentHistory[]);
        }

        return;
      }

      // Direct (non-registered) patient: limited info
      if (appointment.doctor_patient_id) {
        const { data: dp, error: dpErr } = await supabase
          .from("doctor_patients")
          .select("id, full_name, email, phone, address, created_at")
          .eq("id", appointment.doctor_patient_id)
          .single();

        if (dpErr) console.warn("Doctor patient fetch error:", dpErr);

        if (dp) {
          setPatientDetails({
            id: dp.id,
            full_name: (dp as any).full_name,
            email: (dp as any).email,
            phone: (dp as any).phone,
            address: (dp as any).address,
            created_at: (dp as any).created_at,
          });
        }

        toast.message("Limited details", {
          description: "This patient is not registered. Only basic contact details are available.",
        });
      }
    } catch (error) {
      console.error("Error fetching patient details:", error);
      toast.error("Failed to load patient details");
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  const handlePatientClick = async () => {
    if (!selectedAppointment) return;
    await fetchPatientDetails(selectedAppointment);
    setShowPatientModal(true);
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "pending":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (!currentOrNextAppointment) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {t("doctor.currentAppointment.title", "Current/Upcoming Appointment")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">{t("doctor.currentAppointment.noAppointments", "No upcoming appointments")}</p>
            <p className="text-sm text-muted-foreground mt-1">{t("doctor.currentAppointment.scheduleEmpty", "Your schedule is clear")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              {t("doctor.currentAppointment.title", "Current/Upcoming Appointment")}
            </CardTitle>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {isToday(currentOrNextAppointment.appointment_date) ? t("doctor.currentAppointment.today", "Today") : t("doctor.currentAppointment.upcoming", "Upcoming")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{currentOrNextAppointment.patient_name || "Patient"}</h3>
                <p className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(currentOrNextAppointment.appointment_date), "EEEE, MMMM dd")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-primary">
                  {currentOrNextAppointment.start_time} - {currentOrNextAppointment.end_time}
                </p>
                <Badge className={getStatusColor(currentOrNextAppointment.status)}>{currentOrNextAppointment.status}</Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleAppointmentClick(currentOrNextAppointment)} className="flex-1">
                {t("doctor.currentAppointment.viewDetails", "View Details")}
              </Button>

              <Button
                size="sm"
                variant="default"
                onClick={() => handleStartVideoOrAppointment(currentOrNextAppointment)}
                disabled={starting}
                className="flex-1 gap-2"
              >
                <Video className="w-4 h-4" />
                {starting
                  ? t("doctor.currentAppointment.starting", "Starting…")
                  : (currentOrNextAppointment.appointment_type || "in_person") === "video"
                    ? t("doctor.appointmentDetails.videoCall", "Start Video Call")
                    : t("doctor.appointmentDetails.start", "Start Appointment")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Details Modal */}
      <Dialog open={showAppointmentModal} onOpenChange={setShowAppointmentModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {t("doctor.appointmentDetails.title", "Appointment Details")}
            </DialogTitle>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{t("doctor.appointmentDetails.date", "Date")}</span>
                  <p className="font-medium">{format(new Date(selectedAppointment.appointment_date), "EEEE, MMMM dd, yyyy")}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{t("doctor.appointmentDetails.time", "Time")}</span>
                  <p className="font-medium">
                    {selectedAppointment.start_time} - {selectedAppointment.end_time}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{t("doctor.appointmentDetails.status", "Status")}</span>
                  <Badge className={getStatusColor(selectedAppointment.status)}>{selectedAppointment.status}</Badge>
                </div>
                {selectedAppointment.notes && (
                  <div className="space-y-1 col-span-2">
                    <span className="text-sm text-muted-foreground">{t("doctor.appointmentDetails.notes", "Notes")}</span>
                    <p className="text-sm">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMessagePatient(selectedAppointment)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t("doctor.appointmentDetails.message", "Message Patient")}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScheduleAppointment(selectedAppointment)}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  {t("doctor.appointmentDetails.schedule", "Schedule Follow-up")}
                </Button>

                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleStartVideoOrAppointment(selectedAppointment)}
                  disabled={starting}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Video className="w-4 h-4 mr-2" />
                  {starting
                    ? t("doctor.currentAppointment.starting", "Starting…")
                    : (selectedAppointment.appointment_type || "in_person") === "video"
                      ? t("doctor.appointmentDetails.videoCall", "Start Video Call")
                      : t("doctor.appointmentDetails.start", "Start Appointment")}
                </Button>
              </div>

              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handlePatientClick}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={selectedAppointment.patient_avatar} />
                        <AvatarFallback>{selectedAppointment.patient_name?.split(" ").map((n) => n[0]).join("") || "P"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{selectedAppointment.patient_name || "Patient"}</h4>
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Patient Details Modal */}
      <Dialog open={showPatientModal} onOpenChange={setShowPatientModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={patientDetails?.avatar_url} />
                <AvatarFallback>{patientDetails?.full_name?.split(" ").map((n) => n[0]).join("") || "P"}</AvatarFallback>
              </Avatar>
              {patientDetails?.full_name || "Patient"}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">{t("doctor.patientDetails.overview", "Overview")}</TabsTrigger>
                <TabsTrigger value="medical">{t("doctor.patientDetails.medical", "Medical Records")}</TabsTrigger>
                <TabsTrigger value="medications">{t("doctor.patientDetails.medications", "Medications")}</TabsTrigger>
                <TabsTrigger value="treatments">{t("doctor.patientDetails.treatments", "Treatments")}</TabsTrigger>
                <TabsTrigger value="history">{t("doctor.patientDetails.history", "History")}</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {t("doctor.patientDetails.personalInfo", "Personal Information")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {patientDetails?.date_of_birth && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("doctor.patientDetails.age", "Age")}:</span>
                          <span>{calculateAge(patientDetails.date_of_birth)} years</span>
                        </div>
                      )}

                      {patientDetails?.gender && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("doctor.patientDetails.gender", "Gender")}:</span>
                          <span className="capitalize">{patientDetails.gender}</span>
                        </div>
                      )}

                      {patientDetails?.email && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {t("doctor.patientDetails.email", "Email")}:
                          </span>
                          <span>{patientDetails.email}</span>
                        </div>
                      )}

                      {patientDetails?.phone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {t("doctor.patientDetails.phone", "Phone")}:
                          </span>
                          <span>{patientDetails.phone}</span>
                        </div>
                      )}

                      {patientDetails?.address && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {t("doctor.patientDetails.address", "Address")}:
                          </span>
                          <span className="text-right">{patientDetails.address}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        {t("doctor.patientDetails.healthSummary", "Health Summary")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-sm">{medicalRecords.length} Records</p>
                          <p className="text-xs text-muted-foreground">Medical history items</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Pill className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-sm">{medications.length} Medications</p>
                          <p className="text-xs text-muted-foreground">Active and past</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Stethoscope className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-sm">{treatmentPlans.length} Treatment Plans</p>
                          <p className="text-xs text-muted-foreground">Current and archived</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="medical" className="space-y-4">
                {medicalRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">{t("doctor.patientDetails.noRecords", "No medical records found")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {medicalRecords.map((record) => (
                      <Card key={record.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">{record.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(record.record_date), "MMM dd, yyyy")} • {record.record_type}
                              </p>
                              {record.description && <p className="text-sm mt-2">{record.description}</p>}
                            </div>
                            <Badge variant="outline">{record.record_type}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="medications" className="space-y-4">
                {medications.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">{t("doctor.patientDetails.noMedications", "No medications found")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {medications.map((med) => (
                      <Card key={med.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">{med.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {med.dosage} • {med.frequency}
                              </p>
                              {med.instructions && <p className="text-sm mt-2">{med.instructions}</p>}
                              <p className="text-xs text-muted-foreground mt-2">
                                Started: {format(new Date(med.start_date), "MMM dd, yyyy")}
                                {med.end_date ? ` • Ended: ${format(new Date(med.end_date), "MMM dd, yyyy")}` : ""}
                              </p>
                            </div>
                            <Badge variant={med.status === "active" ? "default" : "secondary"}>{med.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="treatments" className="space-y-4">
                {treatmentPlans.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">{t("doctor.patientDetails.noTreatments", "No treatment plans found")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {treatmentPlans.map((plan) => (
                      <Card key={plan.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">{plan.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                Status: {plan.status} • Priority: {plan.priority}
                              </p>
                              {plan.description && <p className="text-sm mt-2">{plan.description}</p>}
                              {plan.procedures && plan.procedures.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-sm font-medium mb-2">Procedures:</p>
                                  <div className="space-y-1">
                                    {plan.procedures.map((proc: any) => (
                                      <div key={proc.id} className="flex justify-between text-sm">
                                        <span>{proc.procedure_name}</span>
                                        <span className="text-muted-foreground">{proc.status}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <Badge variant="outline">{plan.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                {appointmentHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">{t("doctor.patientDetails.noHistory", "No appointment history found")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointmentHistory.map((apt) => (
                      <Card key={apt.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">{format(new Date(apt.appointment_date), "MMM dd, yyyy")}</h4>
                              <p className="text-sm text-muted-foreground">{apt.start_time}</p>
                              {apt.notes && <p className="text-sm mt-2">{apt.notes}</p>}
                            </div>
                            <Badge className={getStatusColor(apt.status)}>{apt.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
