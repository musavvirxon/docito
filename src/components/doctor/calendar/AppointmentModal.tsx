import { memo, useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { 
  Calendar, Clock, Phone, Mail, FileText, Pill, Video, MessageSquare, 
  CheckCircle, XCircle, Edit, ArrowRightLeft, Stethoscope, DollarSign,
  ClipboardList, CalendarPlus, Check, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import CancelAppointmentDialog from './CancelAppointmentDialog';
import { RescheduleAppointmentModal } from '@/components/appointments/RescheduleAppointmentModal';
import type { CalendarAppointment } from './types';

interface AppointmentProcedure {
  id: string;
  procedure_id: string | null;
  procedure_name?: string;
  status: string | null;
  estimated_cost: number | null;
  procedure_notes: string | null;
}

interface TreatmentPlan {
  id: string;
  title: string;
  status: string | null;
  total_cost: number | null;
  created_at: string;
}

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
  confirmed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  completed: 'bg-muted text-muted-foreground border-border',
  canceled: 'bg-destructive/10 text-destructive border-destructive/20',
  'no-show': 'bg-amber-500/10 text-amber-600 border-amber-200',
  in_progress: 'bg-green-500/10 text-green-600 border-green-200',
};

const procedureStatusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600',
  completed: 'bg-emerald-500/10 text-emerald-600',
  cancelled: 'bg-destructive/10 text-destructive',
  in_progress: 'bg-blue-500/10 text-blue-600',
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
}: AppointmentModalProps) => {
  const { t, i18n } = useTranslation('dashboard');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const isRTL = i18n.language === 'ar';

  // Procedures and treatment plans
  const [appointmentProcedures, setAppointmentProcedures] = useState<AppointmentProcedure[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [loadingProcedures, setLoadingProcedures] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Fetch procedures for this appointment
  useEffect(() => {
    if (!appointment?.id || !isOpen) return;

    const fetchProcedures = async () => {
      setLoadingProcedures(true);
      try {
        const { data, error } = await (supabase as any)
          .from('appointment_procedures')
          .select(`
            id,
            procedure_id,
            status,
            estimated_cost,
            procedure_notes,
            procedures:procedure_id(name, category)
          `)
          .eq('appointment_id', appointment.id);

        if (error) throw error;

        const procs: AppointmentProcedure[] = (data || []).map((p: any) => ({
          id: p.id,
          procedure_id: p.procedure_id,
          procedure_name: p.procedures?.name || 'Unknown Procedure',
          status: p.status,
          estimated_cost: p.estimated_cost,
          procedure_notes: p.procedure_notes,
        }));

        setAppointmentProcedures(procs);
      } catch (err) {
        console.error('Error fetching procedures:', err);
      } finally {
        setLoadingProcedures(false);
      }
    };

    fetchProcedures();
  }, [appointment?.id, isOpen]);

  // Fetch treatment plans for this patient
  useEffect(() => {
    if (!appointment || !isOpen) return;

    const patientId = appointment.patient_id || appointment.doctor_patient_id;
    if (!patientId) return;

    const fetchTreatmentPlans = async () => {
      setLoadingPlans(true);
      try {
        const column = appointment.patient_id ? 'patient_id' : 'doctor_patient_id';
        const { data, error } = await (supabase as any)
          .from('treatment_plans')
          .select('id, title, status, total_cost, created_at')
          .eq(column, patientId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setTreatmentPlans(data || []);
      } catch (err) {
        console.error('Error fetching treatment plans:', err);
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchTreatmentPlans();
  }, [appointment, isOpen]);

  const handleMarkProcedureDone = useCallback(async (procedureId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('appointment_procedures')
        .update({ status: 'completed' })
        .eq('id', procedureId);

      if (error) throw error;

      setAppointmentProcedures(prev =>
        prev.map(p => p.id === procedureId ? { ...p, status: 'completed' } : p)
      );
      toast.success('Procedure marked as completed');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update procedure');
    }
  }, []);

  const handleBookFollowUp = useCallback(() => {
    if (!appointment) return;
    // Navigate to calendar with prefilled patient
    const patientKey = appointment.patient_id 
      ? `reg:${appointment.patient_id}` 
      : `dp:${appointment.doctor_patient_id}`;
    navigate(`/doctor-dashboard?section=calendar&patient=${patientKey}&followup=true`);
    onClose();
  }, [appointment, navigate, onClose]);

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
    setIsRescheduleModalOpen(true);
  }, [appointment]);

  const handleRescheduleComplete = useCallback(() => {
    setIsRescheduleModalOpen(false);
    onReschedule?.();
    onClose();
  }, [onReschedule, onClose]);

  const handleMessage = useCallback(async () => {
    if (!appointment?.patient_id) {
      toast.error('Patient information not available');
      return;
    }

    try {
      const { data: existing, error: e1 } = await supabase
        .from('conversations')
        .select('id')
        .eq('context_type', 'visit')
        .eq('context_id', appointment.id)
        .maybeSingle();

      if (e1) throw e1;

      if (existing?.id) {
        navigate(`/messages?c=${existing.id}`);
        onClose();
        return;
      }

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

  const initials = appointment.patient_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'P';
  const isActiveAppointment = appointment.status === 'confirmed';
  const isToday = new Date(appointment.appointment_date).toDateString() === new Date().toDateString();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-background shadow-lg">
                <AvatarImage src={appointment.patient_avatar || ''} />
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
            <Badge variant="outline" className={cn('capitalize text-sm', statusColors[appointment.status] || '')}>
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
            <TabsTrigger value="details">{t('doctor.calendar.details', 'Details')}</TabsTrigger>
            <TabsTrigger value="procedures" className="gap-1.5">
              <Stethoscope className="h-3.5 w-3.5" />
              Procedures
              {appointmentProcedures.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {appointmentProcedures.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="treatment-plans" className="gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              Treatment Plans
            </TabsTrigger>
            <TabsTrigger value="patient">{t('doctor.calendar.patient', 'Patient')}</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="details" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">
                    {t('doctor.calendar.appointmentType', 'Type')}
                  </span>
                  <p className="font-medium capitalize flex items-center gap-2">
                    {appointment.appointment_type === 'video' && <Video className="h-4 w-4" />}
                    {(appointment.appointment_type === 'chat' || appointment.appointment_type === 'messaging') && (
                      <MessageSquare className="h-4 w-4" />
                    )}
                    {appointment.appointment_type || 'In-Person'}
                  </p>
                </div>
                {appointment.procedure_name && (
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">{t('doctor.calendar.procedure', 'Procedure')}</span>
                    <p className="font-medium">{appointment.procedure_name}</p>
                    {appointment.procedure_cost && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatCurrency(appointment.procedure_cost)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {appointment.notes && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('doctor.calendar.notes', 'Notes')}
                  </span>
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">{appointment.notes}</div>
                </div>
              )}

              {appointment.status === 'pending' && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-300">
                  Waiting for patient acceptance. You can start after it becomes <b>confirmed</b>.
                </div>
              )}

              {/* Quick booking actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleBookFollowUp} className="gap-2">
                  <CalendarPlus className="h-4 w-4" />
                  Book Follow-up
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="procedures" className="mt-4 space-y-4">
              {loadingProcedures ? (
                <div className="text-center py-8 text-muted-foreground">Loading procedures...</div>
              ) : appointmentProcedures.length === 0 ? (
                <div className="text-center py-8">
                  <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No procedures assigned to this appointment</p>
                  <Button variant="outline" size="sm" className="mt-4 gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Add Procedure
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointmentProcedures.map((proc) => (
                    <Card key={proc.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{proc.procedure_name}</h4>
                              <Badge 
                                variant="outline" 
                                className={cn('text-xs capitalize', procedureStatusColors[proc.status || 'pending'])}
                              >
                                {proc.status || 'pending'}
                              </Badge>
                            </div>
                            {proc.estimated_cost && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <DollarSign className="h-3.5 w-3.5" />
                                {formatCurrency(proc.estimated_cost)}
                              </p>
                            )}
                            {proc.procedure_notes && (
                              <p className="text-sm text-muted-foreground">{proc.procedure_notes}</p>
                            )}
                          </div>
                          {proc.status !== 'completed' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleMarkProcedureDone(proc.id)}
                              className="gap-1.5"
                            >
                              <Check className="h-4 w-4" />
                              Mark Done
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="treatment-plans" className="mt-4 space-y-4">
              {loadingPlans ? (
                <div className="text-center py-8 text-muted-foreground">Loading treatment plans...</div>
              ) : treatmentPlans.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No treatment plans for this patient</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4 gap-2"
                    onClick={() => {
                      navigate('/doctor-dashboard?section=treatment-planning');
                      onClose();
                    }}
                  >
                    <ClipboardList className="h-4 w-4" />
                    Create Treatment Plan
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {treatmentPlans.map((plan) => (
                    <Card 
                      key={plan.id} 
                      className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => {
                        navigate(`/doctor-dashboard?section=treatment-planning&plan=${plan.id}`);
                        onClose();
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium">{plan.title}</h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <Badge 
                                variant="outline" 
                                className={cn('text-xs capitalize', procedureStatusColors[plan.status || 'draft'])}
                              >
                                {plan.status || 'draft'}
                              </Badge>
                              {plan.total_cost && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  {formatCurrency(plan.total_cost)}
                                </span>
                              )}
                              <span>{format(new Date(plan.created_at), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="patient" className="mt-4 space-y-4">
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

              <Button variant="outline" onClick={handleMessage} className="w-full gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('doctor.calendar.sendMessage', 'Send Message')}
              </Button>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <Separator className="my-4" />
        <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
          <div className={cn('flex gap-2', isRTL && 'flex-row-reverse')}>
            {(appointment.status === 'confirmed' || appointment.status === 'pending') && (
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

      <CancelAppointmentDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleCancelAppointment}
        patientName={appointment.patient_name}
      />

      <RescheduleAppointmentModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        appointmentId={appointment.id}
        doctorId={appointment.doctor_id}
        patientName={appointment.patient_name}
        currentDate={appointment.appointment_date}
        currentTime={appointment.start_time}
        onRescheduled={handleRescheduleComplete}
      />
    </Dialog>
  );
});

AppointmentModal.displayName = 'AppointmentModal';

export default AppointmentModal;