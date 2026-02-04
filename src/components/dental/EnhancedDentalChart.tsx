import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToothSVG } from "./ToothSVG";
import { DentalChartLegend } from "./DentalChartLegend";
import { ProcedureModal } from "./ProcedureModal";
import { TreatmentPlanSection } from "./TreatmentPlanSection";
import {
  ToothData, ToothType, ToothStatus, ToothProcedure,
  PERMANENT_TEETH, PRIMARY_TEETH, TOOTH_STATUS_CONFIG
} from "./types";
import { useDentalChart } from "@/hooks/useDentalChart";
import { Stethoscope, Baby, RotateCcw, Plus, AlertCircle, Loader2 } from "lucide-react";

interface EnhancedDentalChartProps {
  patientId?: string;
  appointmentId?: string;
  isEditable?: boolean;
  // Legacy props for compatibility
  teethData?: ToothData[];
  selectedTeeth?: number[];
  onToothSelect?: (toothNumber: number) => void;
  onToothDataChange?: (toothNumber: number, data: Partial<ToothData>) => void;
  onAssignProcedure?: (teeth: number[], procedure: Omit<ToothProcedure, "id">) => void;
}

export const EnhancedDentalChart = ({
  patientId,
  appointmentId,
  isEditable = true,
  teethData = [],
  selectedTeeth: externalSelectedTeeth,
  onToothSelect: externalOnToothSelect,
  onAssignProcedure: externalOnAssignProcedure,
}: EnhancedDentalChartProps) => {
  const [showPrimaryTeeth, setShowPrimaryTeeth] = useState(false);
  const [showBothCharts, setShowBothCharts] = useState(false);
  const [procedureModalOpen, setProcedureModalOpen] = useState(false);
  const [internalSelectedTeeth, setInternalSelectedTeeth] = useState<number[]>([]);

  // Use database hook if patientId is provided
  const {
    toothRecords,
    procedures,
    procedureHistory,
    loading,
    isVerifiedDentist,
    addProcedureToTeeth,
    updateProcedureStatus,
  } = useDentalChart(patientId);

  // Determine which selected teeth to use
  const selectedTeeth = externalSelectedTeeth ?? internalSelectedTeeth;
  const onToothSelect = externalOnToothSelect ?? ((num: number) => {
    setInternalSelectedTeeth(prev =>
      prev.includes(num) ? prev.filter(t => t !== num) : [...prev, num]
    );
  });

  // Convert database records to ToothData format
  const getToothData = useCallback((num: number, type: ToothType): ToothData | undefined => {
    // First check database records
    const dbRecord = toothRecords.find(
      (t) => t.tooth_number === num && t.tooth_type === type
    );

    if (dbRecord) {
      const toothProcedures = procedureHistory.filter(
        p => p.tooth_numbers.includes(num)
      );

      return {
        toothNumber: dbRecord.tooth_number,
        toothType: dbRecord.tooth_type as ToothType,
        status: dbRecord.status as ToothStatus,
        diagnoses: [],
        treatments: [],
        procedures: toothProcedures.map(p => ({
          id: p.id,
          name: p.procedure_name,
          code: p.procedure_id || undefined,
          status: p.status,
          date: p.performed_at || p.created_at,
          notes: p.notes || undefined,
        })),
        notes: dbRecord.notes || undefined,
      };
    }

    // Fallback to legacy teethData
    return teethData.find((t) => t.toothNumber === num && t.toothType === type);
  }, [toothRecords, procedureHistory, teethData]);

  const handleClearSelection = () => {
    if (externalOnToothSelect) {
      selectedTeeth.forEach((t) => externalOnToothSelect(t));
    } else {
      setInternalSelectedTeeth([]);
    }
  };

  const handleAssignProcedure = async (procedure: Omit<ToothProcedure, "id">) => {
    if (patientId && addProcedureToTeeth) {
      // Use database
      const selectedProcedure = procedures.find((p) => {
        const code = procedure.code;
        // In DB mode, ProcedureModal uses `p.code || p.id` as the item "id".
        // So `procedure.code` can match either the `code` field or the DB `id`.
        if (code && (p.code === code || p.id === code)) return true;
        return p.name === procedure.name;
      });

      // IMPORTANT: cost should scale with number of teeth selected.
      // Example: teeth [12, 13] + "RCT" (unit_cost=100) => total_cost=200
      const unitCost = typeof selectedProcedure?.default_cost === "number" ? selectedProcedure.default_cost : undefined;
      const totalCost = typeof unitCost === "number" ? unitCost * selectedTeeth.length : undefined;

      await addProcedureToTeeth(
        selectedTeeth,
        selectedProcedure?.id || null,
        procedure.name,
        procedure.status === "cancelled" ? "planned" : procedure.status,
        totalCost,
        procedure.notes,
        appointmentId
      );
      handleClearSelection();
    } else if (externalOnAssignProcedure) {
      // Legacy mode
      externalOnAssignProcedure(selectedTeeth, procedure);
    }
  };

  const renderQuadrant = (
    teeth: number[],
    toothType: ToothType,
    label: string,
    reverse = false
  ) => {
    const orderedTeeth = reverse ? [...teeth].reverse() : teeth;

    return (
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <div className="flex gap-1">
          {orderedTeeth.map((num, idx) => {
            const data = getToothData(num, toothType);
            const isSelected = selectedTeeth.includes(num);
            const status: ToothStatus = data?.status || "healthy";
            const hasProcedure = (data?.procedures?.length || 0) > 0;

            return (
              <TooltipProvider key={num}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <ToothSVG
                        number={num}
                        toothType={toothType}
                        status={status}
                        isSelected={isSelected}
                        isEditable={isEditable}
                        onClick={() => onToothSelect(num)}
                        hasProcedure={hasProcedure}
                      />
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <div className="space-y-1">
                      <p className="font-semibold">Tooth {num}</p>
                      <p className="text-xs capitalize flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: TOOTH_STATUS_CONFIG[status].color }}
                        />
                        {TOOTH_STATUS_CONFIG[status].label}
                      </p>
                      {data?.procedures?.length ? (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Procedures: </span>
                          {data.procedures.map(p => p.name).join(", ")}
                        </div>
                      ) : null}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPermanentChart = () => (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="space-y-2">
        <div className="flex justify-center gap-4">
          {renderQuadrant(PERMANENT_TEETH.upperRight, "permanent", "Q1 (UR)", true)}
          <div className="w-px bg-border self-stretch" />
          {renderQuadrant(PERMANENT_TEETH.upperLeft, "permanent", "Q2 (UL)")}
        </div>
      </div>
      <div className="flex justify-center">
        <div className="w-4/5 h-px bg-border" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-center gap-4">
          {renderQuadrant(PERMANENT_TEETH.lowerRight, "permanent", "Q4 (LR)", true)}
          <div className="w-px bg-border self-stretch" />
          {renderQuadrant(PERMANENT_TEETH.lowerLeft, "permanent", "Q3 (LL)")}
        </div>
      </div>
    </motion.div>
  );

  const renderPrimaryChart = () => (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="space-y-2">
        <div className="flex justify-center gap-4">
          {renderQuadrant(PRIMARY_TEETH.upperRight, "primary", "UR (55-51)", true)}
          <div className="w-px bg-border self-stretch" />
          {renderQuadrant(PRIMARY_TEETH.upperLeft, "primary", "UL (61-65)")}
        </div>
      </div>
      <div className="flex justify-center">
        <div className="w-3/5 h-px bg-border" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-center gap-4">
          {renderQuadrant(PRIMARY_TEETH.lowerRight, "primary", "LR (85-81)", true)}
          <div className="w-px bg-border self-stretch" />
          {renderQuadrant(PRIMARY_TEETH.lowerLeft, "primary", "LL (71-75)")}
        </div>
      </div>
    </motion.div>
  );

  // Show access denied if patient ID provided but not verified dentist
  if (patientId && !loading && !isVerifiedDentist) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-amber-500" />
            <p className="font-medium">Access Restricted</p>
            <p className="text-sm mt-1">
              Only verified dentists can access the dental chart.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading dental chart...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Dental Chart (FDI)</CardTitle>
              <Badge variant="outline" className="text-xs">
                {showPrimaryTeeth ? "Primary" : "Permanent"}
              </Badge>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-muted-foreground" />
                <Switch
                  id="teeth-toggle"
                  checked={showPrimaryTeeth}
                  onCheckedChange={(checked) => {
                    setShowPrimaryTeeth(checked);
                    handleClearSelection();
                  }}
                />
                <Label htmlFor="teeth-toggle" className="flex items-center gap-1 cursor-pointer">
                  <Baby className="w-4 h-4" />
                  <span className="text-sm">Primary</span>
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="both-toggle"
                  checked={showBothCharts}
                  onCheckedChange={setShowBothCharts}
                />
                <Label htmlFor="both-toggle" className="text-sm cursor-pointer">
                  Show Both
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="space-y-8">
            <AnimatePresence mode="wait">
              {showBothCharts ? (
                <motion.div
                  key="both"
                  className="space-y-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div>
                    <h4 className="text-sm font-medium text-center mb-4 flex items-center justify-center gap-2">
                      <Stethoscope className="w-4 h-4" />
                      Permanent Teeth
                    </h4>
                    {renderPermanentChart()}
                  </div>
                  <div className="border-t pt-6">
                    <h4 className="text-sm font-medium text-center mb-4 flex items-center justify-center gap-2">
                      <Baby className="w-4 h-4" />
                      Primary Teeth (Milk)
                    </h4>
                    {renderPrimaryChart()}
                  </div>
                </motion.div>
              ) : showPrimaryTeeth ? (
                <motion.div key="primary">
                  {renderPrimaryChart()}
                </motion.div>
              ) : (
                <motion.div key="permanent">
                  {renderPermanentChart()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6">
            <DentalChartLegend />
          </div>

          <AnimatePresence>
            {selectedTeeth.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">
                      {selectedTeeth.length} tooth{selectedTeeth.length > 1 ? "es" : ""} selected
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTeeth.sort((a, b) => a - b).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {isEditable && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearSelection}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setProcedureModalOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Procedure
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Treatment Plan Section - only show if using database */}
      {patientId && procedureHistory.length > 0 && (
        <TreatmentPlanSection
          procedures={procedureHistory}
          isEditable={isEditable}
          onUpdateStatus={updateProcedureStatus}
        />
      )}

      <ProcedureModal
        open={procedureModalOpen}
        onOpenChange={setProcedureModalOpen}
        selectedTeeth={selectedTeeth}
        onAssignProcedure={handleAssignProcedure}
        dbProcedures={procedures}
      />
    </div>
  );
};
