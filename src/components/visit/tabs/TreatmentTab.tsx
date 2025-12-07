import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Scissors, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { Treatment, VisitMode } from "../types";
import { format } from "date-fns";

interface TreatmentTabProps {
  treatments: Treatment[];
  mode: VisitMode;
  isDentist: boolean;
  selectedTeeth?: number[];
  onAddTreatment: (treatment: Omit<Treatment, "id" | "createdAt">) => void;
  onRemoveTreatment: (id: string) => void;
  onUpdateStatus: (id: string, status: Treatment["status"]) => void;
}

// Mock procedures for demo
const PROCEDURES = [
  { id: "1", name: "Tooth Extraction", code: "D7140", cost: 150 },
  { id: "2", name: "Root Canal Therapy", code: "D3310", cost: 800 },
  { id: "3", name: "Dental Filling (Composite)", code: "D2391", cost: 200 },
  { id: "4", name: "Dental Crown", code: "D2740", cost: 1200 },
  { id: "5", name: "Professional Cleaning", code: "D1110", cost: 100 },
  { id: "6", name: "X-Ray (Full Mouth)", code: "D0210", cost: 120 },
  { id: "7", name: "Consultation", code: "D0140", cost: 75 },
  { id: "8", name: "ECG/EKG", code: "93000", cost: 150 },
  { id: "9", name: "Blood Pressure Check", code: "99211", cost: 25 },
  { id: "10", name: "Physical Examination", code: "99213", cost: 150 },
];

const getStatusIcon = (status: Treatment["status"]) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "in_progress":
      return <PlayCircle className="h-4 w-4 text-blue-500" />;
    case "planned":
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: Treatment["status"]) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
    case "in_progress":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
    case "planned":
      return <Badge variant="secondary">Planned</Badge>;
  }
};

export const TreatmentTab = ({
  treatments,
  mode,
  isDentist,
  selectedTeeth,
  onAddTreatment,
  onRemoveTreatment,
  onUpdateStatus,
}: TreatmentTabProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("");
  const [status, setStatus] = useState<Treatment["status"]>("planned");

  const isEditable = mode === "current";

  const handleAdd = () => {
    const procedure = PROCEDURES.find((p) => p.id === selectedProcedure);
    if (!procedure) return;

    onAddTreatment({
      procedureId: procedure.id,
      name: procedure.name,
      code: procedure.code,
      notes: notes || undefined,
      cost: cost ? parseFloat(cost) : procedure.cost,
      status,
      toothNumbers: isDentist ? selectedTeeth : undefined,
    });

    setIsDialogOpen(false);
    setSelectedProcedure("");
    setNotes("");
    setCost("");
    setStatus("planned");
  };

  const totalCost = treatments.reduce((sum, t) => sum + (t.cost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Treatment Plan</h2>
          <p className="text-sm text-muted-foreground">
            Procedures performed or planned for this visit
          </p>
        </div>
        {isEditable && (
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Treatment
          </Button>
        )}
      </div>

      {treatments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Scissors className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No treatments recorded yet</p>
            {isEditable && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
              >
                Add First Treatment
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Code</TableHead>
                <TableHead>Procedure</TableHead>
                {isDentist && <TableHead className="w-32">Teeth</TableHead>}
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-24 text-right">Cost</TableHead>
                <TableHead className="w-48">Notes</TableHead>
                {isEditable && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {treatments.map((treatment) => (
                <TableRow key={treatment.id}>
                  <TableCell className="font-mono text-sm">{treatment.code || "—"}</TableCell>
                  <TableCell className="font-medium">{treatment.name}</TableCell>
                  {isDentist && (
                    <TableCell>
                      {treatment.toothNumbers && treatment.toothNumbers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {treatment.toothNumbers.map((t) => (
                            <Badge key={t} variant="outline" className="text-xs">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    {isEditable ? (
                      <Select
                        value={treatment.status}
                        onValueChange={(v: any) => onUpdateStatus(treatment.id, v)}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planned">Planned</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      getStatusBadge(treatment.status)
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${treatment.cost?.toFixed(2) || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {treatment.notes || "—"}
                  </TableCell>
                  {isEditable && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveTreatment(treatment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={isDentist ? 4 : 3} className="font-semibold">
                  Total
                </TableCell>
                <TableCell className="text-right font-bold text-lg">
                  ${totalCost.toFixed(2)}
                </TableCell>
                <TableCell colSpan={isEditable ? 2 : 1} />
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add Treatment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Treatment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Procedure</Label>
              <Select value={selectedProcedure} onValueChange={setSelectedProcedure}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a procedure..." />
                </SelectTrigger>
                <SelectContent>
                  {PROCEDURES.map((proc) => (
                    <SelectItem key={proc.id} value={proc.id}>
                      <span className="font-mono text-xs mr-2">{proc.code}</span>
                      {proc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isDentist && selectedTeeth && selectedTeeth.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Teeth</Label>
                <div className="flex flex-wrap gap-1 p-2 bg-muted rounded-lg">
                  {selectedTeeth.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost ($)</Label>
                <Input
                  type="number"
                  placeholder={
                    selectedProcedure
                      ? PROCEDURES.find((p) => p.id === selectedProcedure)?.cost.toString()
                      : "0.00"
                  }
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Treatment notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!selectedProcedure}>
              Add Treatment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
