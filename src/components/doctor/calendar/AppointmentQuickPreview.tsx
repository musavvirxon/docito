import { memo, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, Phone, Mail, Video, MessageSquare, User,
  Play, FileText, MapPin, Home, ArrowRight, CheckCircle, XCircle,
  Stethoscope, Activity
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CalendarAppointment } from './types';

interface AppointmentQuickPreviewProps {
  appointment: CalendarAppointment | null;
  isOpen: boolean;
  onClose: () => void;
  onStartSession: (appointment: CalendarAppointment) => void;
  onViewPatient: (patientId: string, patientType: 'registered' | 'direct') => void;
  onOpenFullModal: () => void;
  doctorSpecialty?: string;
}

const typeIcons = {
  'in_person': MapPin,
  'in-person': MapPin,
  'video': Video,
  'home_visit': Home,
  'home': Home,
  'messaging': MessageSquare,
  'chat': MessageSquare,
  'follow_up': Activity,
};

const typeLabels = {
  'in_person': 'In-Person',
  'in-person': 'In-Person',
  'video': 'Video Call',
  'home_visit': 'Home Visit',
  'home': 'Home Visit',
  'messaging': 'Messaging',
  'chat': 'Messaging',
  'follow_up': 'Follow-up',
};

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-600 border-blue-200',
  confirmed: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  completed: 'bg-muted text-muted-foreground border-border',
  canceled: 'bg-destructive/10 text-destructive border-destructive/20',
  'no-show': 'bg-amber-500/10 text-amber-600 border-amber-200',
  in_progress: 'bg-green-500/10 text-green-600 border-green-200',
};

const AppointmentQuickPreview = memo(({
  appointment,
  isOpen,
  onClose,
  onStartSession,
  onViewPatient,
  onOpenFullModal,
  doctorSpecialty = '',
}: AppointmentQuickPreviewProps) => {
  const { t, i18n } = useTranslation('dashboard');
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);
  const isRTL = i18n.language === 'ar';

  const handleStartSession = useCallback(async () => {
    if (!appointment) return;
    setIsStarting(true);

    try {
      // Create appointment session
      const { data: session, error: sessionError } = await supabase
        .from('appointment_sessions')
        .upsert({
          appointment_id: appointment.id,
          doctor_id: appointment.doctor_id,
          patient_id: appointment.patient_id || null,
          session_type: (appointment.appointment_type || 'in_person') as any,
          session_status: 'active',
          started_at: new Date().toISOString(),
        }, {
          onConflict: 'appointment_id',
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Update appointment status
      await supabase
        .from('appointments')
        .update({
          status: 'confirmed' as any,
          started_at: new Date().toISOString(),
        })
        .eq('id', appointment.id);

      onStartSession(appointment);
      onClose();
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start appointment session');
    } finally {
      setIsStarting(false);
    }
  }, [appointment, onStartSession, onClose]);

  const handleViewPatient = useCallback(() => {
    if (!appointment) return;
    
    const patientId = appointment.patient_id;
    const patientType = patientId ? 'registered' : 'direct';
    
    onViewPatient(patientId || '', patientType);
    onClose();
  }, [appointment, onViewPatient, onClose]);

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

  const appointmentType = appointment.appointment_type || 'in-person';
  const TypeIcon = typeIcons[appointmentType as keyof typeof typeIcons] || MapPin;
  const typeLabel = typeLabels[appointmentType as keyof typeof typeLabels] || 'In-Person';

  const isToday = new Date(appointment.appointment_date).toDateString() === new Date().toDateString();
  const now = new Date();
  const [hours, minutes] = appointment.start_time.split(':').map(Number);
  const appointmentTime = new Date(appointment.appointment_date);
  appointmentTime.setHours(hours, minutes, 0, 0);
  
  const canStart = isToday && 
    ['scheduled', 'confirmed', 'pending'].includes(appointment.status) &&
    now >= new Date(appointmentTime.getTime() - 15 * 60 * 1000); // 15 min before

  const isDentist = doctorSpecialty?.toLowerCase().includes('dent');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-background shadow-lg">
                <AvatarImage src={appointment.patient_avatar} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {appointment.patient_name}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 text-sm mt-0.5">
                  <TypeIcon className="h-3.5 w-3.5" />
                  {typeLabel}
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn('capitalize text-xs', statusColors[appointment.status])}
            >
              {appointment.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date & Time */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(appointment.appointment_date), 'EEE, MMM d')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{appointment.start_time} - {appointment.end_time}</span>
            </div>
          </div>

          {/* Contact Info */}
          <div className="flex flex-wrap gap-3 text-sm">
            {appointment.patient_phone && (
              <a 
                href={`tel:${appointment.patient_phone}`}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                {appointment.patient_phone}
              </a>
            )}
            {appointment.patient_email && (
              <a 
                href={`mailto:${appointment.patient_email}`}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                {appointment.patient_email}
              </a>
            )}
          </div>

          {/* Notes preview */}
          {appointment.notes && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="line-clamp-2">{appointment.notes}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-3">
          {canStart && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button 
                onClick={handleStartSession}
                disabled={isStarting}
                className="w-full gap-2"
                size="lg"
              >
                <Play className="h-4 w-4" />
                {appointmentType === 'video' ? 'Start Video Call' : 'Start Appointment'}
              </Button>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleViewPatient}
              className="gap-2"
            >
              <User className="h-4 w-4" />
              View Patient
            </Button>
            <Button
              variant="outline"
              onClick={handleMessage}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Message
            </Button>
          </div>

          {isDentist && (
            <Button
              variant="secondary"
              onClick={() => {
                if (appointment.patient_id) {
                  navigate(`/patient-dashboard/${appointment.patient_id}?tab=dental`);
                  onClose();
                }
              }}
              className="w-full gap-2"
            >
              <Stethoscope className="h-4 w-4" />
              Open Dental Chart
            </Button>
          )}
        </div>

        <Separator />

        <div className={cn(
          "flex items-center justify-between text-sm",
          isRTL && "flex-row-reverse"
        )}>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button 
            variant="link" 
            size="sm" 
            onClick={onOpenFullModal}
            className="gap-1"
          >
            More Details
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

AppointmentQuickPreview.displayName = 'AppointmentQuickPreview';

export default AppointmentQuickPreview;
