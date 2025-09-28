import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, MapPin } from "lucide-react";
import { format } from "date-fns";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointments: Array<{
    id: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    status: string;
    patient_name?: string;
    notes?: string;
  }>;
  date?: Date;
}

const ScheduleModal = ({ isOpen, onClose, appointments, date = new Date() }: ScheduleModalProps) => {
  const todaysAppointments = appointments.filter(apt => 
    apt.appointment_date === format(date, 'yyyy-MM-dd')
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule for {format(date, 'MMMM d, yyyy')}
          </DialogTitle>
          <DialogDescription>
            Your appointments and schedule for today
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {todaysAppointments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No appointments today</h3>
                <p className="text-muted-foreground text-center">
                  Your schedule is clear for today. Take some time to rest or catch up on other tasks.
                </p>
              </CardContent>
            </Card>
          ) : (
            todaysAppointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {appointment.patient_name || 'Unknown Patient'}
                    </CardTitle>
                    <Badge variant={
                      appointment.status === 'confirmed' ? 'default' :
                      appointment.status === 'pending' ? 'secondary' :
                      'outline'
                    }>
                      {appointment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {appointment.start_time} - {appointment.end_time}
                    </div>
                  </div>
                  {appointment.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {appointment.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button variant="outline" className="flex-1">
            View Full Calendar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleModal;