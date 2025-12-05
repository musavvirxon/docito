import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, FileText, 
  Edit, Trash2, Download, Clock, DollarSign, Pill, AlertTriangle,
  Plus, Eye, Paperclip, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateProfilePatientPDF } from "./PatientSummaryPDF";
import { toast } from "sonner";

interface PatientDetailSectionProps {
  patientId: string;
  onBack: () => void;
}

interface PatientData {
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

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
}

interface MedicalRecord {
  id: string;
  title: string;
  description?: string;
  record_type: string;
  record_date: string;
  created_at: string;
}

interface TreatmentPlan {
  id: string;
  title: string;
  description?: string;
  status: string;
  start_date?: string;
  estimated_completion_date?: string;
  total_cost?: number;
  progress?: number;
}

const PatientDetailSection = ({ patientId, onBack }: PatientDetailSectionProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalVisits: 0,
    lastVisit: null as string | null,
    nextAppointment: null as string | null,
    outstandingBalance: 0,
  });

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPatientData = async () => {
    if (!user || !patientId) return;

    try {
      setLoading(true);

      // Get doctor ID
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!doctorData) return;
      setDoctorId(doctorData.id);

      // Fetch patient profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", patientId)
        .single();

      if (profileError) throw profileError;
      setPatient(profileData);

      // Fetch appointments
      const { data: appointmentData } = await supabase
        .from("appointments")
        .select("*")
        .eq("doctor_id", doctorData.id)
        .eq("patient_id", patientId)
        .order("appointment_date", { ascending: false });

      setAppointments(appointmentData || []);

      // Calculate stats
      const completedVisits = appointmentData?.filter((a) => a.status === "completed") || [];
      const upcomingApt = appointmentData?.find(
        (a) => a.status === "confirmed" && new Date(a.appointment_date) >= new Date()
      );

      setStats({
        totalVisits: completedVisits.length,
        lastVisit: completedVisits[0]?.appointment_date || null,
        nextAppointment: upcomingApt?.appointment_date || null,
        outstandingBalance: 0, // TODO: Fetch from payments table
      });

      // Fetch medical records
      const { data: recordsData } = await supabase
        .from("medical_records")
        .select("*")
        .eq("patient_id", patientId)
        .order("record_date", { ascending: false });

      setMedicalRecords(recordsData || []);

      // Fetch treatment plans
      const { data: plansData } = await supabase
        .from("treatment_plans")
        .select("*")
        .eq("patient_id", patientId)
        .eq("doctor_id", doctorData.id)
        .order("created_at", { ascending: false });

      setTreatmentPlans(plansData || []);
    } catch (err: any) {
      console.error("Error fetching patient data:", err);
      toast.error("Failed to load patient data");
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleDownloadPDF = async () => {
    if (!patient || !doctorId) return;
    setDownloadingPDF(true);
    try {
      await generateProfilePatientPDF(patient.user_id, doctorId);
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Patient not found</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patients
        </Button>
      </div>
    );
  }

  const age = calculateAge(patient.date_of_birth || "");

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Patients
      </Button>

      {/* Patient Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-24 w-24 mx-auto md:mx-0">
              <AvatarImage src={patient.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {patient.full_name?.split(" ").map((n) => n[0]).join("") || "P"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">{patient.full_name}</h2>
                <Badge variant="outline" className="w-fit mx-auto md:mx-0">
                  ID: {patient.user_id.slice(0, 8)}
                </Badge>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                {age && <span>{age} years old</span>}
                {patient.gender && <span className="capitalize">• {patient.gender}</span>}
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3 text-sm">
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" /> {patient.phone}
                  </span>
                )}
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" /> {patient.email}
                  </span>
                )}
              </div>
              {patient.address && (
                <p className="flex items-center justify-center md:justify-start gap-1 mt-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" /> {patient.address}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 items-center md:items-end">
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit Patient
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
              >
                {downloadingPDF ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download Summary (PDF)
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medical Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Visit</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString() : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Appointment</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.nextAppointment ? new Date(stats.nextAppointment).toLocaleDateString() : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.outstandingBalance.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="visits" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visits">Visits</TabsTrigger>
          <TabsTrigger value="records">Medical Records</TabsTrigger>
          <TabsTrigger value="treatment">Treatment Plans</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Visits Tab */}
        <TabsContent value="visits" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Appointment History</h3>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">No appointments yet</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    appointments.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell>{new Date(apt.appointment_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {apt.start_time} - {apt.end_time}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              apt.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : apt.status === "confirmed"
                                ? "bg-blue-100 text-blue-700"
                                : apt.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }
                          >
                            {apt.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {apt.notes || "—"}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Medical Records</h3>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Record
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Allergies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">No allergies recorded</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Pill className="w-4 h-4 text-blue-500" />
                  Current Medications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">No medications recorded</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Records History</CardTitle>
            </CardHeader>
            <CardContent>
              {medicalRecords.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No medical records found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {medicalRecords.map((record) => (
                    <div
                      key={record.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{record.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(record.record_date).toLocaleDateString()} • {record.record_type}
                          </p>
                        </div>
                        <Badge variant="outline">{record.record_type}</Badge>
                      </div>
                      {record.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{record.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Treatment Plans Tab */}
        <TabsContent value="treatment" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Treatment Plans</h3>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Plan
            </Button>
          </div>
          {treatmentPlans.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No treatment plans yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {treatmentPlans.map((plan) => (
                <Card key={plan.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{plan.title}</h4>
                        {plan.start_date && (
                          <p className="text-sm text-muted-foreground">
                            Started: {new Date(plan.start_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={plan.status === "completed" ? "default" : "outline"}
                        className={
                          plan.status === "active"
                            ? "bg-blue-100 text-blue-700"
                            : plan.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : ""
                        }
                      >
                        {plan.status}
                      </Badge>
                    </div>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                    )}
                    {plan.status === "active" && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{plan.progress || 0}%</span>
                        </div>
                        <Progress value={plan.progress || 0} className="h-2" />
                      </div>
                    )}
                    {plan.total_cost !== undefined && plan.total_cost > 0 && (
                      <p className="mt-2 text-sm font-medium">
                        Total Cost: ${plan.total_cost.toFixed(2)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Billing & Invoices</h3>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No billing records found</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PatientDetailSection;
