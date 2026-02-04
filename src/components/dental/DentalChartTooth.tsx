import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToothSVG } from "./ToothSVG";
import { ToothStatus, ToothType, TOOTH_STATUS_CONFIG } from "./types";

interface DentalChartToothProps {
  number: number;
  toothType: ToothType;
  status: ToothStatus;
  isSelected: boolean;
  isEditable: boolean;
  onSelect: () => void;
  hasProcedure?: boolean;
}

export const DentalChartTooth = ({
  number,
  toothType,
  status,
  isSelected,
  isEditable,
  onSelect,
  hasProcedure,
}: DentalChartToothProps) => {
  const statusLabel = TOOTH_STATUS_CONFIG[status]?.label ?? status;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center">
            <ToothSVG
              number={number}
              toothType={toothType}
              status={status}
              isSelected={isSelected}
              isEditable={isEditable}
              onClick={onSelect}
              hasProcedure={hasProcedure}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-0.5">
            <div className="font-medium">Tooth {number}</div>
            <div className="text-muted-foreground">{statusLabel}</div>
            {hasProcedure && (
              <div className="text-muted-foreground">Has procedures</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
