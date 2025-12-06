import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pill,
  Plus,
  Download,
  Send,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration?: string;
  doctor_name?: string;
  start_date: string;
  end_date?: string;
  status: "active" | "completed" | "cancelled";
  instructions?: string;
}

interface PrescriptionsTabProps {
  prescriptions: Prescription[];
  onAddPrescription: () => void;
  onExportPDF: (prescriptions: Prescription[]) => void;
  onSendToPatient: (prescriptions: Prescription[]) => void;
}

const PrescriptionsTab = ({
  prescriptions,
  onAddPrescription,
  onExportPDF,
  onSendToPatient,
}: PrescriptionsTabProps) => {
  const activePrescriptions = prescriptions.filter((p) => p.status === "active");
  const pastPrescriptions = prescriptions.filter((p) => p.status !== "active");

  const PrescriptionCard = ({ prescription }: { prescription: Prescription }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl ${
                prescription.status === "active"
                  ? "bg-primary/10"
                  : "bg-muted"
              }`}
            >
              <Pill
                className={`w-5 h-5 ${
                  prescription.status === "active"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="font-semibold text-base">
                    {prescription.medication}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {prescription.dosage} • {prescription.frequency}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    prescription.status === "active"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : prescription.status === "completed"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }
                >
                  {prescription.status === "active" && (
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                  )}
                  {prescription.status === "cancelled" && (
                    <XCircle className="w-3 h-3 mr-1" />
                  )}
                  {prescription.status}
                </Badge>
              </div>

              {prescription.duration && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  Duration: {prescription.duration}
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {prescription.doctor_name && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Dr. {prescription.doctor_name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(prescription.start_date).toLocaleDateString()}
                  {prescription.end_date && (
                    <> - {new Date(prescription.end_date).toLocaleDateString()}</>
                  )}
                </span>
              </div>

              {prescription.instructions && (
                <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted/50 rounded-lg">
                  {prescription.instructions}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
        <Pill className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-foreground mb-1">No prescriptions</h3>
      <p className="text-sm text-muted-foreground">
        Add a new prescription for this patient
      </p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Prescriptions</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => onExportPDF(prescriptions)}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => onSendToPatient(activePrescriptions)}
          >
            <Send className="w-4 h-4 mr-2" />
            Send to Patient
          </Button>
          <Button onClick={onAddPrescription}>
            <Plus className="w-4 h-4 mr-2" />
            Add Prescription
          </Button>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Active ({activePrescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            <Clock className="w-4 h-4" />
            Past ({pastPrescriptions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {activePrescriptions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {activePrescriptions.map((prescription) => (
                  <PrescriptionCard
                    key={prescription.id}
                    prescription={prescription}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {pastPrescriptions.length === 0 ? (
            <EmptyState />
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                <AnimatePresence>
                  {pastPrescriptions.map((prescription) => (
                    <PrescriptionCard
                      key={prescription.id}
                      prescription={prescription}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default PrescriptionsTab;
