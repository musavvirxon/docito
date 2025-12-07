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
import { Plus, Trash2, Search, AlertCircle } from "lucide-react";
import { Diagnosis, VisitMode } from "../types";
import { format } from "date-fns";

interface DiagnosisTabProps {
  diagnoses: Diagnosis[];
  mode: VisitMode;
  onAddDiagnosis: (diagnosis: Omit<Diagnosis, "id" | "createdAt">) => void;
  onRemoveDiagnosis: (id: string) => void;
}

// Mock ICD-10 codes for demo
const ICD10_CODES = [
  { code: "K02.9", name: "Dental caries, unspecified" },
  { code: "K04.0", name: "Pulpitis" },
  { code: "K05.0", name: "Acute gingivitis" },
  { code: "K05.1", name: "Chronic gingivitis" },
  { code: "K08.1", name: "Loss of teeth due to accident" },
  { code: "J06.9", name: "Acute upper respiratory infection" },
  { code: "I10", name: "Essential hypertension" },
  { code: "E11.9", name: "Type 2 diabetes mellitus" },
  { code: "M54.5", name: "Low back pain" },
  { code: "J45.9", name: "Asthma, unspecified" },
];

export const DiagnosisTab = ({
  diagnoses,
  mode,
  onAddDiagnosis,
  onRemoveDiagnosis,
}: DiagnosisTabProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState<{ code: string; name: string } | null>(null);
  const [diagnosisType, setDiagnosisType] = useState<"primary" | "secondary">("primary");
  const [notes, setNotes] = useState("");

  const isEditable = mode === "current";

  const filteredCodes = ICD10_CODES.filter(
    (item) =>
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    if (!selectedCode) return;

    onAddDiagnosis({
      code: selectedCode.code,
      name: selectedCode.name,
      type: diagnosisType,
      notes: notes || undefined,
    });

    setIsDialogOpen(false);
    setSelectedCode(null);
    setSearchQuery("");
    setNotes("");
    setDiagnosisType("primary");
  };

  const primaryDiagnoses = diagnoses.filter((d) => d.type === "primary");
  const secondaryDiagnoses = diagnoses.filter((d) => d.type === "secondary");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Diagnosis</h2>
          <p className="text-sm text-muted-foreground">
            Record patient diagnoses with ICD-10 codes
          </p>
        </div>
        {isEditable && (
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Diagnosis
          </Button>
        )}
      </div>

      {diagnoses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No diagnoses recorded yet</p>
            {isEditable && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsDialogOpen(true)}
              >
                Add First Diagnosis
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Primary Diagnoses */}
          {primaryDiagnoses.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Badge variant="default">Primary</Badge>
                Diagnoses
              </h3>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">ICD-10 Code</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead className="w-48">Notes</TableHead>
                      <TableHead className="w-32">Date</TableHead>
                      {isEditable && <TableHead className="w-16" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {primaryDiagnoses.map((diagnosis) => (
                      <TableRow key={diagnosis.id}>
                        <TableCell className="font-mono text-primary">
                          {diagnosis.code}
                        </TableCell>
                        <TableCell className="font-medium">{diagnosis.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {diagnosis.notes || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(diagnosis.createdAt), "PP")}
                        </TableCell>
                        {isEditable && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onRemoveDiagnosis(diagnosis.id)}
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
            </div>
          )}

          {/* Secondary Diagnoses */}
          {secondaryDiagnoses.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Badge variant="secondary">Secondary</Badge>
                Diagnoses
              </h3>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">ICD-10 Code</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead className="w-48">Notes</TableHead>
                      <TableHead className="w-32">Date</TableHead>
                      {isEditable && <TableHead className="w-16" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {secondaryDiagnoses.map((diagnosis) => (
                      <TableRow key={diagnosis.id}>
                        <TableCell className="font-mono text-secondary-foreground">
                          {diagnosis.code}
                        </TableCell>
                        <TableCell className="font-medium">{diagnosis.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {diagnosis.notes || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(diagnosis.createdAt), "PP")}
                        </TableCell>
                        {isEditable && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onRemoveDiagnosis(diagnosis.id)}
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
            </div>
          )}
        </div>
      )}

      {/* Add Diagnosis Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Diagnosis</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search ICD-10 Code</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {searchQuery && (
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                  {filteredCodes.map((item) => (
                    <button
                      key={item.code}
                      onClick={() => {
                        setSelectedCode(item);
                        setSearchQuery("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                    >
                      <span className="font-mono text-primary text-sm">{item.code}</span>
                      <span className="ml-2 text-sm">{item.name}</span>
                    </button>
                  ))}
                  {filteredCodes.length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      No matching codes found
                    </p>
                  )}
                </div>
              )}
            </div>

            {selectedCode && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-mono text-primary">{selectedCode.code}</div>
                <div className="text-sm">{selectedCode.name}</div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Diagnosis Type</Label>
              <Select value={diagnosisType} onValueChange={(v: any) => setDiagnosisType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary Diagnosis</SelectItem>
                  <SelectItem value="secondary">Secondary Diagnosis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Additional notes..."
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
            <Button onClick={handleAdd} disabled={!selectedCode}>
              Add Diagnosis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
