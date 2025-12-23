import { useState } from 'react';
import { Loader2, AlertCircle, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useStaffContext, type PharmacyPermissions, type LabPermissions, type ImagingPermissions } from '@/hooks/useStaffContext';
import { useStaffDashboard } from '@/hooks/useStaffDashboard';
import { StaffSidebar } from '@/components/staff/StaffSidebar';
import { StaffDashboardOverview } from '@/components/staff/StaffDashboardOverview';
import { TodayScheduleSection } from '@/components/staff/TodayScheduleSection';
import { PatientListSection } from '@/components/staff/PatientListSection';
import { BillingSection } from '@/components/staff/BillingSection';
import { PharmacyDashboardContent } from '@/components/staff/PharmacyDashboardContent';
import { LabDashboardContent } from '@/components/staff/LabDashboardContent';
import { ImagingDashboardContent } from '@/components/staff/ImagingDashboardContent';
import ThemeToggle from '@/components/home/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  
  // Use new staff context for role detection
  const {
    staffType,
    entityInfo,
    permissions: staffPermissions,
    loading: contextLoading,
    error: contextError,
    refetch: refetchContext,
  } = useStaffContext();

  // Use existing hook for clinic-specific data (for backward compatibility)
  const {
    permissions: clinicPermissions,
    practice,
    todaysAppointments,
    upcomingAppointments,
    recentPatients,
    recentPayments,
    loading: dataLoading,
    error: dataError,
    refreshData,
    updateAppointmentStatus,
  } = useStaffDashboard();

  const loading = contextLoading || (staffType === 'clinic' && dataLoading);
  const error = contextError || (staffType === 'clinic' && dataError);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !staffPermissions || !staffPermissions.entity_id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              {error || 'You are not assigned to any organization. Please contact your administrator.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('/')}>
                Go Home
              </Button>
              <Button onClick={refetchContext}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    // Settings section (shared across all staff types)
    if (activeSection === 'settings') {
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                Settings panel coming soon. Contact your administrator for account changes.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Render content based on staff type
    switch (staffType) {
      case 'clinic':
        switch (activeSection) {
          case 'dashboard':
            return (
              <StaffDashboardOverview
                practice={practice}
                permissions={clinicPermissions}
                todaysAppointments={todaysAppointments}
                upcomingAppointments={upcomingAppointments}
                recentPayments={recentPayments}
                onNavigate={setActiveSection}
              />
            );
          case 'today':
          case 'appointments':
            return (
              <TodayScheduleSection
                appointments={activeSection === 'today' ? todaysAppointments : upcomingAppointments}
                onStatusUpdate={updateAppointmentStatus}
                onRefresh={refreshData}
                canUpdateAppointments={clinicPermissions?.can_book_appointments || false}
              />
            );
          case 'patients':
            return (
              <PatientListSection
                patients={recentPatients}
                onRefresh={refreshData}
                canManagePatients={clinicPermissions?.can_manage_patients || false}
              />
            );
          case 'billing':
            return (
              <BillingSection
                payments={recentPayments}
                onRefresh={refreshData}
              />
            );
        }
        break;

      case 'pharmacy':
        return (
          <PharmacyDashboardContent
            entityInfo={entityInfo}
            permissions={staffPermissions as PharmacyPermissions & { staffType: 'pharmacy' }}
            activeSection={activeSection}
          />
        );

      case 'lab':
        return (
          <LabDashboardContent
            entityInfo={entityInfo}
            permissions={staffPermissions as LabPermissions & { staffType: 'lab' }}
            activeSection={activeSection}
          />
        );

      case 'imaging':
        return (
          <ImagingDashboardContent
            entityInfo={entityInfo}
            permissions={staffPermissions as ImagingPermissions & { staffType: 'imaging' }}
            activeSection={activeSection}
          />
        );
    }

    // Default placeholder for unhandled sections
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground capitalize">
          {activeSection.replace('-', ' ')}
        </h2>
        <Card>
          <CardContent className="p-6 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              This section is under development.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <StaffSidebar
        staffType={staffType}
        entityInfo={entityInfo}
        permissions={staffPermissions}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-end px-6 gap-4">
          <ThemeToggle />
          <LanguageSwitcher />
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default StaffDashboard;
