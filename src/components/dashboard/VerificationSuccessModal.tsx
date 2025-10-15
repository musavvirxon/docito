import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Users, Clock, TrendingUp, Settings } from "lucide-react";

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
  const features = [
    {
      icon: Users,
      text: "Add and manage doctors and staff",
    },
    {
      icon: Clock,
      text: "Set clinic hours and service restrictions",
    },
    {
      icon: TrendingUp,
      text: "Access financial and performance stats",
    },
    {
      icon: Settings,
      text: "Update your profile and settings",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <DialogTitle className="text-2xl text-center">
            🎉 Congratulations!
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            <span className="font-semibold">{practiceName}</span> has been successfully verified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm font-medium text-muted-foreground">You can now:</p>
          <div className="space-y-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-sm">{feature.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        <Button
          onClick={() => onOpenChange(false)}
          className="w-full"
          size="lg"
        >
          Go to Dashboard
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default VerificationSuccessModal;
