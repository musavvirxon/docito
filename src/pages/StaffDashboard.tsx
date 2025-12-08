import { useState } from 'react';
import { Loader2, AlertCircle, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useStaffDashboard } from '@/hooks/useStaffDashboard';
import { StaffSidebar } from '@/components/staff/StaffSidebar';
import { StaffDashboardOverview } from '@/components/staff/StaffDashboardOverview';
import { TodayScheduleSection } from '@/components/staff/TodayScheduleSection';
import { PatientListSection } from '@/components/staff/PatientListSection';
import { BillingSection } from '@/components/staff/BillingSection';
import ThemeToggle from '@/components/home/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  
  const {
    permissions,
    practice,
    todaysAppointments,
    upcomingAppointments,
    recentPatients,
    recentPayments,
    loading,
    error,
    refreshData,
    updateAppointmentStatus,
  } = useStaffDashboard();

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

  if (error || !permissions || !permissions.practice_id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              {error || 'You are not assigned to any clinic. Please contact your administrator.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate('/')}>
                Go Home
              </Button>
              <Button onClick={refreshData}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <StaffDashboardOverview
            practice={practice}
            permissions={permissions}
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
            canUpdateAppointments={permissions.can_book_appointments}
          />
        );
      
      case 'patients':
        return (
          <PatientListSection
            patients={recentPatients}
            onRefresh={refreshData}
            canManagePatients={permissions.can_manage_patients}
          />
        );
      
      case 'billing':
        return (
          <BillingSection
            payments={recentPayments}
            onRefresh={refreshData}
          />
        );
      
      case 'settings':
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
      
      default:
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
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <StaffSidebar
        permissions={permissions}
        practice={practice}
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
