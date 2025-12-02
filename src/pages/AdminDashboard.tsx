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
  X, TrendingUp, Star, Clock, DollarSign, UserPlus, Eye, Loader2, Mail,
  LogOut, ChevronDown, User
} from "lucide-react";
import { InviteProviderModal } from "@/components/dashboard/InviteProviderModal";
import { AddServiceModal } from "@/components/dashboard/AddServiceModal";
import { InviteStaffModal } from "@/components/dashboard/InviteStaffModal";
import PendingInvitationsSection from "@/components/dashboard/PendingInvitationsSection";
import { AddLocationModal } from "@/components/dashboard/AddLocationModal";
import { SettingsPanel } from "@/components/dashboard/SettingsPanel";
import { ComprehensiveRegistrationModal } from "@/components/dashboard/ComprehensiveRegistrationModal";
import { CreateClinicModal } from "@/components/dashboard/CreateClinicModal";
import { ViewRequirementsModal } from "@/components/dashboard/ViewRequirementsModal";
import VerificationSuccessModal from "@/components/dashboard/VerificationSuccessModal";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { useAdvancedFinancialMetrics } from "@/hooks/useAdvancedFinancialMetrics";
import AdvancedFinancialMetrics from "@/components/financial/AdvancedFinancialMetrics";
import { useVerificationStatus } from "@/hooks/useVerificationStatus";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/home/ThemeToggle';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from 'react-i18next';

