import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DENTAL_PROCEDURES, ToothProcedure } from "./types";
import { DentalProcedure } from "@/hooks/useDentalChart";
import { Check, Stethoscope, Baby, Sparkles, Scissors, Shield } from "lucide-react";

interface ProcedureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTeeth: number[];
  onAssignProcedure: (procedure: Omit<ToothProcedure, "id">) => void;
  dbProcedures?: DentalProcedure[];
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  restorative: Stethoscope,
  surgical: Scissors,
  endodontic: Stethoscope,
  preventive: Shield,
  pediatric: Baby,
  cosmetic: Sparkles,
  prosthetic: Stethoscope,
  diagnostic: Stethoscope,
  periodontic: Stethoscope,
};

const CATEGORY_COLORS: Record<string, string> = {
  restorative: "bg-blue-100 text-blue-700 border-blue-200",
  surgical: "bg-red-100 text-red-700 border-red-200",
  endodontic: "bg-purple-100 text-purple-700 border-purple-200",
  preventive: "bg-green-100 text-green-700 border-green-200",
  pediatric: "bg-pink-100 text-pink-700 border-pink-200",
  cosmetic: "bg-amber-100 text-amber-700 border-amber-200",
  prosthetic: "bg-slate-100 text-slate-700 border-slate-200",
  diagnostic: "bg-cyan-100 text-cyan-700 border-cyan-200",
  periodontic: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

export const ProcedureModal = ({
  open,
  onOpenChange,
  selectedTeeth,
  onAssignProcedure,
  dbProcedures,
}: ProcedureModalProps) => {
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const proceduresList = dbProcedures?.length 
    ? dbProcedures.map(p => ({ id: p.code || p.id, name: p.name, category: p.category }))
    : DENTAL_PROCEDURES;

  const categories = ["all", ...new Set(proceduresList.map((p) => p.category))];

  const filteredProcedures =
    activeCategory === "all"
      ? proceduresList
      : proceduresList.filter((p) => p.category === activeCategory);

  const handleAssign = () => {
    if (!selectedProcedure) return;
    const procedure = proceduresList.find((p) => p.id === selectedProcedure);
    if (!procedure) return;

    onAssignProcedure({
      name: procedure.name,
      code: procedure.id,
      status: "planned",
      date: new Date().toISOString(),
      notes: notes || undefined,
    });

    setSelectedProcedure(null);
    setNotes("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedProcedure(null);
    setNotes("");
    onOpenChange(false);
  };

  const getButtonClassName = (isSelected: boolean, colorClass: string): string => {
    const base = "p-3 rounded-lg border-2 text-left transition-all duration-200";
    if (isSelected) {
      return `${base} border-primary bg-primary/10 ring-2 ring-primary/20`;
    }
    return `${base} ${colorClass} hover:border-primary/50`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            Assign Procedure
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Selected Teeth:</p>
            <div className="flex flex-wrap gap-1">
              {selectedTeeth.sort((a, b) => a - b).map((tooth) => (
                <Badge key={tooth} variant="secondary">
                  {tooth}
                </Badge>
              ))}
            </div>
          </div>

          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="capitalize text-xs">
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeCategory} className="mt-3">
              <ScrollArea className="h-[200px]">
                <div className="grid grid-cols-2 gap-2">
                  {filteredProcedures.map((procedure) => {
                    const Icon = CATEGORY_ICONS[procedure.category] || Stethoscope;
                    const isSelected = selectedProcedure === procedure.id;
                    const colorClass = CATEGORY_COLORS[procedure.category] || "bg-gray-100 text-gray-700 border-gray-200";
                    const buttonClassName = getButtonClassName(isSelected, colorClass);

                    return React.createElement('button', {
                      key: procedure.id,
                      type: 'button',
                      onClick: () => setSelectedProcedure(procedure.id),
                      className: buttonClassName,
                    }, 
                      React.createElement('div', { className: "flex items-center gap-2" }, [
                        React.createElement(Icon, { key: 'icon', className: "w-4 h-4 flex-shrink-0" }),
                        React.createElement('span', { key: 'name', className: "text-sm font-medium" }, procedure.name),
                        isSelected && React.createElement(Check, { key: 'check', className: "w-4 h-4 text-primary ml-auto flex-shrink-0" })
                      ])
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div>
            <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add procedure notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedProcedure}>
            Assign Procedure
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};