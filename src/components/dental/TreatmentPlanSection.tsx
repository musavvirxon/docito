import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToothProcedureHistory } from "@/hooks/useDentalChart";
import { 
  ClipboardList, Check, Clock, Play, X, 
  MoreVertical, Calendar, DollarSign 
} from "lucide-react";
import { format } from "date-fns";

interface TreatmentPlanSectionProps {
  procedures: ToothProcedureHistory[];
  isEditable: boolean;
  onUpdateStatus?: (id: string, status: "planned" | "in_progress" | "completed" | "cancelled") => void;
}

const STATUS_CONFIG = {
  planned: { 
    label: "Planned", 
    icon: Clock, 
    color: "bg-blue-100 text-blue-700 border-blue-200" 
  },
  in_progress: { 
    label: "In Progress", 
    icon: Play, 
    color: "bg-amber-100 text-amber-700 border-amber-200" 
  },
  completed: { 
    label: "Completed", 
    icon: Check, 
    color: "bg-green-100 text-green-700 border-green-200" 
  },
  cancelled: { 
    label: "Cancelled", 
    icon: X, 
    color: "bg-red-100 text-red-700 border-red-200" 
  },
};

export const TreatmentPlanSection = ({
  procedures,
  isEditable,
  onUpdateStatus,
}: TreatmentPlanSectionProps) => {
  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const groupedProcedures = {
    planned: procedures.filter(p => p.status === "planned"),
    in_progress: procedures.filter(p => p.status === "in_progress"),
    completed: procedures.filter(p => p.status === "completed"),
    cancelled: procedures.filter(p => p.status === "cancelled"),
  };

  const totalPlannedCost = groupedProcedures.planned.reduce(
    (sum, p) => sum + (p.cost || 0), 0
  );
  const totalCompletedCost = groupedProcedures.completed.reduce(
    (sum, p) => sum + (p.cost || 0), 0
  );

  if (procedures.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Treatment Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No procedures scheduled yet</p>
            <p className="text-sm">Select teeth and add procedures from the dental chart</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Treatment Plan
          </CardTitle>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Planned:</span>
              <span className="font-semibold">{formatCurrency(totalPlannedCost)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-muted-foreground">Completed:</span>
              <span className="font-semibold text-green-600">{formatCurrency(totalCompletedCost)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {procedures.map((procedure, index) => {
                const config = STATUS_CONFIG[procedure.status];
                const StatusIcon = config.icon;

                return (
                  <motion.div
                    key={procedure.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    {/* Status icon */}
                    <div className={`p-2 rounded-full ${config.color}`}>
                      <StatusIcon className="w-4 h-4" />
                    </div>

                    {/* Procedure details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{procedure.procedure_name}</span>
                        <Badge variant="outline" className={`text-xs ${config.color}`}>
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span>
                          Teeth: {procedure.tooth_numbers.sort((a, b) => a - b).join(", ")}
                        </span>
                        {procedure.cost && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatCurrency(procedure.cost)}
                          </span>
                        )}
                        {procedure.performed_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(procedure.performed_at), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                      {procedure.notes && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {procedure.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {isEditable && procedure.status !== "cancelled" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {procedure.status === "planned" && (
                            <DropdownMenuItem 
                              onClick={() => onUpdateStatus?.(procedure.id, "in_progress")}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Start Procedure
                            </DropdownMenuItem>
                          )}
                          {procedure.status !== "completed" && (
                            <DropdownMenuItem 
                              onClick={() => onUpdateStatus?.(procedure.id, "completed")}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Mark Complete
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => onUpdateStatus?.(procedure.id, "cancelled")}
                            className="text-destructive"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
