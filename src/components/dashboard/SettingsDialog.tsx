import * as React from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function SettingsDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation("dashboard");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">{t("shell.settingsDialog.title", "Settings")}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <SettingsPanel open={open} onOpenChange={onOpenChange} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
