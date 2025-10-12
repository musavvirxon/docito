import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, Users, Calendar, BarChart3, Stethoscope, CreditCard, 
  MapPin, MessageCircle, Settings, AlertCircle, Upload, CheckCircle,
  X, TrendingUp, Star, Clock, DollarSign, UserPlus, Eye, Loader2
} from "lucide-react";
import { InviteProviderModal } from "@/components/dashboard/InviteProviderModal";
import { AddServiceModal } from "@/components/dashboard/AddServiceModal";
import { InviteStaffModal } from "@/components/dashboard/InviteStaffModal";
import { AddLocationModal } from "@/components/dashboard/AddLocationModal";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { CreateClinicModal } from "@/components/dashboard/CreateClinicModal";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { format } from "date-fns";

const AdminDashboard = () => {
  const { practice, stats, doctors, appointments, services, loading, error, refreshData } = useAdminDashboard();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Modal states
  const [inviteProviderOpen, setInviteProviderOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [inviteStaffOpen, setInviteStaffOpen] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createClinicOpen, setCreateClinicOpen] = useState(false);

  const verificationStatus: "pending" | "approved" | "rejected" = practice?.verified ? "approved" : "pending";

  const metrics = [
    { label: "Total Bookings", value: stats.totalBookings.toString(), icon: Calendar, trend: "" },
    { label: "Total Patients", value: stats.totalPatients.toString(), icon: Users, trend: "" },
    { label: "Revenue This Month", value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, trend: "" },
    { label: "Clinic Rating", value: stats.clinicRating.toFixed(1), icon: Star, trend: "" },
    { label: "Pending Invites", value: stats.pendingInvites.toString(), icon: UserPlus, trend: "" },
    { label: "Locations", value: stats.locations.toString(), icon: MapPin, trend: "" },
  ];

  const getVerificationStatusColor = (status: "pending" | "approved" | "rejected") => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800 border-green-200";
      case "rejected": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getVerificationMessage = (status: "pending" | "approved" | "rejected") => {
    switch (status) {
      case "approved": return "Your practice is verified and live! Patients can now find and book with you.";
      case "rejected": return "Verification failed. Please review the requirements and resubmit your documents.";
      default: return "To go public and appear in search results, your verification must be completed.";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load dashboard</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refreshData}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Welcome to Your Admin Dashboard!</h3>
            <p className="text-muted-foreground mb-6 text-base">
              Let's set up your clinic information so you can start managing your doctors and appointments.
            </p>
            <div className="bg-muted/50 rounded-lg p-6 mb-6 text-left">
              <p className="text-sm font-medium mb-4">You'll need to provide:</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  Clinic name and description
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  Location and contact information
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  Operating details
                </li>
              </ul>
            </div>
            <Button 
              size="lg" 
              onClick={() => setCreateClinicOpen(true)}
              className="w-full sm:w-auto"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Create Clinic Profile
            </Button>
          </CardContent>
        </Card>
        
        <CreateClinicModal
          open={createClinicOpen}
          onOpenChange={setCreateClinicOpen}
          onSuccess={refreshData}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Practice Dashboard</h1>
              <p className="text-muted-foreground">{practice.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Preview Public Profile
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Verification Status */}
        <Card className={`mb-6 border-2 ${getVerificationStatusColor(verificationStatus)}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {verificationStatus === "approved" ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">Verification Status:</h3>
                  <Badge variant="outline" className={getVerificationStatusColor(verificationStatus)}>
                    {verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1)}
                  </Badge>
                </div>
                <p className="text-sm mb-3">{getVerificationMessage(verificationStatus)}</p>
                {verificationStatus === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Documents
                    </Button>
                    <Button size="sm" variant="outline">View Requirements</Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                      <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                      {metric.trend && (
                        <div className="flex items-center mt-1">
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm text-green-500">{metric.trend}</span>
                        </div>
                      )}
                    </div>
                    <Icon className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Recent Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No appointments scheduled</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {appointments.slice(0, 3).map((apt) => (
                        <div key={apt.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{apt.patient_name}</p>
                            <p className="text-sm text-muted-foreground">{apt.doctor_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {format(new Date(apt.appointment_date), 'MMM dd')}, {apt.start_time}
                            </p>
                            <Badge variant="outline" className="capitalize">{apt.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Recent Messages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">Dr. Sarah Johnson</p>
                          <p className="text-sm text-muted-foreground">New patient inquiry about...</p>
                          <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="providers" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Manage Providers</h2>
              <Button onClick={() => setInviteProviderOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Provider
              </Button>
            </div>
            
            {doctors.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Stethoscope className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Providers Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Invite doctors to join your practice to get started
                  </p>
                  <Button onClick={() => setInviteProviderOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite First Provider
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {doctors.map((provider) => (
                  <Card key={provider.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <Stethoscope className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{provider.profiles?.full_name || 'Unknown'}</h3>
                            <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-lg font-semibold">{provider.num_reviews || 0}</p>
                            <p className="text-xs text-muted-foreground">Reviews</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-semibold">{provider.average_rating.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">Rating</p>
                          </div>
                          <Badge variant={provider.verified ? "default" : "secondary"}>
                            {provider.verified ? "Verified" : "Pending"}
                          </Badge>
                          <Button variant="outline" size="sm">Edit</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="locations" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Practice Locations</h2>
              <Button onClick={() => setAddLocationOpen(true)}>
                <MapPin className="h-4 w-4 mr-2" />
                Add New Location
              </Button>
            </div>

            <div className="grid gap-6">
              {[
                {
                  name: "Main Office - Downtown",
                  address: "123 Medical Center Dr, City, ST 12345",
                  phone: "(555) 123-4567",
                  providers: 3,
                  status: "Active",
                  photos: 4
                },
                {
                  name: "West Side Clinic",
                  address: "456 Healthcare Blvd, City, ST 12346", 
                  phone: "(555) 123-4568",
                  providers: 2,
                  status: "Active",
                  photos: 6
                }
              ].map((location, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{location.name}</h3>
                          <Badge variant="outline">{location.status}</Badge>
                        </div>
                        <p className="text-muted-foreground mb-2">{location.address}</p>
                        <p className="text-muted-foreground mb-4">{location.phone}</p>
                        
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{location.providers} Providers</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Upload className="h-4 w-4" />
                            <span>{location.photos} Photos</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-1" />
                          Photos
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Services & Treatments</h2>
              <Button onClick={() => setAddServiceOpen(true)}>Add New Service</Button>
            </div>
            
            {services.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Stethoscope className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Services Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add services and treatments offered at your practice
                  </p>
                  <Button onClick={() => setAddServiceOpen(true)}>
                    Add First Service
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {services.map((service) => (
                  <Card key={service.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Available with: {service.doctor_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="font-semibold">${service.price || 0}</p>
                            <p className="text-xs text-muted-foreground">Price</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold">{service.duration_minutes} min</p>
                            <p className="text-xs text-muted-foreground">Duration</p>
                          </div>
                          <Button variant="outline" size="sm">Edit</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="staff" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Staff Management</h2>
              <Button onClick={() => setInviteStaffOpen(true)}>Invite Staff Member</Button>
            </div>
            
            <div className="grid gap-4">
              {[
                { name: "Jennifer Wilson", role: "Nurse", department: "Cardiology", status: "Active" },
                { name: "Mark Thompson", role: "Receptionist", department: "Front Desk", status: "Active" },
                { name: "Lisa Martinez", role: "Dental Hygienist", department: "Dental", status: "Part-time" },
                { name: "David Brown", role: "Manager", department: "Administration", status: "Active" },
              ].map((staff, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{staff.name}</h3>
                          <p className="text-sm text-muted-foreground">{staff.role} • {staff.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={staff.status === "Active" ? "default" : "secondary"}>
                          {staff.status}
                        </Badge>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="patients" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Patient Management</h2>
              <div className="flex gap-2">
                <Input placeholder="Search patients..." className="w-64" />
                <Button variant="outline">Export</Button>
              </div>
            </div>
            
            <Card>
              <CardContent className="p-0">
                <div className="border-b p-4 bg-muted/50">
                  <div className="grid grid-cols-4 gap-4 font-medium text-sm">
                    <div>Patient Name</div>
                    <div>Last Visit</div>
                    <div>Provider</div>
                    <div>Status</div>
                  </div>
                </div>
                {[
                  { name: "Alice Johnson", lastVisit: "2024-01-15", provider: "Dr. Johnson", status: "Active" },
                  { name: "Bob Smith", lastVisit: "2024-01-10", provider: "Dr. Chen", status: "Follow-up" },
                  { name: "Carol Davis", lastVisit: "2024-01-08", provider: "Dr. Rodriguez", status: "Active" },
                ].map((patient, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 p-4 border-b hover:bg-muted/30 cursor-pointer">
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-muted-foreground">{patient.lastVisit}</div>
                    <div className="text-muted-foreground">{patient.provider}</div>
                    <div>
                      <Badge variant="outline">{patient.status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Billing & Payments</h2>
              <Button>Generate Report</Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Revenue (This Month)</span>
                      <span className="font-semibold">$12,450</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Payments</span>
                      <span className="font-semibold text-yellow-600">$2,100</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Insurance Claims</span>
                      <span className="font-semibold">$8,200</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Direct Payments</span>
                      <span className="font-semibold">$4,250</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { patient: "John Doe", amount: "$150", status: "Paid", date: "Today" },
                      { patient: "Jane Smith", amount: "$200", status: "Pending", date: "Yesterday" },
                      { patient: "Mike Wilson", amount: "$100", status: "Paid", date: "2 days ago" },
                    ].map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{transaction.patient}</p>
                          <p className="text-sm text-muted-foreground">{transaction.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{transaction.amount}</p>
                          <Badge variant={transaction.status === "Paid" ? "default" : "outline"}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Practice Analytics</h2>
              <div className="flex gap-2">
                <Button variant="outline">Last 30 Days</Button>
                <Button variant="outline">Export Report</Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Booking Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Chart visualization would go here</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Average Rating</span>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold">4.8</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Patient Retention</span>
                      <span className="font-semibold text-green-600">92%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Avg. Wait Time</span>
                      <span className="font-semibold">12 min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>No-show Rate</span>
                      <span className="font-semibold text-red-600">5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <InviteProviderModal 
        open={inviteProviderOpen} 
        onOpenChange={setInviteProviderOpen} 
      />
      <AddServiceModal 
        open={addServiceOpen} 
        onOpenChange={setAddServiceOpen} 
      />
      <InviteStaffModal 
        open={inviteStaffOpen} 
        onOpenChange={setInviteStaffOpen} 
      />
      <AddLocationModal 
        open={addLocationOpen} 
        onOpenChange={setAddLocationOpen} 
      />
      <SettingsPanel 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
      />
    </div>
  );
};

export default AdminDashboard;