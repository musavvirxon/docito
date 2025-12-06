import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Plus,
  CalendarX,
  CalendarCheck,
  Eye,
  RotateCcw,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Appointment {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  doctor_name?: string;
  practice_name?: string;
  reason?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes?: string;
  diagnosis?: string;
  treatment?: string;
}

interface AppointmentsTabProps {
  appointments: Appointment[];
  onSchedule: () => void;
  onReschedule: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onView: (appointment: Appointment) => void;
}

const AppointmentsTab = ({
  appointments,
  onSchedule,
  onReschedule,
  onCancel,
  onView,
}: AppointmentsTabProps) => {
  const now = new Date();

  const upcomingAppointments = appointments.filter(
    (apt) =>
      new Date(apt.date) >= now &&
      apt.status !== "cancelled" &&
      apt.status !== "completed"
  );

  const pastAppointments = appointments.filter(
    (apt) =>
      apt.status === "completed" ||
      (new Date(apt.date) < now && apt.status !== "cancelled")
  );

  const getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
      case "completed":
        return "bg-primary/10 text-primary border-primary/20";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "";
    }
  };

  const AppointmentCard = ({
    appointment,
    isPast,
  }: {
    appointment: Appointment;
    isPast?: boolean;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Date Block */}
            <div className="flex sm:flex-col items-center gap-2 sm:gap-0 text-center bg-primary/5 rounded-lg p-3 shrink-0">
              <Calendar className="w-4 h-4 text-primary sm:mb-1" />
              <p className="text-lg font-bold text-primary">
                {new Date(appointment.date).toLocaleDateString("en-US", {
                  day: "numeric",
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(appointment.date).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {appointment.start_time} - {appointment.end_time}
                    </span>
                  </div>
                  {appointment.doctor_name && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm">{appointment.doctor_name}</span>
                    </div>
                  )}
                </div>
                <Badge variant="outline" className={getStatusColor(appointment.status)}>
                  {appointment.status}
                </Badge>
              </div>

              {appointment.reason && (
                <p className="text-sm text-muted-foreground mb-2">
                  {appointment.reason}
                </p>
              )}

              {appointment.practice_name && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {appointment.practice_name}
                </div>
              )}

              {/* Past appointment details */}
              {isPast && (appointment.diagnosis || appointment.treatment) && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {appointment.diagnosis && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Diagnosis
                      </p>
                      <p className="text-sm">{appointment.diagnosis}</p>
                    </div>
                  )}
                  {appointment.treatment && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Treatment
                      </p>
                      <p className="text-sm">{appointment.treatment}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(appointment)}
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  View
                </Button>
                {!isPast && appointment.status !== "cancelled" && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onReschedule(appointment)}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Reschedule
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onCancel(appointment)}
                    >
                      <X className="w-3.5 h-3.5 mr-1.5" />
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const EmptyState = ({
    icon: Icon,
    title,
    description,
  }: {
    icon: any;
    title: string;
    description: string;
  }) => (
    <div className="text-center py-12">
      <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Appointments</h2>
        <Button onClick={onSchedule} className="gap-2">
          <Plus className="w-4 h-4" />
          Schedule Appointment
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upcoming" className="gap-2">
            <CalendarCheck className="w-4 h-4" />
            Upcoming ({upcomingAppointments.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            <CalendarX className="w-4 h-4" />
            Past ({pastAppointments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {upcomingAppointments.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No upcoming appointments"
              description="Schedule a new appointment for this patient"
            />
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {upcomingAppointments.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {pastAppointments.length === 0 ? (
            <EmptyState
              icon={CalendarX}
              title="No past appointments"
              description="Past appointments will appear here"
            />
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                <AnimatePresence>
                  {pastAppointments.map((apt) => (
                    <AppointmentCard key={apt.id} appointment={apt} isPast />
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default AppointmentsTab;
