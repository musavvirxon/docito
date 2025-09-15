import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  Pill, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Plus,
  Calendar,
  Bell,
  MoreHorizontal,
  RotateCcw
} from "lucide-react";
import { useMedicationReminders } from "@/hooks/useMedicationReminders";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const MedicationReminderDashboard = () => {
  const {
    todaysReminders,
    upcomingReminders,
    loading,
    markReminderAsTaken,
    markReminderAsSkipped,
    snoozeReminder,
    getPendingRemindersCount,
    getOverdueRemindersCount,
  } = useMedicationReminders();

  const [expandedReminder, setExpandedReminder] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "h:mm a");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "taken":
        return "bg-green-100 text-green-800 border-green-200";
      case "missed":
        return "bg-red-100 text-red-800 border-red-200";
      case "skipped":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "pending":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "taken":
        return <CheckCircle className="w-4 h-4" />;
      case "missed":
        return <XCircle className="w-4 h-4" />;
      case "skipped":
        return <AlertTriangle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const isOverdue = (reminderTime: string) => {
    return new Date(reminderTime) < new Date() && new Date(reminderTime).toDateString() === new Date().toDateString();
  };

  const getPendingCount = () => {
    return todaysReminders.filter(r => r.status === 'pending').length;
  };

  const getCompletedCount = () => {
    return todaysReminders.filter(r => r.status === 'taken').length;
  };

  const getCompletionPercentage = () => {
    if (todaysReminders.length === 0) return 0;
    return Math.round((getCompletedCount() / todaysReminders.length) * 100);
  };

  const ReminderCard = ({ reminder, showDate = false }: { reminder: any; showDate?: boolean }) => {
    const isExpanded = expandedReminder === reminder.id;
    const overdueStatus = isOverdue(reminder.reminder_time);

    return (
      <Card className={`transition-all ${overdueStatus && reminder.status === 'pending' ? 'border-red-200 bg-red-50' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Pill className="w-5 h-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-foreground truncate">
                    {reminder.medications?.name || 'Unknown Medication'}
                  </h3>
                  <Badge className={`${getStatusColor(reminder.status)} border text-xs`}>
                    {getStatusIcon(reminder.status)}
                    <span className="ml-1 capitalize">{reminder.status}</span>
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-4">
                    <span>{reminder.medications?.dosage}</span>
                    <span>•</span>
                    <span>{reminder.medications?.route || 'Oral'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>
                      {showDate && formatDate(reminder.reminder_time) + " at "}
                      {formatTime(reminder.reminder_time)}
                    </span>
                    {overdueStatus && reminder.status === 'pending' && (
                      <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>

                {reminder.medications?.instructions && isExpanded && (
                  <div className="mt-2 p-2 bg-muted rounded text-sm">
                    <strong>Instructions:</strong> {reminder.medications.instructions}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {reminder.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => markReminderAsTaken(reminder.id)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Taken
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => snoozeReminder(reminder.id, 15)}>
                        <RotateCcw className="w-3 h-3 mr-2" />
                        Snooze 15 min
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => snoozeReminder(reminder.id, 30)}>
                        <RotateCcw className="w-3 h-3 mr-2" />
                        Snooze 30 min
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => snoozeReminder(reminder.id, 60)}>
                        <RotateCcw className="w-3 h-3 mr-2" />
                        Snooze 1 hour
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => markReminderAsSkipped(reminder.id)}>
                        <XCircle className="w-3 h-3 mr-2" />
                        Skip dose
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpandedReminder(isExpanded ? null : reminder.id)}
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Today</p>
                <p className="text-2xl font-bold">{getPendingCount()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Today</p>
                <p className="text-2xl font-bold">{getCompletedCount()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{getCompletionPercentage()}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {todaysReminders.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Today's Progress</span>
              <span className="text-sm text-muted-foreground">
                {getCompletedCount()} of {todaysReminders.length} medications taken
              </span>
            </div>
            <Progress value={getCompletionPercentage()} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Overdue Alert */}
      {getOverdueRemindersCount() > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">You have {getOverdueRemindersCount()} overdue medication{getOverdueRemindersCount() > 1 ? 's' : ''}.</span>{' '}
            Please take them as soon as possible or mark them as skipped if no longer needed.
          </AlertDescription>
        </Alert>
      )}

      {/* Medication Reminders Tabs */}
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">
            Today ({todaysReminders.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingReminders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {todaysReminders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Pill className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No medications scheduled for today</h3>
                <p className="text-sm text-muted-foreground">Your medication reminders will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {todaysReminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingReminders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No upcoming medications</h3>
                <p className="text-sm text-muted-foreground">Your future medication reminders will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingReminders.map((reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} showDate />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};