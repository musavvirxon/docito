import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Clock, MapPin, Lightbulb } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';

interface PerformanceTrendsProps {
  dailyTrends: Array<{ date: string; appointments: number; completed: number; cancelled: number }>;
  popularTimeSlots: Array<{ time: string; count: number }>;
  stats: {
    returningPatients: number;
    newPatients: number;
  };
}

export function PerformanceTrends({ dailyTrends, popularTimeSlots, stats }: PerformanceTrendsProps) {
  const { t } = useTranslation("dashboard");
  
  const patientTypeData = [
    { name: t("performance.returning"), value: stats.returningPatients, color: '#10b981' },
    { name: t("performance.new"), value: stats.newPatients, color: '#3b82f6' }
  ];

  // Get recommendations based on data
  const getRecommendations = () => {
    const recommendations = [];
    
    if (popularTimeSlots.length > 0) {
      const topSlot = popularTimeSlots[0];
      recommendations.push({
        title: 'Peak Time Identified',
        description: `Your busiest time is ${topSlot.time}. Consider adding more slots during this period.`,
        priority: 'high'
      });
    }

    if (stats.returningPatients > stats.newPatients * 2) {
      recommendations.push({
        title: 'Strong Patient Retention',
        description: 'You have excellent patient loyalty! Focus on maintaining this high standard.',
        priority: 'positive'
      });
    } else if (stats.newPatients > stats.returningPatients * 2) {
      recommendations.push({
        title: 'Focus on Retention',
        description: 'Consider implementing follow-up reminders to convert more new patients to returning patients.',
        priority: 'medium'
      });
    }

    const recentCancellations = dailyTrends.slice(-7).reduce((sum, day) => sum + day.cancelled, 0);
    if (recentCancellations > dailyTrends.slice(-7).reduce((sum, day) => sum + day.appointments, 0) * 0.15) {
      recommendations.push({
        title: 'High Recent Cancellations',
        description: 'Recent cancellation rate is elevated. Consider sending appointment reminders 24h in advance.',
        priority: 'high'
      });
    }

    return recommendations;
  };

  const recommendations = getRecommendations();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'positive': return 'bg-green-100 text-green-700 border-green-300';
      default: return 'bg-blue-100 text-blue-700 border-blue-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Recommendations */}
      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <CardTitle>AI-Powered Recommendations</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Insights to improve your practice</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.map((rec, index) => (
            <div key={index} className={`p-4 rounded-lg border ${getPriorityColor(rec.priority)}`}>
              <h4 className="font-semibold mb-1">{rec.title}</h4>
              <p className="text-sm">{rec.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Appointment Trends Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Appointment Trends</CardTitle>
          <p className="text-sm text-muted-foreground">Daily breakdown of appointments</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="appointments" stroke="hsl(var(--primary))" name="Total" strokeWidth={2} />
              <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completed" strokeWidth={2} />
              <Line type="monotone" dataKey="cancelled" stroke="#f59e0b" name="Cancelled" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* New vs Returning Patients */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient Type Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">New vs returning patients</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={patientTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {patientTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{stats.newPatients}</p>
                <p className="text-sm text-muted-foreground">New Patients</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats.returningPatients}</p>
                <p className="text-sm text-muted-foreground">Returning</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Popular Time Slots</CardTitle>
            <p className="text-sm text-muted-foreground">Peak booking times</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={popularTimeSlots}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="Bookings" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 space-y-2">
              {popularTimeSlots.slice(0, 3).map((slot, index) => (
                <div key={slot.time} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{slot.time}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{slot.count} bookings</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold">Growth Trend</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Appointments trending {dailyTrends[dailyTrends.length - 1]?.appointments > dailyTrends[0]?.appointments ? 'upward' : 'stable'}
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold">Patient Loyalty</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.returningPatients > stats.newPatients ? 'Strong' : 'Building'} patient retention
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold">Best Time</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Peak demand at {popularTimeSlots[0]?.time || 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
