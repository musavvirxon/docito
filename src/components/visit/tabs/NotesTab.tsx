import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Save, Clock } from "lucide-react";
import { SOAPNotes, VisitMode } from "../types";

interface NotesTabProps {
  notes: SOAPNotes | undefined;
  mode: VisitMode;
  onNotesChange: (notes: SOAPNotes) => void;
  lastSaved?: Date;
}

export const NotesTab = ({
  notes,
  mode,
  onNotesChange,
  lastSaved,
}: NotesTabProps) => {
  const isEditable = mode === "current";

  const [localNotes, setLocalNotes] = useState<SOAPNotes>({
    subjective: notes?.subjective || "",
    objective: notes?.objective || "",
    assessment: notes?.assessment || "",
    plan: notes?.plan || "",
  });

  useEffect(() => {
    if (notes) {
      setLocalNotes(notes);
    }
  }, [notes]);

  // Auto-save with debounce
  useEffect(() => {
    if (!isEditable) return;

    const timer = setTimeout(() => {
      onNotesChange(localNotes);
    }, 1000);

    return () => clearTimeout(timer);
  }, [localNotes, isEditable, onNotesChange]);

  const handleChange = (field: keyof SOAPNotes, value: string) => {
    setLocalNotes((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const soapSections = [
    {
      key: "subjective" as const,
      title: "Subjective",
      label: "S",
      description: "Patient's complaints, symptoms, and history as described by them",
      placeholder: "Chief complaint, history of present illness, review of systems...",
      color: "bg-blue-500",
    },
    {
      key: "objective" as const,
      title: "Objective",
      label: "O",
      description: "Clinical findings from examination and tests",
      placeholder: "Vital signs, physical examination findings, test results...",
      color: "bg-green-500",
    },
    {
      key: "assessment" as const,
      title: "Assessment",
      label: "A",
      description: "Diagnosis or differential diagnoses based on findings",
      placeholder: "Primary diagnosis, differential diagnoses, severity assessment...",
      color: "bg-amber-500",
    },
    {
      key: "plan" as const,
      title: "Plan",
      label: "P",
      description: "Treatment plan, prescriptions, follow-up recommendations",
      placeholder: "Medications, procedures, referrals, follow-up schedule...",
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Clinical Notes</h2>
          <p className="text-sm text-muted-foreground">
            SOAP format documentation
          </p>
        </div>
        {isEditable && lastSaved && (
          <Badge variant="outline" className="gap-1.5">
            <Save className="h-3 w-3" />
            Auto-saved {lastSaved.toLocaleTimeString()}
          </Badge>
        )}
      </div>

      {isEditable ? (
        <div className="grid gap-6">
          {soapSections.map((section) => (
            <Card key={section.key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-full ${section.color} text-white flex items-center justify-center text-sm font-bold`}
                  >
                    {section.label}
                  </span>
                  <div>
                    <span>{section.title}</span>
                    <p className="text-xs font-normal text-muted-foreground mt-0.5">
                      {section.description}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={localNotes[section.key]}
                  onChange={(e) => handleChange(section.key, e.target.value)}
                  placeholder={section.placeholder}
                  rows={4}
                  className="resize-none"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Read-only view
        <div className="space-y-4">
          {soapSections.map((section) => (
            <Card key={section.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full ${section.color} text-white flex items-center justify-center text-xs font-bold`}
                  >
                    {section.label}
                  </span>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {localNotes[section.key] ? (
                  <p className="text-sm whitespace-pre-wrap">
                    {localNotes[section.key]}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No {section.title.toLowerCase()} notes recorded
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!notes?.subjective &&
        !notes?.objective &&
        !notes?.assessment &&
        !notes?.plan &&
        !isEditable && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No clinical notes recorded</p>
            </CardContent>
          </Card>
        )}
    </div>
  );
};
