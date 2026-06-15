import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ViewRequirementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_KEYS = ["business", "credentials", "compliance", "practice"] as const;

export function ViewRequirementsModal({ open, onOpenChange }: ViewRequirementsModalProps) {
  const { t } = useTranslation("dashboard");
  const process = t("shell.viewRequirements.process", { returnObjects: true }) as string[];
  const notes = t("shell.viewRequirements.notes", { returnObjects: true }) as string[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("shell.viewRequirements.title", "Verification Requirements")}</DialogTitle>
          <DialogDescription>
            {t("shell.viewRequirements.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t("shell.viewRequirements.requiredHeading")}
            </h3>
            <div className="space-y-4">
              {CATEGORY_KEYS.map((key) => {
                const items = t(`shell.viewRequirements.categories.${key}.items`, {
                  returnObjects: true,
                }) as string[];
                return (
                  <Card key={key}>
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">
                        {t(`shell.viewRequirements.categories.${key}.name`)}
                      </h4>
                      <ul className="space-y-1.5">
                        {items.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {t("shell.viewRequirements.processHeading")}
            </h3>
            <Card>
              <CardContent className="p-4">
                <ol className="space-y-2">
                  {process.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">{t("shell.viewRequirements.notesTitle")}</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {notes.map((note, idx) => (
                <li key={idx}>• {note}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            {t("shell.viewRequirements.close", "Close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
