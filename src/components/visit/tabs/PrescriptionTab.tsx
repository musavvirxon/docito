import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pill, Printer, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { downloadPrescriptionPdf } from "@/lib/api/prescription-api";
import PrescriptionCreator from "@/components/prescriptions/PrescriptionCreator";
import { VisitMode } from "../types";
import { toast } from "sonner";

interface PrescriptionTabProps {
  mode: VisitMode;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  onPrint?: () => void;
}

/**
 * Visit Prescription tab — uses the same backend (`create_prescription` RPC via
 * `usePrescriptions`) and the same `PrescriptionCreator` component as the
 * doctor dashboard and the appointment session. No mock data, no local state.
 */
export const PrescriptionTab = ({
  mode,
  patientId,
  doctorId,
  appointmentId,
  onPrint,
}: PrescriptionTabProps) => {
  const isEditable = mode === "current";
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { prescriptions, loading } = usePrescriptions({ doctorId, patientId });

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      await downloadPrescriptionPdf(id);
    } catch (err: any) {
      toast.error(err?.message || "Failed to download prescription");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Prescriptions
            </h3>
            <p className="text-sm text-muted-foreground">
              Saved to the patient's record and shared across the dashboard.
            </p>
          </div>
          <div className="flex gap-2">
            {onPrint && prescriptions.length > 0 && (
              <Button variant="outline" size="sm" onClick={onPrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            )}
            {isEditable && (
              <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New prescription
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading prescriptions…
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Pill className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No prescriptions yet</p>
            {isEditable && (
              <p className="text-sm text-muted-foreground mt-1">
                Click "New prescription" to create one
              </p>
            )}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rx #</TableHead>
                  <TableHead>Medications</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prescribed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((rx) => (
                  <TableRow key={rx.id}>
                    <TableCell className="font-mono text-xs">
                      {rx.prescription_number}
                    </TableCell>
                    <TableCell className="text-sm">
                      {rx.items && rx.items.length > 0
                        ? rx.items
                            .map((i) => `${i.medication_name} ${i.dosage}`.trim())
                            .join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="capitalize text-sm">
                      {rx.status}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rx.prescribed_at
                        ? format(new Date(rx.prescribed_at), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(rx.id)}
                        disabled={downloadingId === rx.id}
                      >
                        {downloadingId === rx.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New prescription</DialogTitle>
            </DialogHeader>
            {patientId && doctorId ? (
              <PrescriptionCreator
                patientId={patientId}
                doctorId={doctorId}
                appointmentId={appointmentId}
                onSuccess={() => setIsDialogOpen(false)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Patient or doctor information is missing — cannot create a
                prescription.
              </p>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
