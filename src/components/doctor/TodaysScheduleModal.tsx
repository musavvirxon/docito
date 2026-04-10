import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, User, Phone, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface Appointment {
  id: string;
  patient_name?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  patient_phone?: string;
}

interface TodaysScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: Appointment[];
}

const TodaysScheduleModal = ({ isOpen, onClose, appointments }: TodaysScheduleModalProps) => {
  const today = new Date();
  const todaysAppointments = appointments.filter(apt => 
    new Date(apt.appointment_date).toDateString() === today.toDateString()
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'canceled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Today's Schedule - {format(today, 'EEEE, MMMM d, yyyy')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {todaysAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">No appointments scheduled for today</p>
              <p className="text-sm text-muted-foreground">Your schedule is clear</p>
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-4">
                {todaysAppointments.length} appointment{todaysAppointments.length > 1 ? 's' : ''} scheduled
              </div>
              
              {todaysAppointments
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((appointment) => (
                  <Card key={appointment.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {appointment.patient_name?.charAt(0) || 'P'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-medium">{appointment.patient_name}</h3>
                              <Badge className={getStatusColor(appointment.status)}>
                                {appointment.status}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {appointment.start_time} - {appointment.end_time}
                              </div>
                              {appointment.patient_phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-4 h-4" />
                                  {appointment.patient_phone}
                                </div>
                              )}
                            </div>
                            
                            {appointment.notes && (
                              <div className="flex items-start gap-1 text-sm">
                                <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                <p className="text-muted-foreground">{appointment.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {appointment.status === 'pending' && (
                            <Button size="sm" variant="outline">
                              Confirm
                            </Button>
                          )}
                          {appointment.status === 'confirmed' && (
                            <Button size="sm">
                              Start
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </>
          )}
          
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => {
              // Navigate to full calendar
              onClose();
            }}>
              View Full Calendar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TodaysScheduleModal;