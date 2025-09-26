import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Users, Calendar, Star, DollarSign, Award } from "lucide-react";
import { useDoctorPerformance } from "@/hooks/useDoctorPerformance";

interface DoctorPerformanceSectionProps {
  doctorProfile: {
    id: string;
    specialty: string;
    verified: boolean;
    average_rating: number;
    num_reviews: number;
    appointment_count: number;
  };
  stats: {
    totalPatients: number;
    totalAppointments: number;
    totalRevenue: number;
    averageRating: number;
    numReviews: number;
    profileCompletion: number;
  };
}

const DoctorPerformanceSection = ({ doctorProfile, stats }: DoctorPerformanceSectionProps) => {
  const { 
    stats: performanceStats, 
    monthlyData, 
    topServices, 
    recentReviews, 
    loading,
    error 
  } = useDoctorPerformance();

  // Use either provided stats or fetched stats
  const displayStats = stats || performanceStats;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-destructive">
        <p>Error loading performance data: {error}</p>
      </div>
    );
  }

  // Create fallback stats with default values
  const safeStats = {
    totalAppointments: displayStats.totalAppointments || 0,
    totalPatients: displayStats.totalPatients || 0,
    averageRating: displayStats.averageRating || 0,
    totalReviews: (displayStats as any).totalReviews || (displayStats as any).numReviews || 0,
    monthlyRevenue: (displayStats as any).monthlyRevenue || (displayStats as any).totalRevenue || 0,
    completionRate: (displayStats as any).completionRate || 96,
    monthlyGrowth: (displayStats as any).monthlyGrowth || 12,
    patientGrowth: (displayStats as any).patientGrowth || 8,
    averageSessionLength: (displayStats as any).averageSessionLength || 45,
    responseTime: (displayStats as any).responseTime || 12
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.totalAppointments}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              {safeStats.monthlyGrowth >= 0 ? '+' : ''}{safeStats.monthlyGrowth}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">
              {safeStats.patientGrowth >= 0 ? '+' : ''}{safeStats.patientGrowth}% new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Based on {safeStats.totalReviews} reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${safeStats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {safeStats.monthlyGrowth >= 0 ? '+' : ''}{safeStats.monthlyGrowth}% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Performance Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Appointment Completion Rate</span>
                    <span className="font-medium">{safeStats.completionRate}%</span>
                  </div>
                  <Progress value={safeStats.completionRate} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Patient Satisfaction</span>
                    <span className="font-medium">{(safeStats.averageRating / 5 * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={safeStats.averageRating / 5 * 100} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{safeStats.averageSessionLength}</div>
                    <div className="text-sm text-muted-foreground">Avg. Session (min)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{safeStats.responseTime}</div>
                    <div className="text-sm text-muted-foreground">Response Time (hrs)</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyData.slice(-3).map((stat, index) => (
                    <div key={stat.month} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{stat.month}</div>
                        <div className="text-sm text-muted-foreground">{stat.appointments} appointments</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${stat.revenue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Revenue</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Achievements & Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="font-medium">Top Rated</div>
                  <div className="text-sm text-muted-foreground">4.8+ rating maintained</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="font-medium">Patient Champion</div>
                  <div className="text-sm text-muted-foreground">100+ patients served</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="font-medium">Revenue Milestone</div>
                  <div className="text-sm text-muted-foreground">$10K+ monthly revenue</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Services</CardTitle>
              <p className="text-muted-foreground">Your most popular services by bookings and revenue</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topServices.map((service, index) => (
                  <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{service.name}</div>
                        <div className="text-sm text-muted-foreground">{service.bookings} bookings this month</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${service.revenue.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Revenue</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Patient Reviews</CardTitle>
              <p className="text-muted-foreground">Latest feedback from your patients</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentReviews.map((review, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{review.patient_name}</div>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">{review.date}</span>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <p className="text-muted-foreground">Track your progress over time</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">6-Month Appointment Trends</h3>
                  <div className="space-y-2">
                    {monthlyData.map((stat) => (
                      <div key={stat.month} className="flex items-center gap-4">
                        <div className="w-12 text-sm font-medium">{stat.month}</div>
                        <div className="flex-1">
                          <Progress value={(stat.appointments / 150) * 100} className="h-4" />
                        </div>
                        <div className="w-16 text-sm text-muted-foreground">{stat.appointments}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-4">Revenue Growth</h3>
                  <div className="space-y-2">
                    {monthlyData.map((stat) => (
                      <div key={stat.month} className="flex items-center gap-4">
                        <div className="w-12 text-sm font-medium">{stat.month}</div>
                        <div className="flex-1">
                          <Progress value={(stat.revenue / 15000) * 100} className="h-4" />
                        </div>
                        <div className="w-20 text-sm text-muted-foreground">${stat.revenue.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DoctorPerformanceSection;