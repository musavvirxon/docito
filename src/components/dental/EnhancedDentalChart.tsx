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
import { 
  ToothData, ToothType, ToothStatus, ToothProcedure,
  PERMANENT_TEETH, PRIMARY_TEETH, TOOTH_STATUS_CONFIG 
} from "./types";
import { Stethoscope, Baby, RotateCcw, Plus, Trash2 } from "lucide-react";

interface EnhancedDentalChartProps {
  teethData: ToothData[];
  isEditable: boolean;
  selectedTeeth: number[];
  onToothSelect: (toothNumber: number) => void;
  onToothDataChange?: (toothNumber: number, data: Partial<ToothData>) => void;
  onAssignProcedure?: (teeth: number[], procedure: Omit<ToothProcedure, "id">) => void;
}

export const EnhancedDentalChart = ({
  teethData,
  isEditable,
  selectedTeeth,
  onToothSelect,
  onToothDataChange,
  onAssignProcedure,
}: EnhancedDentalChartProps) => {
  const [showPrimaryTeeth, setShowPrimaryTeeth] = useState(false);
  const [showBothCharts, setShowBothCharts] = useState(false);
  const [procedureModalOpen, setProcedureModalOpen] = useState(false);

  const getToothData = useCallback((num: number, type: ToothType): ToothData | undefined => 
    teethData.find((t) => t.toothNumber === num && t.toothType === type), 
  [teethData]);

  const handleClearSelection = () => {
    selectedTeeth.forEach((t) => onToothSelect(t));
  };

  const handleAssignProcedure = (procedure: Omit<ToothProcedure, "id">) => {
    onAssignProcedure?.(selectedTeeth, procedure);
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
                      {data?.diagnoses?.length ? (
                        <p className="text-xs text-muted-foreground">
                          Dx: {data.diagnoses.join(", ")}
                        </p>
                      ) : null}
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
      {/* Upper Jaw */}
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

      {/* Lower Jaw */}
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
      {/* Upper Jaw - Primary */}
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

      {/* Lower Jaw - Primary */}
      <div className="space-y-2">
        <div className="flex justify-center gap-4">
          {renderQuadrant(PRIMARY_TEETH.lowerRight, "primary", "LR (85-81)", true)}
          <div className="w-px bg-border self-stretch" />
          {renderQuadrant(PRIMARY_TEETH.lowerLeft, "primary", "LL (71-75)")}
        </div>
      </div>
    </motion.div>
  );

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Dental Chart (FDI)</CardTitle>
              <Badge variant="outline" className="text-xs">
                {showPrimaryTeeth ? "Primary" : "Permanent"}
              </Badge>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-muted-foreground" />
                <Switch 
                  id="teeth-toggle" 
                  checked={showPrimaryTeeth}
                  onCheckedChange={(checked) => {
                    setShowPrimaryTeeth(checked);
                    if (selectedTeeth.length) handleClearSelection();
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
          {/* Teeth Charts */}
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

          {/* Legend */}
          <div className="mt-6">
            <DentalChartLegend />
          </div>

          {/* Selected Teeth Actions */}
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

      {/* Procedure Assignment Modal */}
      <ProcedureModal
        open={procedureModalOpen}
        onOpenChange={setProcedureModalOpen}
        selectedTeeth={selectedTeeth}
        onAssignProcedure={handleAssignProcedure}
      />
    </>
  );
};
