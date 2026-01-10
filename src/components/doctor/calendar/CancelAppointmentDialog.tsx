import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CancelAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  patientName?: string;
}

const CancelAppointmentDialog = memo(({
  isOpen,
  onClose,
  onConfirm,
  patientName,
}: CancelAppointmentDialogProps) => {
  const { t } = useTranslation('dashboard');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(reason || undefined);
      setReason('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>
              {t('doctor.calendar.cancelConfirmTitle', 'Cancel Appointment')}
            </AlertDialogTitle>
          </motion.div>
          <AlertDialogDescription className="pt-2">
            {t('doctor.calendar.cancelConfirm', 'Are you sure you want to cancel this appointment?')}
            {patientName && (
              <span className="block mt-1 font-medium text-foreground">
                {patientName}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="cancel-reason">
            {t('doctor.calendar.cancelReason', 'Cancellation reason (optional)')}
          </Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('doctor.calendar.cancelReason', 'Cancellation reason (optional)')}
            className="min-h-[80px]"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {t('doctor.calendar.keepAppointment', 'Keep Appointment')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? '...' : t('doctor.calendar.confirmCancel', 'Yes, Cancel')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

CancelAppointmentDialog.displayName = 'CancelAppointmentDialog';

export default CancelAppointmentDialog;
