import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Calendar, Clock, Users, DollarSign, TrendingUp, 
  CheckCircle, AlertCircle, ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import type { StaffAppointment, StaffPayment, StaffPermissions, PracticeInfo } from '@/hooks/useStaffDashboard';

interface StaffDashboardOverviewProps {
  practice: PracticeInfo | null;
  permissions: StaffPermissions | null;
  todaysAppointments: StaffAppointment[];
  upcomingAppointments: StaffAppointment[];
  recentPayments: StaffPayment[];
  onNavigate: (section: string) => void;
}

export const StaffDashboardOverview = ({
  practice,
  permissions,
  todaysAppointments,
  upcomingAppointments,
  recentPayments,
  onNavigate,
}: StaffDashboardOverviewProps) => {
  const pendingAppointments = todaysAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed');
  const completedToday = todaysAppointments.filter(a => a.status === 'completed').length;
  const totalRevenue = recentPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0) / 100;

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch {
      return time;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome to {practice?.name || 'Your Practice'}
        </h1>
        <p className="text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {permissions?.can_view_schedule && (
          <>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('today')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Appointments</p>
                    <p className="text-2xl font-bold text-foreground">{todaysAppointments.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {completedToday} completed
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-primary opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('appointments')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Check-ins</p>
                    <p className="text-2xl font-bold text-foreground">{pendingAppointments.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      awaiting arrival
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {permissions?.can_manage_patients && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('patients')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming Patients</p>
                  <p className="text-2xl font-bold text-foreground">{upcomingAppointments.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    next 7 days
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        )}

        {permissions?.can_manage_billing && (
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate('billing')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recent Collections</p>
                  <p className="text-2xl font-bold text-foreground">${totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {recentPayments.length} transactions
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Next Appointments */}
      {permissions?.can_view_schedule && pendingAppointments.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Next Up
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('today')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAppointments.slice(0, 3).map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[60px]">
                      <p className="font-bold text-foreground">{formatTime(apt.start_time)}</p>
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {apt.patient_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{apt.patient_name}</p>
                      <p className="text-sm text-muted-foreground">with Dr. {apt.doctor_name}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {apt.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {permissions?.can_book_appointments && (
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
                <Calendar className="w-5 h-5" />
                <span className="text-sm">Book Appointment</span>
              </Button>
            )}
            {permissions?.can_view_schedule && (
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => onNavigate('today')}>
                <Clock className="w-5 h-5" />
                <span className="text-sm">Check-in Patient</span>
              </Button>
            )}
            {permissions?.can_manage_patients && (
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => onNavigate('patients')}>
                <Users className="w-5 h-5" />
                <span className="text-sm">Find Patient</span>
              </Button>
            )}
            {permissions?.can_manage_billing && (
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => onNavigate('billing')}>
                <DollarSign className="w-5 h-5" />
                <span className="text-sm">Process Payment</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
