import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Users, Clock, TrendingUp, Settings } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";

interface VerificationSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practiceName: string;
}

const VerificationSuccessModal = ({
  open,
  onOpenChange,
  practiceName,
}: VerificationSuccessModalProps) => {
  const { t } = useTranslation("dashboard");

  const features = [
    { icon: Users, key: "manageStaff" },
    { icon: Clock, key: "setHours" },
    { icon: TrendingUp, key: "stats" },
    { icon: Settings, key: "updateProfile" },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <DialogTitle className="text-2xl text-center">
            {t("shell.verificationSuccess.congrats", "🎉 Congratulations!")}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            <Trans
              ns="dashboard"
              i18nKey="shell.verificationSuccess.verifiedMsg"
              values={{ practiceName }}
              components={[<span className="font-semibold" />]}
            />
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm font-medium text-muted-foreground">
            {t("shell.verificationSuccess.youCanNow", "You can now:")}
          </p>
          <div className="space-y-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.key} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-sm">
                    {t(`shell.verificationSuccess.features.${feature.key}`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <Button onClick={() => onOpenChange(false)} className="w-full" size="lg">
          {t("shell.verificationSuccess.goDashboard", "Go to Dashboard")}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default VerificationSuccessModal;