const AdminDashboard = () => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { 
    practice, stats, doctors, appointments, services, staff, locations, 
    patients, payments, messages, metrics, loading, error, refreshData 
  } = useAdminDashboard();
  
  const { metrics: advancedMetrics, refreshData: refreshAdvancedMetrics } = useAdvancedFinancialMetrics(stats.totalRevenue, 'practice', practice?.id);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Modal states
  const [inviteProviderOpen, setInviteProviderOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [inviteStaffOpen, setInviteStaffOpen] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createClinicOpen, setCreateClinicOpen] = useState(false);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  // Get verification status from practice data
  const verificationStatus = practice?.verification_status || 'pending';
  const { shouldShowModal, markModalAsShown } = useVerificationStatus(practice?.id);

  // Show verification success modal once when verified
  useEffect(() => {
    if (shouldShowModal()) {
      setVerificationModalOpen(true);
    }
  }, [practice?.id, verificationStatus]);

  const handleVerificationModalClose = () => {
    markModalAsShown();
    setVerificationModalOpen(false);
  };

  const handleVerificationSuccess = async () => {
    await refreshData();
    navigate("/dashboard/verify");
  };

  const dashboardMetrics = [
    { label: t('admin.metrics.totalBookings'), value: stats.totalBookings.toString(), icon: Calendar, trend: "" },
    { label: t('admin.metrics.totalPatients'), value: stats.totalPatients.toString(), icon: Users, trend: "" },
    { label: t('admin.metrics.revenueThisMonth'), value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, trend: "" },
    { label: t('admin.metrics.clinicRating'), value: stats.clinicRating.toFixed(1), icon: Star, trend: "" },
    { label: t('admin.metrics.pendingInvites'), value: stats.pendingInvites.toString(), icon: UserPlus, trend: "" },
    { label: t('admin.metrics.locations'), value: stats.locations.toString(), icon: MapPin, trend: "" },
  ];

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-green-100 text-green-800 border-green-200";
      case "rejected": return "bg-red-100 text-red-800 border-red-200";
      case "under_review": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getVerificationMessage = (status: string) => {
    switch (status) {
      case "verified": return t('admin.verification.verified');
      case "rejected": return t('admin.verification.rejected');
      case "under_review": return t('admin.verification.underReview');
      default: return t('admin.verification.pending');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">{t('admin.loading')}</span>
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
            <h3 className="text-lg font-semibold mb-2">{t('admin.error.failed')}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refreshData}>{t('admin.error.tryAgain')}</Button>
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
            <h3 className="text-2xl font-bold mb-3">{t('admin.welcome.title')}</h3>
            <p className="text-muted-foreground mb-6 text-base">
              {t('admin.welcome.description')}
            </p>
            <div className="bg-muted/50 rounded-lg p-6 mb-6 text-left">
              <p className="text-sm font-medium mb-4">{t('admin.welcome.needProvide')}</p>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  {t('admin.welcome.requirements.clinicName')}
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  {t('admin.welcome.requirements.location')}
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  {t('admin.welcome.requirements.operating')}
                </li>
              </ul>
            </div>
            <Button 
              size="lg" 
              onClick={() => setCreateClinicOpen(true)}
              className="w-full sm:w-auto"
            >
              <Building2 className="w-4 h-4 mr-2" />
              {t('admin.welcome.createProfile')}
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
              <h1 className="text-2xl font-bold text-foreground">{t('admin.title')}</h1>
              <p className="text-muted-foreground">
                {verificationStatus === "verified" 
                  ? (practice.name || t('admin.unverifiedPractice'))
                  : t('admin.unverifiedPractice')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher />
              {verificationStatus === "verified" && (
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  {t('admin.header.previewProfile')}
                </Button>
              )}
              
              {verificationStatus === "verified" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      {t('admin.header.profile')}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate('/admin/profile-settings')}>
                      <User className="h-4 w-4 mr-2" />
                      {t('admin.header.profileSettings')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                      <Building2 className="h-4 w-4 mr-2" />
                      {t('admin.header.practiceSettings')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={async () => {
                        await signOut();
                        navigate('/');
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('admin.header.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
                {verificationStatus === "verified" ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : verificationStatus === "rejected" ? (
                  <X className="h-6 w-6 text-red-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{t('admin.verification.status')}</h3>
                  <Badge variant="outline" className={getVerificationStatusColor(verificationStatus)}>
                    {t(`admin.verification.statuses.${verificationStatus}`)}
                  </Badge>
                </div>
                <p className="text-sm mb-3">{getVerificationMessage(verificationStatus)}</p>
                {(verificationStatus === "pending" || verificationStatus === "rejected") && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setCreateClinicOpen(true)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {verificationStatus === "rejected" ? t('admin.verification.resubmit') : t('admin.verification.verifyPractice')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRequirementsOpen(true)}>
                      {t('admin.verification.viewRequirements')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {dashboardMetrics.map((metric, index) => {
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
            <TabsTrigger value="overview">{t('admin.tabs.overview')}</TabsTrigger>
            {verificationStatus === "verified" && (
              <>
                <TabsTrigger value="providers">{t('admin.tabs.providers')}</TabsTrigger>
                <TabsTrigger value="services">{t('admin.tabs.services')}</TabsTrigger>
                <TabsTrigger value="staff">{t('admin.tabs.staff')}</TabsTrigger>
                <TabsTrigger value="locations">{t('admin.tabs.locations')}</TabsTrigger>
                <TabsTrigger value="patients">{t('admin.tabs.patients')}</TabsTrigger>
                <TabsTrigger value="billing">{t('admin.tabs.billing')}</TabsTrigger>
                <TabsTrigger value="analytics">{t('admin.tabs.analytics')}</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {t('admin.overview.recentAppointments')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>{t('admin.overview.noAppointments')}</p>
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
                    {t('admin.overview.recentMessages')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>{t('admin.overview.noMessages')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{msg.sender_name}</p>
                            <p className="text-sm text-muted-foreground">{msg.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(msg.created_at), 'MMM dd, h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="providers" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t('admin.providers.title')}</h2>
              <Button onClick={() => setInviteProviderOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('admin.providers.inviteProvider')}
              </Button>
            </div>
            
            {doctors.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Stethoscope className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">{t('admin.providers.noProviders')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('admin.providers.noProvidersDesc')}
                  </p>
                  <Button onClick={() => setInviteProviderOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t('admin.providers.inviteFirst')}
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
                            <p className="text-xs text-muted-foreground">{t('admin.providers.reviews')}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-semibold">{provider.average_rating.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">{t('admin.providers.rating')}</p>
                          </div>
                          <Badge variant={provider.verified ? "default" : "secondary"}>
                            {provider.verified ? t('admin.providers.verified') : t('admin.providers.pending')}
                          </Badge>
                          <Button variant="outline" size="sm">{t('admin.providers.edit')}</Button>
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

            {locations.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Locations Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your practice locations to help patients find you
                  </p>
                  <Button onClick={() => setAddLocationOpen(true)}>
                    <MapPin className="h-4 w-4 mr-2" />
                    Add First Location
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {locations.map((location) => (
                  <Card key={location.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{location.name}</h3>
                            {location.is_primary && (
                              <Badge variant="outline">Primary</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground mb-2">{location.address}</p>
                          <p className="text-muted-foreground mb-4">{location.phone}</p>
                          
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-1">
                              <Upload className="h-4 w-4" />
                              <span>{location.photo_urls.length} Photos</span>
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
            )}
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
              <Button onClick={() => setInviteStaffOpen(true)}>
                <Mail className="h-4 w-4 mr-2" />
                Invite Staff Member
              </Button>
            </div>
            
            {/* Pending Invitations */}
            {practice && <PendingInvitationsSection practiceId={practice.id} />}
            
            {/* Active Staff */}
            {staff.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Staff Members Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add staff members to help manage your practice
                  </p>
                  <Button onClick={() => setInviteStaffOpen(true)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Invite First Staff Member
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Active Staff Members ({staff.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {staff.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{member.full_name}</h3>
                            <p className="text-sm text-muted-foreground">{member.role} • {member.department}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={member.status === 'active' ? "default" : "secondary"}>
                            {member.status}
                          </Badge>
                          <Button variant="outline" size="sm">Edit</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="patients" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Patient Management</h2>
              <div className="flex gap-2">
                <Input placeholder="Search patients..." className="w-64" />
                <Button variant="outline">Export</Button>
              </div>
            </div>
            
            {patients.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No patients yet</p>
                </CardContent>
              </Card>
            ) : (
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
                  {patients.map((patient) => (
                    <div key={patient.id} className="grid grid-cols-4 gap-4 p-4 border-b hover:bg-muted/30 cursor-pointer">
                      <div className="font-medium">{patient.full_name}</div>
                      <div className="text-muted-foreground">
                        {format(new Date(patient.last_visit), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-muted-foreground">{patient.doctor_name}</div>
                      <div>
                        <Badge variant="outline">{patient.status}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
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
                      <span className="font-semibold">${stats.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Payments</span>
                      <span className="font-semibold text-yellow-600">
                        ${payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Payments</span>
                      <span className="font-semibold text-green-600">
                        ${payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No transactions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {payments.slice(0, 3).map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{payment.patient_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(payment.created_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${payment.amount.toFixed(2)}</p>
                            <Badge variant={payment.status === 'paid' ? "default" : "outline"}>
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                        <span className="font-semibold">{metrics.averageRating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Patient Retention</span>
                      <span className="font-semibold text-green-600">{metrics.patientRetention}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Avg. Wait Time</span>
                      <span className="font-semibold">{metrics.avgWaitTime} min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>No-show Rate</span>
                      <span className="font-semibold text-red-600">{metrics.noShowRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-6">
              <AdvancedFinancialMetrics 
                metrics={advancedMetrics} 
                revenue={stats.totalRevenue}
                onUpdateInputs={() => {
                  refreshData();
                  refreshAdvancedMetrics();
                }}
              />
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
        practiceId={practice?.id || ''}
      />
      <AddLocationModal 
        open={addLocationOpen} 
        onOpenChange={setAddLocationOpen} 
      />
      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      {practice && (
        <>
          <ViewRequirementsModal
            open={requirementsOpen}
            onOpenChange={setRequirementsOpen}
          />
          
          <ComprehensiveRegistrationModal
            open={createClinicOpen}
            onOpenChange={setCreateClinicOpen}
            onSuccess={handleVerificationSuccess}
            practiceId={practice.id}
            existingPracticeData={practice}
          />
        </>
      )}

      {/* Verification Success Modal */}
      <VerificationSuccessModal
        open={verificationModalOpen}
        onOpenChange={handleVerificationModalClose}
        practiceName={practice?.name || "Your Practice"}
      />
    </div>
  );
};

export default AdminDashboard;