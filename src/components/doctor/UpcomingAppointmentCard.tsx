import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, User, Phone, Mail, MapPin, FileText, Pill, Heart, Stethoscope, AlertCircle, ChevronRight, Activity, MessageSquare, Video, CalendarPlus } from "lucide-react";
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
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  avatar_url?: string;
  address?: string;
  created_at: string;
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
}

export const UpcomingAppointmentCard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [loadingPatientData, setLoadingPatientData] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  // Get upcoming appointments from context/hook
  // This component is used inside DoctorDashboard where appointments are provided
  const upcomingAppointments = (window as any).__doctorUpcomingAppointments as Appointment[] || [];

  const fetchPatientDetails = async (patientId: string) => {
    setLoadingPatientData(true);
    try {
      // Fetch patient profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', patientId)
        .single();

      if (profileData) {
        setPatientDetails(profileData);
      }

      // Fetch medical records
      const { data: recordsData } = await supabase
        .from('medical_records')
        .select(`
          id,
          title,
          description,
          record_type,
          record_date,
          doctors:doctor_id (
            profiles:user_id (
              full_name
            )
          ),
          practices:practice_id (
            name
          )
        `)
        .eq('patient_id', patientId)
        .order('record_date', { ascending: false })
        .limit(10);

      if (recordsData) {
        const formattedRecords = recordsData.map((record: any) => ({
          id: record.id,
          title: record.title,
          description: record.description,
          record_type: record.record_type,
          record_date: record.record_date,
          doctor_name: record.doctors?.profiles?.full_name,
          practice_name: record.practices?.name,
        }));
        setMedicalRecords(formattedRecords);
      }

      // Fetch medications
      const { data: medsData } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(10);

      if (medsData) {
        setMedications(medsData);
      }

      // Fetch treatment plans
      const { data: plansData } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (plansData) {
        setTreatmentPlans(plansData);
      }

    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setLoadingPatientData(false);
    }
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

const requireRegisteredPatient = (appointment: Appointment) => {
    const pid = appointment.patient_id;
    if (!pid) {
      toast.error(
        t(
          "doctor.messaging.unavailableDirectPatient",
          "Messaging is only available for registered patients."
        )
      );
      return null;
    }
    return pid;
  };

  const handleMessagePatient = (appointment: Appointment) => {
    const pid = requireRegisteredPatient(appointment);
    if (!pid) return;
    navigate(`/messages?recipient=${pid}`);
  };

  const handleScheduleAppointment = (appointment: Appointment) => {
    const patientParam = appointment.patient_id ? `&patient=${appointment.patient_id}` : "";
    navigate(`/doctor-dashboard?section=calendar${patientParam}`);
  };

  const requestStartAppointment = async (appointment: Appointment) => {
    try {
      const { data, error } = await supabase.functions.invoke("request-start-appointment", {
        body: { appointment_id: appointment.id },
      });
      if (error) throw error;
      return data as any;
    } catch (e: any) {
      console.error("request-start-appointment failed", e);
      toast.error(e?.message || "Failed to start appointment");
      return null;
    }
  };

  const handleStartAppointment = async (appointment: Appointment) => {
    const res = await requestStartAppointment(appointment);
    if (!res) return;

    if (!res.ok) {
      toast.error(res.error || "Failed to start appointment");
      return;
    }

    const apptType =
      res.appointment?.appointment_type || appointment.appointment_type || "in_person";

    if (res.can_start) {
      toast.success(
        apptType === "video"
          ? t("doctor.appointmentDetails.videoReady", "Video consultation is ready.")
          : t("doctor.appointmentDetails.started", "Appointment started.")
      );

      if (apptType === "video" && res.consultation?.room_url) {
        navigate(`/video/${res.consultation.room_url}?join=true`);
      }
      return;
    }

    if (apptType === "video") {
      toast.info(
        t(
          "doctor.appointmentDetails.waitingPatient",
          "Waiting for patient to confirm and request start."
        )
      );
    } else {
      toast.info(
        t(
          "doctor.appointmentDetails.startRequested",
          "Start request sent. Waiting for the other party."
        )
      );
    }
  };

  const handlePatientClick = async () => {
    if (!selectedAppointment) return;
    if (!selectedAppointment.patient_id) {
      toast.error(
        t(
          "doctor.patientDetails.unavailableDirectPatient",
          "Patient details are only available for registered patients."
        )
      );
      return;
    }
    await fetchPatientDetails(selectedAppointment.patient_id);
    setShowPatientModal(true);
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || monthDiff === 0 && today.getDate() < birthDate.getDate()) {
      age--;
    }
    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Get the current or next upcoming appointment
  const currentOrNextAppointment = upcomingAppointments.length > 0 
    ? upcomingAppointments[0] 
    : null;

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
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10"
        onClick={() => handleAppointmentClick(currentOrNextAppointment)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {isToday(currentOrNextAppointment.appointment_date) 
                ? t("doctor.currentAppointment.today", "Today's Appointment")
                : t("doctor.currentAppointment.upcoming", "Next Appointment")}
            </CardTitle>
            <Badge className={getStatusColor(currentOrNextAppointment.status)}>
              {currentOrNextAppointment.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={currentOrNextAppointment.patient_avatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {currentOrNextAppointment.patient_name?.split(' ').map(n => n[0]).join('') || 'P'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{currentOrNextAppointment.patient_name || 'Patient'}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(currentOrNextAppointment.appointment_date), 'MMM dd, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {currentOrNextAppointment.start_time} - {currentOrNextAppointment.end_time}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMessagePatient(currentOrNextAppointment);
                }}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {t("doctor.currentAppointment.message", "Message")}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleScheduleAppointment(currentOrNextAppointment);
                }}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <CalendarPlus className="w-4 h-4 mr-2" />
                {t("doctor.currentAppointment.followUp", "Follow-up")}
              </Button>

              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartAppointment(currentOrNextAppointment);
                }}
              >
                {(currentOrNextAppointment.appointment_type || "in_person") === "video" ? (
                  <Video className="w-4 h-4 mr-2" />
                ) : (
                  <Stethoscope className="w-4 h-4 mr-2" />
                )}
                {(currentOrNextAppointment.appointment_type || "in_person") === "video"
                  ? t("doctor.currentAppointment.startVideo", "Start Video")
                  : t("doctor.currentAppointment.start", "Start")}
              </Button>
            </div>

            <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
              {/* Appointment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{t("doctor.appointmentDetails.date", "Date")}</span>
                  <p className="font-medium">{format(new Date(selectedAppointment.appointment_date), 'EEEE, MMMM dd, yyyy')}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{t("doctor.appointmentDetails.time", "Time")}</span>
                  <p className="font-medium">{selectedAppointment.start_time} - {selectedAppointment.end_time}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">{t("doctor.appointmentDetails.status", "Status")}</span>
                  <Badge className={getStatusColor(selectedAppointment.status)}>
                    {selectedAppointment.status}
                  </Badge>
                </div>
                {selectedAppointment.notes && (
                  <div className="space-y-1 col-span-2">
                    <span className="text-sm text-muted-foreground">{t("doctor.appointmentDetails.notes", "Notes")}</span>
                    <p className="text-sm">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>

              {/* Quick Action Buttons */}
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
                  onClick={() => handleStartAppointment(selectedAppointment)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {(selectedAppointment.appointment_type || "in_person") === "video" ? (
                    <Video className="w-4 h-4 mr-2" />
                  ) : (
                    <Stethoscope className="w-4 h-4 mr-2" />
                  )}
                  {(selectedAppointment.appointment_type || "in_person") === "video"
                    ? t("doctor.appointmentDetails.startVideo", "Start Video Consultation")
                    : t("doctor.appointmentDetails.startAppointment", "Start Appointment")}
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
                        <h4 className="font-semibold">{selectedAppointment.patient_name || 'Patient'}</h4>
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
                <AvatarFallback>
                  {patientDetails?.full_name?.split(' ').map(n => n[0]).join('') || 'P'}
                </AvatarFallback>
              </Avatar>
              {patientDetails?.full_name || 'Patient'}
            </DialogTitle>
          </DialogHeader>

          {loadingPatientData ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">{t("doctor.patientDetails.loading", "Loading patient information...")}</p>
              </div>
            </div>
          ) : patientDetails ? (
            <div className="space-y-6">
              {/* Patient Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    {t("doctor.patientDetails.basicInfo", "Basic Information")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{patientDetails.email}</span>
                      </div>
                      {patientDetails.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{patientDetails.phone}</span>
                        </div>
                      )}
                      {patientDetails.address && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{patientDetails.address}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {patientDetails.date_of_birth && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {format(new Date(patientDetails.date_of_birth), 'MMM dd, yyyy')}
                            {calculateAge(patientDetails.date_of_birth) && (
                              <span className="text-muted-foreground ml-2">
                                ({calculateAge(patientDetails.date_of_birth)} years)
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      {patientDetails.gender && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{patientDetails.gender}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {t("doctor.patientDetails.memberSince", "Member since")} {format(new Date(patientDetails.created_at), 'MMM yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs for Medical Info */}
              <Tabs defaultValue="records" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="records" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {t("doctor.patientDetails.medicalRecords", "Records")}
                  </TabsTrigger>
                  <TabsTrigger value="medications" className="flex items-center gap-2">
                    <Pill className="w-4 h-4" />
                    {t("doctor.patientDetails.medications", "Medications")}
                  </TabsTrigger>
                  <TabsTrigger value="treatment" className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    {t("doctor.patientDetails.treatmentPlans", "Treatment")}
                  </TabsTrigger>
                </TabsList>

                {/* Medical Records Tab */}
                <TabsContent value="records" className="space-y-4">
                  {medicalRecords.length > 0 ? (
                    medicalRecords.map(record => (
                      <Card key={record.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-semibold">{record.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {record.record_type} • {format(new Date(record.record_date), 'MMM dd, yyyy')}
                              </p>
                              {record.description && (
                                <p className="text-sm mt-2">{record.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                {record.doctor_name && (
                                  <span>{t("doctor.patientDetails.by", "By")} {record.doctor_name}</span>
                                )}
                                {record.practice_name && (
                                  <span>{record.practice_name}</span>
                                )}
                              </div>
                            </div>
                            <FileText className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">{t("doctor.patientDetails.noRecords", "No medical records found")}</p>
                    </div>
                  )}
                </TabsContent>

                {/* Medications Tab */}
                <TabsContent value="medications" className="space-y-4">
                  {medications.length > 0 ? (
                    medications.map(med => (
                      <Card key={med.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-semibold">{med.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {med.dosage} • {med.frequency}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(med.start_date), 'MMM dd, yyyy')}
                                {med.end_date && ` - ${format(new Date(med.end_date), 'MMM dd, yyyy')}`}
                              </p>
                              {med.instructions && (
                                <p className="text-sm mt-2">{med.instructions}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {med.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Pill className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">{t("doctor.patientDetails.noMedications", "No active medications")}</p>
                    </div>
                  )}
                </TabsContent>

                {/* Treatment Plans Tab */}
                <TabsContent value="treatment" className="space-y-4">
                  {treatmentPlans.length > 0 ? (
                    treatmentPlans.map(plan => (
                      <Card key={plan.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-semibold">{plan.title}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="capitalize">
                                  {plan.status}
                                </Badge>
                                <Badge variant="secondary" className="capitalize">
                                  {plan.priority}
                                </Badge>
                                {plan.estimated_cost && (
                                  <span className="text-sm font-medium">
                                    ${plan.estimated_cost}
                                  </span>
                                )}
                              </div>
                              {plan.description && (
                                <p className="text-sm mt-2">{plan.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                {t("doctor.patientDetails.created", "Created")} {format(new Date(plan.created_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                            <Stethoscope className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">{t("doctor.patientDetails.noTreatmentPlans", "No treatment plans")}</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">{t("doctor.patientDetails.noPatientData", "Unable to load patient information")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UpcomingAppointmentCard;
