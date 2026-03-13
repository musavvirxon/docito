import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Stethoscope, FileText, Scissors } from "lucide-react";
import { PatientDiagnoses } from "./PatientDiagnoses";
import { PatientMedicalRecords } from "./PatientMedicalRecords";

type RecordTab = "diagnoses" | "records" | "procedures";

const tabs: { id: RecordTab; label: string; icon: React.ElementType }[] = [
  { id: "diagnoses", label: "Diagnoses", icon: Stethoscope },
  { id: "records", label: "Medical Records", icon: FileText },
  { id: "procedures", label: "Procedures", icon: Scissors },
];

export const PatientRecordsUnified = () => {
  const [activeTab, setActiveTab] = useState<RecordTab>("diagnoses");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Medical Records</h2>
        <p className="text-muted-foreground">
          View your diagnoses, records, and procedures from your doctors.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {activeTab === "diagnoses" && <PatientDiagnoses />}
      {activeTab === "records" && <PatientMedicalRecords />}
      {activeTab === "procedures" && <PatientProcedures />}
    </div>
  );
};

// Inline procedures component - shows appointment_procedures for the patient
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

const PatientProcedures = () => {
  const { user } = useAuth();
  const [procedures, setProcedures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchProcedures();
  }, [user?.id]);

  const fetchProcedures = async () => {
    if (!user) return;
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("appointment_procedures")
        .select(`
          id, status, estimated_cost, procedure_notes, prescribed_at,
          procedure:procedures(name, category),
          appointment:appointments!appointment_procedures_appointment_id_fkey(
            id, appointment_date, doctor_id
          )
        `)
        .order("prescribed_at", { ascending: false });

      if (error) throw error;

      // Filter by patient's appointments and hydrate doctor names
      const filtered = (data || []).filter((p: any) => p.appointment);
      
      const doctorIds = [...new Set(filtered.map((p: any) => p.appointment?.doctor_id).filter(Boolean))];
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

      const enriched = filtered.map((p: any) => ({
        ...p,
        doctor_name: doctorMap[p.appointment?.doctor_id]?.full_name,
        doctor_specialty: doctorMap[p.appointment?.doctor_id]?.specialty,
      }));

      setProcedures(enriched);
    } catch (error) {
      console.error("Error fetching procedures:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
    );
  }

  if (procedures.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Scissors className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">No Procedures</h3>
          <p className="text-muted-foreground text-sm">
            Procedures from your appointments will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {procedures.map((proc: any) => (
        <Card key={proc.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <Scissors className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">
                    {proc.procedure?.name || "Procedure"}
                  </h3>
                  {proc.procedure?.category && (
                    <Badge variant="outline" className="text-xs">
                      {proc.procedure.category}
                    </Badge>
                  )}
                  <Badge
                    variant={proc.status === "completed" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {(proc.status || "pending").replace(/_/g, " ")}
                  </Badge>
                </div>

                {proc.procedure_notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {proc.procedure_notes}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(proc.prescribed_at), "MMM dd, yyyy")}
                  </span>
                  {proc.doctor_name && (
                    <span className="flex items-center gap-1">
                      <UserIcon className="h-4 w-4" />
                      Dr. {proc.doctor_name}
                    </span>
                  )}
                  {proc.estimated_cost != null && proc.estimated_cost > 0 && (
                    <span className="text-foreground font-medium">
                      ${proc.estimated_cost.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
