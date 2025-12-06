import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { User, LayoutDashboard, Calendar, History, Pill, FolderOpen, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import PatientDashboardHeader from "./PatientDashboardHeader";
import QuickOverviewCards from "./QuickOverviewCards";
import OverviewTab from "./tabs/OverviewTab";
import ProfileTab from "./tabs/ProfileTab";
import AppointmentsTab from "./tabs/AppointmentsTab";
import HistoryTab from "./tabs/HistoryTab";
import PrescriptionsTab from "./tabs/PrescriptionsTab";
import FilesTab from "./tabs/FilesTab";
import NotesTab from "./tabs/NotesTab";

interface PatientDashboardViewProps {
  patientId: string;
  patientType: "appointment" | "direct";
  onBack: () => void;
}

const PatientDashboardView = ({ patientId, patientType, onBack }: PatientDashboardViewProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [patientData, setPatientData] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchPatientData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch based on patient type
      if (patientType === "direct") {
        const { data } = await supabase
          .from("doctor_patients")
          .select("*")
          .eq("id", patientId)
          .single();
        if (data) {
          const age = data.date_of_birth ? Math.floor((Date.now() - new Date(data.date_of_birth).getTime()) / 31557600000) : undefined;
          setPatientData({ ...data, age });
        }
      } else {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", patientId)
          .single();
        if (data) {
          const age = data.date_of_birth ? Math.floor((Date.now() - new Date(data.date_of_birth).getTime()) / 31557600000) : undefined;
          setPatientData({ ...data, id: data.user_id, age });
        }
      }

      // Fetch appointments
      const { data: doctorData } = await supabase.from("doctors").select("id").eq("user_id", user.id).single();
      if (doctorData) {
        const { data: appts } = await supabase
          .from("appointments")
          .select("*")
          .eq("doctor_id", doctorData.id)
          .eq("patient_id", patientType === "direct" ? patientId : patientId)
          .order("appointment_date", { ascending: false });
        setAppointments(appts || []);
      }
    } catch (err) {
      console.error("Error fetching patient data:", err);
      toast.error("Failed to load patient data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Patient not found</p>
      </div>
    );
  }

  const completedVisits = appointments.filter((a) => a.status === "completed");
  const upcomingApt = appointments.find((a) => a.status === "confirmed" && new Date(a.appointment_date) >= new Date());

  const overviewStats = {
    nextAppointment: upcomingApt ? { date: upcomingApt.appointment_date } : null,
    lastVisit: completedVisits[0] ? { date: completedVisits[0].appointment_date } : null,
    activePrescriptions: prescriptions.filter((p) => p.status === "active").length,
    outstandingBalance: 0,
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PatientDashboardHeader
        patient={patientData}
        onBack={onBack}
        onEdit={() => toast.info("Edit patient coming soon")}
        onDelete={() => toast.info("Delete patient coming soon")}
        onDownloadPDF={() => toast.info("PDF download coming soon")}
        onPrint={() => window.print()}
      />

      <QuickOverviewCards stats={overviewStats} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="overview" className="gap-2"><LayoutDashboard className="w-4 h-4" />Overview</TabsTrigger>
          <TabsTrigger value="profile" className="gap-2"><User className="w-4 h-4" />Profile</TabsTrigger>
          <TabsTrigger value="appointments" className="gap-2"><Calendar className="w-4 h-4" />Appointments</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><History className="w-4 h-4" />History</TabsTrigger>
          <TabsTrigger value="prescriptions" className="gap-2"><Pill className="w-4 h-4" />Prescriptions</TabsTrigger>
          <TabsTrigger value="files" className="gap-2"><FolderOpen className="w-4 h-4" />Files</TabsTrigger>
          <TabsTrigger value="notes" className="gap-2"><FileText className="w-4 h-4" />Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab timeline={[]} recentFiles={[]} metrics={{ totalAppointments: appointments.length, totalPrescriptions: prescriptions.length, firstVisit: completedVisits[completedVisits.length - 1]?.appointment_date, lastVisit: completedVisits[0]?.appointment_date }} onViewFile={() => {}} />
        </TabsContent>
        <TabsContent value="profile" className="mt-6">
          <ProfileTab profile={patientData} onEdit={() => toast.info("Edit coming soon")} />
        </TabsContent>
        <TabsContent value="appointments" className="mt-6">
          <AppointmentsTab appointments={appointments.map(a => ({ ...a, date: a.appointment_date }))} onSchedule={() => toast.info("Schedule coming soon")} onReschedule={() => {}} onCancel={() => {}} onView={() => {}} />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <HistoryTab medicalHistory={[]} dentalHistory={[]} diagnosesLog={[]} />
        </TabsContent>
        <TabsContent value="prescriptions" className="mt-6">
          <PrescriptionsTab prescriptions={prescriptions} onAddPrescription={() => toast.info("Add prescription coming soon")} onExportPDF={() => {}} onSendToPatient={() => {}} />
        </TabsContent>
        <TabsContent value="files" className="mt-6">
          <FilesTab files={files} onUpload={() => {}} onDownload={() => {}} onDelete={() => {}} onPreview={() => {}} />
        </TabsContent>
        <TabsContent value="notes" className="mt-6">
          <NotesTab notes={notes} onAddNote={() => {}} onUpdateNote={() => {}} onDeleteNote={() => {}} onTogglePin={() => {}} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default PatientDashboardView;
