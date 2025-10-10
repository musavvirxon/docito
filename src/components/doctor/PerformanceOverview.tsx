import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, CheckCircle2, XCircle, UserX, Clock, TrendingUp, Users, Award } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceOverviewProps {
  stats: {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    totalPatients: number;
    completionRate: number;
    cancellationRate: number;
    noShowRate: number;
    averageSessionLength: number;
    activeDays: number;
    avgDailyPatients: number;
    performanceBadge: string;
  };
  dailyTrends: Array<{ date: string; appointments: number; completed: number; cancelled: number }>;
}

export function PerformanceOverview({ stats, dailyTrends }: PerformanceOverviewProps) {
  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'Gold': return 'bg-yellow-500';
      case 'Silver': return 'bg-gray-400';
      default: return 'bg-orange-600';
    }
  };

  const getAlertStatus = (rate: number, threshold: number) => {
    if (rate > threshold) return { color: 'text-red-600', status: 'High' };
    if (rate > threshold * 0.7) return { color: 'text-yellow-600', status: 'Medium' };
    return { color: 'text-green-600', status: 'Low' };
  };

  const cancellationAlert = getAlertStatus(stats.cancellationRate, 15);
  const noShowAlert = getAlertStatus(stats.noShowRate, 10);

  return (
    <div className="space-y-6">
      {/* Performance Badge */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Performance Level</h3>
              <p className="text-muted-foreground">Based on completion rate, ratings, and activity</p>
            </div>
            <div className="text-center">
              <div className={`w-20 h-20 ${getBadgeColor(stats.performanceBadge)} rounded-full flex items-center justify-center mb-2`}>
                <Award className="w-10 h-10 text-white" />
              </div>
              <Badge className="text-lg px-4 py-1">{stats.performanceBadge}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedAppointments}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.completionRate.toFixed(1)}% completion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.cancelledAppointments}</div>
            <p className={`text-xs mt-1 ${cancellationAlert.color} font-medium`}>
              {stats.cancellationRate.toFixed(1)}% - {cancellationAlert.status}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No-Shows</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.noShowAppointments}</div>
            <p className={`text-xs mt-1 ${noShowAlert.color} font-medium`}>
              {stats.noShowRate.toFixed(1)}% - {noShowAlert.status}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDays}</div>
            <p className="text-xs text-muted-foreground mt-1">Days with appointments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Daily Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDailyPatients}</div>
            <p className="text-xs text-muted-foreground mt-1">Patients per active day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageSessionLength} min</div>
            <p className="text-xs text-muted-foreground mt-1">Per appointment</p>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Trends</CardTitle>
          <p className="text-sm text-muted-foreground">Daily appointment breakdown</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="appointments" stroke="hsl(var(--primary))" name="Total" strokeWidth={2} />
              <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completed" strokeWidth={2} />
              <Line type="monotone" dataKey="cancelled" stroke="#f59e0b" name="Cancelled" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Completion Rate</span>
              <span className="text-sm font-bold text-green-600">{stats.completionRate.toFixed(1)}%</span>
            </div>
            <Progress value={stats.completionRate} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Cancellation Rate</span>
              <span className={`text-sm font-bold ${cancellationAlert.color}`}>{stats.cancellationRate.toFixed(1)}%</span>
            </div>
            <Progress value={stats.cancellationRate} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">No-Show Rate</span>
              <span className={`text-sm font-bold ${noShowAlert.color}`}>{stats.noShowRate.toFixed(1)}%</span>
            </div>
            <Progress value={stats.noShowRate} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
