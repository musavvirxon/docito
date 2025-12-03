import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, User, Phone, Mail, MapPin, FileText, Pill, Heart, Stethoscope, AlertCircle, ChevronRight, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  patient_id: string;
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
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [appointmentHistory, setAppointmentHistory] = useState<AppointmentHistory[]>([]);
  const [loading, setLoading] = useState(false);

  // Get the current or next upcoming appointment
  const now = new Date();
  const currentOrNextAppointment = appointments
    .filter(apt => {
      const aptDate = new Date(`${apt.appointment_date}T${apt.start_time}`);
      return aptDate >= new Date(now.setHours(0, 0, 0, 0)) && (apt.status === 'confirmed' || apt.status === 'pending');
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.appointment_date}T${a.start_time}`);
      const dateB = new Date(`${b.appointment_date}T${b.start_time}`);
      return dateA.getTime() - dateB.getTime();
    })[0];

  const fetchPatientDetails = async (patientId: string) => {
    setLoading(true);
    try {
      // Fetch patient profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', patientId)
        .single();

      if (profileData) {
        setPatientDetails(profileData as PatientDetails);
      }

      // Fetch medical records
      const { data: recordsData } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('record_date', { ascending: false });

      setMedicalRecords((recordsData || []) as MedicalRecord[]);

      // Fetch medications
      const { data: medsData } = await supabase
        .from('medications')
        .select('*')
        .eq('patient_id', patientId)
        .order('start_date', { ascending: false });

      setMedications((medsData || []) as Medication[]);

      // Fetch treatment plans
      const { data: plansData } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          treatment_plan_procedures (
            id,
            procedure_name,
            estimated_cost,
            status
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      setTreatmentPlans((plansData || []).map(plan => ({
        ...plan,
        procedures: plan.treatment_plan_procedures || []
      })) as TreatmentPlan[]);

      // Fetch appointment history
      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (doctor) {
        const { data: historyData } = await supabase
          .from('appointments')
          .select('id, appointment_date, start_time, status, notes')
          .eq('doctor_id', doctor.id)
          .eq('patient_id', patientId)
          .order('appointment_date', { ascending: false });

        setAppointmentHistory((historyData || []) as AppointmentHistory[]);
      }
    } catch (error) {
      console.error('Error fetching patient details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  const handlePatientClick = async () => {
    if (selectedAppointment?.patient_id) {
      await fetchPatientDetails(selectedAppointment.patient_id);
      setShowPatientModal(true);
    }
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
                      {patientDetails?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{patientDetails.phone}</span>
                        </div>
                      )}
                      {patientDetails?.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{patientDetails.email}</span>
                        </div>
                      )}
                      {patientDetails?.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <span>{patientDetails.address}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Stethoscope className="w-4 h-4" />
                        {t("doctor.patientDetails.summary", "Medical Summary")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("doctor.patientDetails.totalVisits", "Total Visits")}:</span>
                        <span>{appointmentHistory.filter(a => a.status === 'completed').length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("doctor.patientDetails.activeMeds", "Active Medications")}:</span>
                        <span>{medications.filter(m => m.status === 'active').length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("doctor.patientDetails.treatmentPlans", "Treatment Plans")}:</span>
                        <span>{treatmentPlans.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("doctor.patientDetails.medicalRecords", "Medical Records")}:</span>
                        <span>{medicalRecords.length}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="medical" className="space-y-4">
                {medicalRecords.length > 0 ? (
                  <div className="space-y-3">
                    {medicalRecords.map((record) => (
                      <Card key={record.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{record.title}</h4>
                                <Badge variant="outline" className="text-xs">{record.record_type}</Badge>
                              </div>
                              {record.description && (
                                <p className="text-sm text-muted-foreground">{record.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>{format(new Date(record.record_date), 'MMM dd, yyyy')}</span>
                                {record.doctor_name && <span>Dr. {record.doctor_name}</span>}
                                {record.practice_name && <span>{record.practice_name}</span>}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3" />
                    <p>{t("doctor.patientDetails.noRecords", "No medical records found")}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="medications" className="space-y-4">
                {medications.length > 0 ? (
                  <div className="space-y-3">
                    {medications.map((med) => (
                      <Card key={med.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Pill className="w-4 h-4 text-primary" />
                                <h4 className="font-medium">{med.name}</h4>
                                <Badge variant={med.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                  {med.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {med.dosage} - {med.frequency}
                              </p>
                              {med.instructions && (
                                <p className="text-sm text-muted-foreground mt-1">{med.instructions}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>Started: {format(new Date(med.start_date), 'MMM dd, yyyy')}</span>
                                {med.end_date && <span>Until: {format(new Date(med.end_date), 'MMM dd, yyyy')}</span>}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Pill className="w-12 h-12 mx-auto mb-3" />
                    <p>{t("doctor.patientDetails.noMedications", "No medications found")}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="treatments" className="space-y-4">
                {treatmentPlans.length > 0 ? (
                  <div className="space-y-3">
                    {treatmentPlans.map((plan) => (
                      <Card key={plan.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <Heart className="w-4 h-4 text-primary" />
                                <h4 className="font-medium">{plan.title}</h4>
                              </div>
                              {plan.description && (
                                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                                {plan.status}
                              </Badge>
                              <Badge variant="outline">{plan.priority}</Badge>
                            </div>
                          </div>
                          {plan.procedures && plan.procedures.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs text-muted-foreground mb-2">{t("doctor.patientDetails.procedures", "Procedures")}:</p>
                              <div className="flex flex-wrap gap-2">
                                {plan.procedures.map((proc: any) => (
                                  <Badge key={proc.id} variant="outline" className="text-xs">
                                    {proc.procedure_name}
                                    {proc.estimated_cost && ` - $${proc.estimated_cost}`}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                            <span>Created: {format(new Date(plan.created_at), 'MMM dd, yyyy')}</span>
                            {plan.estimated_cost && (
                              <span className="font-medium text-foreground">
                                Total: ${plan.estimated_cost.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="w-12 h-12 mx-auto mb-3" />
                    <p>{t("doctor.patientDetails.noTreatments", "No treatment plans found")}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                {appointmentHistory.length > 0 ? (
                  <div className="space-y-3">
                    {appointmentHistory.map((apt) => (
                      <Card key={apt.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                apt.status === 'completed' ? 'bg-green-500' :
                                apt.status === 'cancelled' ? 'bg-red-500' :
                                apt.status === 'confirmed' ? 'bg-blue-500' : 'bg-yellow-500'
                              }`} />
                              <div>
                                <p className="font-medium">
                                  {format(new Date(apt.appointment_date), 'EEEE, MMMM dd, yyyy')}
                                </p>
                                <p className="text-sm text-muted-foreground">{apt.start_time}</p>
                              </div>
                            </div>
                            <Badge className={getStatusColor(apt.status)}>{apt.status}</Badge>
                          </div>
                          {apt.notes && (
                            <p className="text-sm text-muted-foreground mt-2 pl-5">{apt.notes}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-3" />
                    <p>{t("doctor.patientDetails.noHistory", "No appointment history found")}</p>
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

export default UpcomingAppointmentCard;
