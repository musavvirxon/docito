import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Stethoscope, Calendar, User as UserIcon, FileText, 
  AlertCircle, CheckCircle2, Clock 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Diagnosis {
  id: string;
  diagnosis_title: string;
  icd10_code: string | null;
  notes: string | null;
  created_at: string;
  appointment_id: string;
  doctor_id: string;
  doctor_name?: string;
  doctor_specialty?: string;
  // Linked data
  has_treatment_plan: boolean;
  treatment_plan_status?: string;
  has_prescription: boolean;
  prescription_status?: string;
}

export const PatientDiagnoses = () => {
  const { user } = useAuth();
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDiagnoses();
  }, [user?.id]);

  const fetchDiagnoses = async () => {
    if (!user) return;
    try {
      setLoading(true);

      // Fetch diagnoses
      const { data: diagData, error: diagError } = await supabase
        .from("appointment_diagnoses")
        .select(`
          id, diagnosis_title, icd10_code, notes, created_at, 
          appointment_id, doctor_id
        `)
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false });

      if (diagError) throw diagError;
      if (!diagData || diagData.length === 0) {
        setDiagnoses([]);
        return;
      }

      // Get unique doctor IDs for name hydration
      const doctorIds = [...new Set(diagData.map(d => d.doctor_id))];
      let doctorMap: Record<string, { full_name: string; specialty: string }> = {};
      if (doctorIds.length > 0) {
        const { data: dpv } = await supabase
          .from("doctor_profiles_view")
          .select("id, full_name, specialty")
          .in("id", doctorIds);
        if (dpv) {
          for (const d of dpv as any[]) {
            doctorMap[d.id] = { full_name: d.full_name, specialty: d.specialty };
          }
        }
      }

      // Get unique appointment IDs to check for linked treatment plans and prescriptions
      const appointmentIds = [...new Set(diagData.map(d => d.appointment_id))];

      // Fetch treatment plans linked to this patient
      const { data: tpData } = await supabase
        .from("treatment_plans")
        .select("id, status, doctor_id")
        .eq("patient_id", user.id);

      // Build a map of doctor_id -> treatment plan status
      const tpByDoctor: Record<string, string> = {};
      if (tpData) {
        for (const tp of tpData) {
          if (tp.doctor_id) tpByDoctor[tp.doctor_id] = tp.status as string;
        }
      }

      // Fetch prescriptions linked to this patient's appointments
      const { data: rxData } = await supabase
        .from("prescriptions")
        .select("id, status, appointment_id")
        .eq("patient_id", user.id);

      const rxByAppointment: Record<string, string> = {};
      if (rxData) {
        for (const rx of rxData) {
          if (rx.appointment_id) rxByAppointment[rx.appointment_id] = rx.status;
        }
      }

      const mapped: Diagnosis[] = diagData.map(d => ({
        id: d.id,
        diagnosis_title: d.diagnosis_title,
        icd10_code: d.icd10_code,
        notes: d.notes,
        created_at: d.created_at,
        appointment_id: d.appointment_id,
        doctor_id: d.doctor_id,
        doctor_name: doctorMap[d.doctor_id]?.full_name,
        doctor_specialty: doctorMap[d.doctor_id]?.specialty,
        has_treatment_plan: !!tpByDoctor[d.doctor_id],
        treatment_plan_status: tpByDoctor[d.doctor_id],
        has_prescription: !!rxByAppointment[d.appointment_id],
        prescription_status: rxByAppointment[d.appointment_id],
      }));

      setDiagnoses(mapped);
    } catch (error) {
      console.error("Error fetching diagnoses:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    const configs: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
      active: { variant: "default", icon: AlertCircle },
      pending: { variant: "secondary", icon: Clock },
      completed: { variant: "default", icon: CheckCircle2 },
      cancelled: { variant: "destructive", icon: AlertCircle },
      draft: { variant: "outline", icon: FileText },
      dispensed: { variant: "default", icon: CheckCircle2 },
      sent_to_pharmacy: { variant: "secondary", icon: Clock },
    };
    const config = configs[status] || { variant: "outline" as const, icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="text-xs gap-1">
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  if (diagnoses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">No Diagnoses</h3>
          <p className="text-muted-foreground text-sm">
            Your diagnoses will appear here after your doctor records them during appointments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {diagnoses.map(diag => (
        <Card key={diag.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Stethoscope className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold">{diag.diagnosis_title}</h3>
                    {diag.icd10_code && (
                      <Badge variant="outline" className="text-xs font-mono">
                        {diag.icd10_code}
                      </Badge>
                    )}
                  </div>
                  {diag.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{diag.notes}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(diag.created_at), "MMM dd, yyyy")}
                </span>
                {diag.doctor_name && (
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-4 w-4" />
                    Dr. {diag.doctor_name}
                    {diag.doctor_specialty && (
                      <span className="text-xs">({diag.doctor_specialty})</span>
                    )}
                  </span>
                )}
              </div>

              {/* Linked items */}
              {(diag.has_treatment_plan || diag.has_prescription) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {diag.has_treatment_plan && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Treatment Plan:</span>
                      {getStatusBadge(diag.treatment_plan_status)}
                    </div>
                  )}
                  {diag.has_prescription && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Prescription:</span>
                      {getStatusBadge(diag.prescription_status)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
