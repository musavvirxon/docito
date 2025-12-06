import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  Stethoscope,
  Syringe,
  AlertTriangle,
  Activity,
  Bone,
  FileText,
  Calendar,
} from "lucide-react";
import { motion } from "framer-motion";

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

interface HistoryTabProps {
  medicalHistory: MedicalHistoryItem[];
  dentalHistory: DentalHistoryItem[];
  diagnosesLog: DiagnosisLog[];
}

const HistoryTab = ({
  medicalHistory,
  dentalHistory,
  diagnosesLog,
}: HistoryTabProps) => {
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

  const getDentalIcon = () => Bone;

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
            <p className="text-sm text-muted-foreground">
              {emptyText || "No records found"}
            </p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
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
                      {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </Section>

        {/* Dental History */}
        <Section
          title="Dental History"
          icon={Bone}
          empty={dentalHistory.length === 0}
          emptyText="No dental history recorded"
        >
          <ScrollArea className="h-[300px] pr-4">
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
                    {item.details && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.details}
                      </p>
                    )}
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
        </Section>
      </div>

      {/* Diagnoses Log */}
      <Section
        title="Diagnoses Log"
        icon={Stethoscope}
        empty={diagnosesLog.length === 0}
        emptyText="No diagnoses recorded"
      >
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
                    {diagnosis.doctor_name && (
                      <p className="text-xs text-muted-foreground">
                        Dr. {diagnosis.doctor_name}
                      </p>
                    )}
                    {diagnosis.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {diagnosis.notes}
                      </p>
                    )}
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
