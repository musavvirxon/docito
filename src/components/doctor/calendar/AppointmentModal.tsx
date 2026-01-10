import { memo, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, Phone, Mail, FileText, Pill, Video, MessageSquare, CheckCircle, XCircle, Edit, ArrowRightLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import CancelAppointmentDialog from './CancelAppointmentDialog';
import type { CalendarAppointment } from './types';

interface AppointmentModalProps {
  appointment: CalendarAppointment | null;
  isOpen: boolean;
  onClose: () => void;
  onStartVisit?: () => void;
  onAddNote?: () => void;
  onAddPrescription?: () => void;
  onMarkComplete?: () => void;
  onReschedule?: () => void;
  onCancel?: () => void;
  onMessage?: () => void;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-600 border-blue-200',
  confirmed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  completed: 'bg-muted text-muted-foreground border-border',
  canceled: 'bg-destructive/10 text-destructive border-destructive/20',
  'no-show': 'bg-amber-500/10 text-amber-600 border-amber-200',
};

const AppointmentModal = memo(({
  appointment,
  isOpen,
  onClose,
  onStartVisit,
  onAddNote,
  onAddPrescription,
  onMarkComplete,
  onReschedule,
  onCancel,
  onMessage,
}: AppointmentModalProps) => {
  const { t, i18n } = useTranslation('dashboard');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  
  const isRTL = i18n.language === 'ar';

  const handleCancelAppointment = useCallback(async (reason?: string) => {
    if (!appointment) return;
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'canceled' as any,
          notes: reason ? `${appointment.notes || ''}\n[Cancellation reason]: ${reason}`.trim() : appointment.notes
        })
        .eq('id', appointment.id);
      
      if (error) throw error;
      
      toast.success(t('doctor.calendar.cancelSuccess', 'Appointment cancelled successfully'));
      setIsCancelDialogOpen(false);
      onCancel?.();
      onClose();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  }, [appointment, t, onCancel, onClose]);

  const handleReschedule = useCallback(() => {
    if (!appointment) return;
    setIsRescheduling(true);
    // For now, we'll just show a toast - in production, this would open a reschedule modal
    toast.info('Reschedule feature coming soon');
    setIsRescheduling(false);
    onReschedule?.();
  }, [appointment, onReschedule]);

  const handleMessage = useCallback(async () => {
    if (!appointment?.patient_id) {
      toast.error('Patient information not available');
      return;
    }
    
    try {
      const { data: conversationId, error } = await supabase.rpc(
        'create_direct_conversation' as any,
        { target_user_id: appointment.patient_id } as any
      );
      
      if (error) throw error;
      
      navigate(`/messages?c=${conversationId}`);
      onClose();
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
    }
  }, [appointment, navigate, onClose]);

  if (!appointment) return null;

  const initials = appointment.patient_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'P';

  const isActiveAppointment = appointment.status === 'confirmed' || appointment.status === 'scheduled';
  const isPastAppointment = appointment.status === 'completed';
  const isToday = new Date(appointment.appointment_date).toDateString() === new Date().toDateString();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-background shadow-lg">
                <AvatarImage src={appointment.patient_avatar} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                  {appointment.patient_name}
                  {appointment.source === 'referral' && (
                    <Badge variant="secondary" className="text-xs">
                      <ArrowRightLeft className="h-3 w-3 mr-1" />
                      Referral
                    </Badge>
                  )}
                </DialogTitle>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(appointment.appointment_date), 'EEEE, MMMM d, yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {appointment.start_time} - {appointment.end_time}
                  </span>
                </div>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn('capitalize text-sm', statusColors[appointment.status])}
            >
              {appointment.status}
            </Badge>
          </div>
        </DialogHeader>

        {/* Quick Actions for Active Appointments */}
        {isActiveAppointment && isToday && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 pt-4"
          >
            <Button onClick={onStartVisit} className="gap-2">
              <Video className="h-4 w-4" />
              {t('doctor.calendar.startVisit', 'Start Visit')}
            </Button>
            <Button variant="outline" onClick={onAddNote} className="gap-2">
              <FileText className="h-4 w-4" />
              {t('doctor.calendar.addNote', 'Add Note')}
            </Button>
            <Button variant="outline" onClick={onAddPrescription} className="gap-2">
              <Pill className="h-4 w-4" />
              {t('doctor.calendar.addPrescription', 'Add Prescription')}
            </Button>
            <Button variant="outline" onClick={onMarkComplete} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              {t('doctor.calendar.markComplete', 'Mark Complete')}
            </Button>
          </motion.div>
        )}

        <Separator className="my-4" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="details">
              {t('doctor.calendar.details', 'Details')}
            </TabsTrigger>
            <TabsTrigger value="patient">
              {t('doctor.calendar.patient', 'Patient')}
            </TabsTrigger>
            {appointment.source === 'referral' && (
              <TabsTrigger value="referral">
                {t('doctor.calendar.referral', 'Referral')}
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="details" className="mt-4 space-y-4">
              {/* Appointment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">
                    {t('doctor.calendar.appointmentType', 'Type')}
                  </span>
                  <p className="font-medium capitalize flex items-center gap-2">
                    {appointment.appointment_type === 'video' && <Video className="h-4 w-4" />}
                    {appointment.appointment_type === 'chat' && <MessageSquare className="h-4 w-4" />}
                    {appointment.appointment_type || 'In-Person'}
                  </p>
                </div>
                {appointment.procedure_name && (
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">
                      {t('doctor.calendar.procedure', 'Procedure')}
                    </span>
                    <p className="font-medium">{appointment.procedure_name}</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {appointment.notes && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('doctor.calendar.notes', 'Notes')}
                  </span>
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    {appointment.notes}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="patient" className="mt-4 space-y-4">
              {/* Patient Contact Info */}
              <div className="space-y-3">
                {appointment.patient_phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{appointment.patient_phone}</p>
                    </div>
                  </div>
                )}
                {appointment.patient_email && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{appointment.patient_email}</p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                onClick={handleMessage}
                className="w-full gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                {t('doctor.calendar.sendMessage', 'Send Message')}
              </Button>
            </TabsContent>

            <TabsContent value="referral" className="mt-4 space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">
                  {t('doctor.calendar.referralAppointment', 'Referral Appointment')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('doctor.calendar.referralDetails', 'This appointment was created from a referral.')}
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer Actions */}
        <Separator className="my-4" />
        <div className={cn(
          "flex items-center justify-between",
          isRTL && "flex-row-reverse"
        )}>
          <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
            {isActiveAppointment && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleReschedule} 
                  disabled={isRescheduling}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {t('doctor.calendar.reschedule', 'Reschedule')}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCancelDialogOpen(true)} 
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4" />
                  {t('doctor.calendar.cancel', 'Cancel')}
                </Button>
              </>
            )}
          </div>
          <Button variant="ghost" onClick={onClose}>
            {t('doctor.calendar.close', 'Close')}
          </Button>
        </div>
      </DialogContent>

      {/* Cancel Confirmation Dialog */}
      <CancelAppointmentDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleCancelAppointment}
        patientName={appointment.patient_name}
      />
    </Dialog>
  );
});

AppointmentModal.displayName = 'AppointmentModal';

export default AppointmentModal;
