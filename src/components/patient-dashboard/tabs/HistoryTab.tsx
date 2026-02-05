import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Heart,
  Stethoscope,
  Syringe,
  AlertTriangle,
  Activity,
  Bone,
  FileText,
  Calendar,
  CircleDot,
  DollarSign,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface MedicalHistoryItem {
  id: string;
  type: "disease" | "surgery" | "vaccination" | "allergy" | "chronic";
  title: string;
  date?: string;
  notes?: string;
}

interface DentalHistoryItem {
  id: string;
  type: "complaint" | "missing_teeth" | "infection" | "prosthesis" | "restoration" | "habit";
  title: string;
  details?: string;
  date?: string;
}

interface DiagnosisLog {
  id: string;
  diagnosis: string;
  date: string;
  doctor_name?: string;
  notes?: string;
}

type DentalProcedureStatus = "planned" | "in_progress" | "completed" | "cancelled";

interface DentalProcedureHistoryRow {
  id: string;
  procedure_name: string;
  tooth_numbers: number[];
  status: DentalProcedureStatus;
  cost: number | null;
  notes: string | null;
  performed_at: string | null;
  created_at: string;
  doctor?: { full_name: string | null } | null;
  appointment?: { appointment_date: string; start_time: string } | null;
}

interface HistoryTabProps {
  medicalHistory: MedicalHistoryItem[];
  dentalHistory: DentalHistoryItem[];
  diagnosesLog: DiagnosisLog[];
}

