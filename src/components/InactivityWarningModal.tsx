import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

interface InactivityWarningModalProps {
  open: boolean;
  countdown: number;
  onStayLoggedIn: () => void;
}

export const InactivityWarningModal = ({
  open,
  countdown,
  onStayLoggedIn,
}: InactivityWarningModalProps) => {
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-warning" />
            <AlertDialogTitle>Session Timeout Warning</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            You've been inactive for a while. For your security, you'll be automatically logged out in:
            <div className="text-2xl font-bold text-foreground mt-4 mb-2">
              {minutes > 0 && `${minutes}:`}
              {seconds.toString().padStart(2, '0')}s
            </div>
            Click "Stay Logged In" to continue your session.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onStayLoggedIn}>
            Stay Logged In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
