import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, Pill, Printer, Search } from "lucide-react";
import { VisitPrescription, VisitMode } from "../types";
import { format } from "date-fns";

interface PrescriptionTabProps {
  prescriptions: VisitPrescription[];
  mode: VisitMode;
  onAddPrescription: (prescription: Omit<VisitPrescription, "id" | "createdAt">) => void;
  onRemovePrescription: (id: string) => void;
  onPrint: () => void;
}

// Mock medications for demo
const MEDICATIONS = [
  "Amoxicillin",
  "Ibuprofen",
  "Paracetamol",
  "Metformin",
  "Lisinopril",
  "Omeprazole",
  "Atorvastatin",
  "Metronidazole",
  "Chlorhexidine",
  "Fluoride",
];

const FREQUENCIES = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "Four times daily",
  "Every 4 hours",
  "Every 6 hours",
  "Every 8 hours",
  "Every 12 hours",
  "As needed",
  "Before meals",
  "After meals",
  "At bedtime",
];

const DURATIONS = [
  "3 days",
  "5 days",
  "7 days",
  "10 days",
  "14 days",
  "21 days",
  "30 days",
  "60 days",
  "90 days",
  "Ongoing",
];

export const PrescriptionTab = ({
  prescriptions,
  mode,
  onAddPrescription,
  onRemovePrescription,
  onPrint,
}: PrescriptionTabProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [strength, setStrength] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [instructions, setInstructions] = useState("");

  const isEditable = mode === "current";

  const filteredMedications = MEDICATIONS.filter((m) =>
    m.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    if (!medication || !dosage || !frequency || !duration) return;

    onAddPrescription({
      medication,
      dosage,
      strength: strength || undefined,
      frequency,
      duration,
      instructions: instructions || undefined,
    });

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSearchQuery("");
    setMedication("");
    setDosage("");
    setStrength("");
    setFrequency("");
    setDuration("");
    setInstructions("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Prescriptions</h2>
          <p className="text-sm text-muted-foreground">
            Medications prescribed during this visit
          </p>
        </div>
        <div className="flex gap-2">
          {prescriptions.length > 0 && (
            <Button variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Prescription
            </Button>
          )}
          {isEditable && (
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Prescription
            </Button>
          )}
        </div>
      </div>

      {prescriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Pill className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No prescriptions recorded yet</p>
            {isEditable && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
              >
                Add First Prescription
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medication</TableHead>
                <TableHead className="w-24">Dosage</TableHead>
                <TableHead className="w-24">Strength</TableHead>
                <TableHead className="w-32">Frequency</TableHead>
                <TableHead className="w-24">Duration</TableHead>
                <TableHead className="w-48">Instructions</TableHead>
                {isEditable && <TableHead className="w-16" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map((rx) => (
                <TableRow key={rx.id}>
                  <TableCell className="font-medium">{rx.medication}</TableCell>
                  <TableCell>{rx.dosage}</TableCell>
                  <TableCell>{rx.strength || "—"}</TableCell>
                  <TableCell>{rx.frequency}</TableCell>
                  <TableCell>{rx.duration}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {rx.instructions || "—"}
                  </TableCell>
                  {isEditable && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemovePrescription(rx.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add Prescription Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Prescription</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Medication</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search medication..."
                  value={medication || searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMedication(value);
                    setSearchQuery(value);
                  }}
                  className="pl-9"
                />
              </div>
              {searchQuery && !medication && (
                <div className="max-h-32 overflow-y-auto border rounded-lg divide-y">
                  {filteredMedications.map((med) => (
                    <button
                      key={med}
                      onClick={() => {
                        setMedication(med);
                        setSearchQuery("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm"
                    >
                      {med}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dosage</Label>
                <Input
                  placeholder="e.g., 500mg"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Strength (Optional)</Label>
                <Input
                  placeholder="e.g., 250mg/5ml"
                  value={strength}
                  onChange={(e) => setStrength(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((freq) => (
                      <SelectItem key={freq} value={freq}>
                        {freq}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((dur) => (
                      <SelectItem key={dur} value={dur}>
                        {dur}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Special Instructions (Optional)</Label>
              <Textarea
                placeholder="e.g., Take with food, avoid alcohol..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!medication || !dosage || !frequency || !duration}
            >
              Add Prescription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
