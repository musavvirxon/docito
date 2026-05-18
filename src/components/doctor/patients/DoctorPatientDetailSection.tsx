import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, FileText, 
  Edit, Trash2, Download, Clock, DollarSign, Pill, AlertTriangle,
  Plus, Heart, Loader2
} from "lucide-react";
import { useDoctorPatientsV2, DoctorPatient } from "@/hooks/useDoctorPatientsV2";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { generateDoctorPatientPDF } from "./PatientSummaryPDF";
import { PatientPaymentsList } from "@/components/PatientPaymentsList";
import { toast } from "sonner";

interface DoctorPatientDetailSectionProps {
  patientId: string;
  onBack: () => void;
}

const DoctorPatientDetailSection = ({ patientId, onBack }: DoctorPatientDetailSectionProps) => {
  const { user } = useAuth();
  const { getPatientById, deletePatient } = useDoctorPatientsV2();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<DoctorPatient | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [appointmentIds, setAppointmentIds] = useState<string[]>([]);

  // Fetch doctor ID
  useEffect(() => {
    const fetchDoctorId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (data) setDoctorId(data.id);
    };
    fetchDoctorId();
  }, [user]);

  useEffect(() => {
    const loadPatient = async () => {
      setLoading(true);
      const data = await getPatientById(patientId);
      setPatient(data);
      setLoading(false);
    };
    loadPatient();
  }, [patientId, getPatientById]);

  // Load appointment ids for this doctor_patient so we can scope payments to them.
  useEffect(() => {
    const loadAppts = async () => {
      const { data } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_patient_id', patientId);
      setAppointmentIds((data || []).map((r: any) => r.id));
    };
    loadAppts();
  }, [patientId]);

  const handleDelete = async () => {
    if (!patient) return;
    if (!confirm("Are you sure you want to delete this patient? This action cannot be undone.")) {
      return;
    }
    const result = await deletePatient(patient.id);
    if (result.success) {
      onBack();
    }
  };

  const handleDownloadPDF = async () => {
    if (!patient || !doctorId) return;
    setDownloadingPDF(true);
    try {
      await generateDoctorPatientPDF(patient.id, doctorId);
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
              <AvatarImage src={patient.profile_photo_url || undefined} />
              <AvatarFallback className="text-2xl">
                {patient.full_name?.split(" ").map((n) => n[0]).join("") || "P"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">{patient.full_name}</h2>
                <Badge 
                  variant={patient.status === "active" ? "default" : "secondary"}
                  className={patient.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}
                >
                  {patient.status}
                </Badge>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                {patient.age !== undefined && <span>{patient.age} years old</span>}
                {patient.gender && <span className="capitalize">• {patient.gender}</span>}
                {patient.date_of_birth && (
                  <span>• DOB: {new Date(patient.date_of_birth).toLocaleDateString()}</span>
                )}
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" /> {patient.phone}
                </span>
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
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registration Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {patient.registration_date ? new Date(patient.registration_date).toLocaleDateString() : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Contact</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">
              {patient.emergency_contact_name || "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {patient.emergency_contact_phone || ""}
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patient ID</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono truncate">{patient.id}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="medical" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="medical">Medical Info</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        {/* Medical Info Tab */}
        <TabsContent value="medical" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Allergies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.allergies ? (
                  <p className="text-sm whitespace-pre-wrap">{patient.allergies}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No allergies recorded</p>
                )}
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
                {patient.current_medications ? (
                  <p className="text-sm whitespace-pre-wrap">{patient.current_medications}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No medications recorded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  Medical History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.medical_history ? (
                  <p className="text-sm whitespace-pre-wrap">{patient.medical_history}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No medical history recorded</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Dental History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.dental_history ? (
                  <p className="text-sm whitespace-pre-wrap">{patient.dental_history}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No dental history recorded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.notes ? (
                <p className="text-sm whitespace-pre-wrap">{patient.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No notes recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <PatientPaymentsList
            doctorId={doctorId}
            appointmentIds={appointmentIds}
            title="Payments for this patient"
            emptyText="No payments recorded for this patient yet."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DoctorPatientDetailSection;
