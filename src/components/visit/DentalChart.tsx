import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToothData, VisitMode } from "./types";

interface DentalChartProps {
  teethData: ToothData[];
  mode: VisitMode;
  selectedTeeth: number[];
  onToothSelect: (toothNumber: number) => void;
  onToothDataChange?: (toothNumber: number, data: Partial<ToothData>) => void;
}

const TOOTH_STATUS_COLORS: Record<ToothData["status"], string> = {
  healthy: "bg-white border-gray-300 hover:border-primary",
  caries: "bg-red-100 border-red-400 hover:border-red-500",
  filled: "bg-blue-100 border-blue-400 hover:border-blue-500",
  missing: "bg-gray-200 border-gray-400 opacity-50",
  crown: "bg-yellow-100 border-yellow-400 hover:border-yellow-500",
  implant: "bg-purple-100 border-purple-400 hover:border-purple-500",
  watch: "bg-amber-100 border-amber-400 hover:border-amber-500",
};

const FDI_TEETH = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
};

export const DentalChart = ({
  teethData,
  mode,
  selectedTeeth,
  onToothSelect,
}: DentalChartProps) => {
  const isEditable = mode === "current";

  const getToothData = (num: number): ToothData | undefined => 
    teethData.find((t) => t.toothNumber === num);

  const renderTooth = (num: number) => {
    const data = getToothData(num);
    const isSelected = selectedTeeth.includes(num);
    const status = data?.status || "healthy";

    return (
      <TooltipProvider key={num}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => isEditable && onToothSelect(num)}
              disabled={!isEditable || status === "missing"}
              className={`
                w-10 h-12 rounded-lg border-2 flex items-center justify-center
                text-xs font-mono font-semibold transition-all
                ${TOOTH_STATUS_COLORS[status]}
                ${isSelected ? "ring-2 ring-primary ring-offset-2" : ""}
                ${!isEditable ? "cursor-default" : "cursor-pointer"}
              `}
            >
              {num}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p className="font-semibold">Tooth {num}</p>
              <p className="capitalize">{status}</p>
              {data?.diagnoses?.length ? (
                <p className="text-muted-foreground">{data.diagnoses.join(", ")}</p>
              ) : null}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Dental Chart (FDI)</CardTitle>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(TOOTH_STATUS_COLORS).map(([status, color]) => (
              <Badge key={status} variant="outline" className={`text-xs ${color.split(" ")[0]}`}>
                {status}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Upper Jaw */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground px-2">
              <span>Q1 (Upper Right)</span>
              <span>Q2 (Upper Left)</span>
            </div>
            <div className="flex justify-center gap-1">
              <div className="flex gap-1">{FDI_TEETH.upperRight.map(renderTooth)}</div>
              <div className="w-4 flex items-center justify-center">
                <div className="w-px h-full bg-border" />
              </div>
              <div className="flex gap-1">{FDI_TEETH.upperLeft.map(renderTooth)}</div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-3/4 h-px bg-border" />
          </div>

          {/* Lower Jaw */}
          <div className="space-y-2">
            <div className="flex justify-center gap-1">
              <div className="flex gap-1">{FDI_TEETH.lowerRight.map(renderTooth)}</div>
              <div className="w-4 flex items-center justify-center">
                <div className="w-px h-full bg-border" />
              </div>
              <div className="flex gap-1">{FDI_TEETH.lowerLeft.map(renderTooth)}</div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground px-2">
              <span>Q4 (Lower Right)</span>
              <span>Q3 (Lower Left)</span>
            </div>
          </div>
        </div>

        {selectedTeeth.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Selected Teeth:</p>
            <div className="flex flex-wrap gap-1">
              {selectedTeeth.sort((a, b) => a - b).map((t) => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
