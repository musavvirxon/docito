// File: src/pages/StaffDashboard.tsx

import { useState, useMemo } from 'react';
import { Loader2, AlertCircle, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useStaffContext } from '@/hooks/useStaffContext';
import { useStaffDashboard } from '@/hooks/useStaffDashboard';
import { StaffSidebar } from '@/components/staff/StaffSidebar';
import { StaffDashboardOverview } from '@/components/staff/StaffDashboardOverview';
import { TodayScheduleSection } from '@/components/staff/TodayScheduleSection';
import { PatientListSection } from '@/components/staff/PatientListSection';
import { BillingSection } from '@/components/staff/BillingSection';
import PharmacyDashboardContent from '@/components/staff/PharmacyDashboardContent';
import LabDashboardContent from '@/components/staff/LabDashboardContent';
import ImagingDashboardContent from '@/components/staff/ImagingDashboardContent';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import { useAuth } from '@/contexts/AuthContext';

type EntityStatus = 'active' | 'pending' | 'verified' | 'suspended';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const { activeRole } = useAuth();

  const {
    staffType,
    entityInfo,
    permissions: staffPermissions,
    loading: contextLoading,
    error: contextError,
    refetch: refetchContext,
  } = useStaffContext();

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

  const entityStatus: EntityStatus = useMemo(() => {
    // Prefer entityInfo verification fields (added in useStaffContext)
    const verified = Boolean(entityInfo?.is_verified || entityInfo?.verified);

    const rawStatus = String(
      entityInfo?.status ??
        entityInfo?.verification_status ??
        ''
    ).toLowerCase();

    if (rawStatus === 'suspended') return 'suspended';
    if (verified) return 'verified';
    if (rawStatus === 'active') return 'active';

    // Clinic fallback: some pages may have practice object with is_verified
    if (staffType === 'clinic' && (practice as any)?.is_verified) return 'verified';

    return 'pending';
  }, [entityInfo, practice, staffType]);

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
        return <PharmacyDashboardContent />;

      case 'lab':
        return <LabDashboardContent />;

      case 'imaging':
        return <ImagingDashboardContent />;
    }

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
      <StaffSidebar
        staffType={staffType}
        entityInfo={entityInfo}
        permissions={staffPermissions}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="flex-1 flex flex-col">
        {/* ✅ Top Bar with clickable verification badge (routes now exist in App.tsx) */}
        <DashboardTopBar
          role={activeRole}
          entityName={entityInfo?.name}
          entityStatus={entityStatus}
        />

        <main className="flex-1 p-6 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default StaffDashboard;