const HistoryTab = ({ medicalHistory, dentalHistory, diagnosesLog }: HistoryTabProps) => {
  const { user } = useAuth();
  const [dentalProcedures, setDentalProcedures] = useState<DentalProcedureHistoryRow[]>([]);
  const [loadingDentalProcedures, setLoadingDentalProcedures] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!user?.id) return;

      setLoadingDentalProcedures(true);
      try {
        const { data, error } = await supabase
          .from("tooth_procedure_history")
          .select(
            "id,procedure_name,tooth_numbers,status,cost,notes,performed_at,created_at,doctor:doctor_profiles_view(full_name),appointment:appointments(appointment_date,start_time)"
          )
          .eq("patient_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setDentalProcedures((data as any) || []);
      } catch (err: any) {
        console.error("Error loading dental procedures:", err);
        toast.error("Failed to load dental procedure history");
        setDentalProcedures([]);
      } finally {
        setLoadingDentalProcedures(false);
      }
    };

    run();
  }, [user?.id]);

  const formatMoney = (amount: number | null | undefined) => {
    const n = Number(amount ?? 0);
    const safe = Number.isFinite(n) ? n : 0;
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(safe);
    } catch {
      return `$${safe.toFixed(2)}`;
    }
  };

  const dentalStatusBadgeClass = (status: DentalProcedureStatus) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
      case "in_progress":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
      case "cancelled":
        return "bg-red-500/10 text-red-700 dark:text-red-300";
      case "planned":
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const dentalProcedureSummary = useMemo(() => {
    const counts = new Map<string, number>();
    let totalCost = 0;

    for (const row of dentalProcedures) {
      const name = row.procedure_name || "Procedure";
      const toothCount = Array.isArray(row.tooth_numbers) && row.tooth_numbers.length ? row.tooth_numbers.length : 1;
      counts.set(name, (counts.get(name) || 0) + toothCount);

      if (typeof row.cost === "number" && Number.isFinite(row.cost)) {
        totalCost += row.cost;
      }
    }

    const summaryParts = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, qty]) => `${name} ×${qty}`);

    return { totalCost, summaryParts, entries: dentalProcedures.length };
  }, [dentalProcedures]);

  const getMedicalIcon = (type: MedicalHistoryItem["type"]) => {
    switch (type) {
      case "disease":
        return Heart;
      case "surgery":
        return Stethoscope;
      case "vaccination":
        return Syringe;
      case "allergy":
        return AlertTriangle;
      case "chronic":
        return Activity;
      default:
        return FileText;
    }
  };

  const getMedicalColor = (type: MedicalHistoryItem["type"]) => {
    switch (type) {
      case "disease":
        return "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400";
      case "surgery":
        return "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400";
      case "vaccination":
        return "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400";
      case "allergy":
        return "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400";
      case "chronic":
        return "bg-primary/10 text-primary";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const Section = ({
    title,
    icon: Icon,
    children,
    empty,
    emptyText,
  }: {
    title: string;
    icon: any;
    children?: React.ReactNode;
    empty?: boolean;
    emptyText?: string;
  }) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="text-center py-6">
            <Icon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{emptyText || "No records found"}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medical History */}
        <Section
          title="Medical History"
          icon={Heart}
          empty={medicalHistory.length === 0}
          emptyText="No medical history recorded"
        >
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {medicalHistory.map((item) => {
                const Icon = getMedicalIcon(item.type);
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${getMedicalColor(item.type)}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{item.title}</p>
                        <Badge variant="outline" className="text-xs shrink-0 capitalize">
                          {item.type}
                        </Badge>
                      </div>
                      {item.date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(item.date).toLocaleDateString()}
                        </p>
                      )}
                      {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Section>

        {/* Dental History (Procedures + Notes) */}
        <Section
          title="Dental History"
          icon={CircleDot}
          empty={!loadingDentalProcedures && dentalProcedures.length === 0 && dentalHistory.length === 0}
          emptyText="No dental procedures recorded yet"
        >
          <div className="space-y-4">
            {/* Procedures */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CircleDot className="w-4 h-4 text-primary" />
                  Procedures
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {dentalProcedureSummary.summaryParts.length
                    ? dentalProcedureSummary.summaryParts.join(" • ")
                    : "No procedures yet."}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Total
                </p>
                <p className="font-semibold text-sm">{formatMoney(dentalProcedureSummary.totalCost)}</p>
              </div>
            </div>

            {loadingDentalProcedures && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading procedure history...
              </div>
            )}

            {!loadingDentalProcedures && dentalProcedures.length > 0 && (
              <ScrollArea className="h-[220px] pr-4">
                <div className="space-y-3">
                  {dentalProcedures.map((row) => {
                    const when = row.performed_at || row.created_at;
                    const dateLabel = when ? new Date(when).toLocaleDateString() : "";
                    const teeth = Array.isArray(row.tooth_numbers)
                      ? row.tooth_numbers.slice().sort((a, b) => a - b)
                      : [];

                    const apptLabel =
                      row.appointment?.appointment_date && row.appointment?.start_time
                        ? `${new Date(row.appointment.appointment_date).toLocaleDateString()} • ${row.appointment.start_time}`
                        : null;

                    return (
                      <div
                        key={row.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <CircleDot className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm">{row.procedure_name}</p>
                            <span className="text-sm font-semibold">{formatMoney(row.cost)}</span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge className={dentalStatusBadgeClass(row.status)}>
                              {row.status.replace("_", " ")}
                            </Badge>
                            {teeth.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Teeth: {teeth.join(", ")}
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                            {dateLabel && <span>{dateLabel}</span>}
                            {row.doctor?.full_name && <span>• Dr. {row.doctor.full_name}</span>}
                            {apptLabel && <span>• {apptLabel}</span>}
                          </div>

                          {row.notes && <p className="text-xs text-muted-foreground mt-1">{row.notes}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            {/* Optional: legacy dental history notes */}
            {dentalHistory.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Bone className="w-4 h-4 text-primary" />
                    Notes
                  </p>

                  <ScrollArea className="h-[180px] pr-4 mt-2">
                    <div className="space-y-3">
                      {dentalHistory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="p-2 rounded-lg bg-accent/10 text-accent">
                            <Bone className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-sm">{item.title}</p>
                              <Badge variant="outline" className="text-xs shrink-0 capitalize">
                                {item.type.replace("_", " ")}
                              </Badge>
                            </div>
                            {item.details && <p className="text-xs text-muted-foreground mt-1">{item.details}</p>}
                            {item.date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(item.date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}

            <p className="text-xs text-muted-foreground">
              Note: patients can view procedure history, but not the full dental chart.
            </p>
          </div>
        </Section>
      </div>

      {/* Diagnoses Log */}
      <Section title="Diagnoses Log" icon={Stethoscope} empty={diagnosesLog.length === 0} emptyText="No diagnoses recorded">
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
              {diagnosesLog.map((diagnosis, index) => (
                <motion.div
                  key={diagnosis.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative pl-10"
                >
                  <div className="absolute left-2 top-2 p-1.5 rounded-full bg-primary/10 text-primary">
                    <Calendar className="w-3 h-3" />
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-sm">{diagnosis.diagnosis}</h4>
                      <span className="text-xs text-muted-foreground">
                        {new Date(diagnosis.date).toLocaleDateString()}
                      </span>
                    </div>
                    {diagnosis.doctor_name && <p className="text-xs text-muted-foreground">Dr. {diagnosis.doctor_name}</p>}
                    {diagnosis.notes && <p className="text-sm text-muted-foreground mt-2">{diagnosis.notes}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </Section>
    </motion.div>
  );
};

export default HistoryTab;
