// File: src/pages/lab/LabDashboard.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  ClipboardList,
  Users,
  FileText,
  Settings,
  Clock,
  CheckCircle,
  Microscope,
  TestTube,
  Droplets,
  Home,
  CreditCard,
  BarChart3,
  ArrowRightLeft,
} from 'lucide-react';
import { DashboardShell, SidebarItem } from '@/components/dashboard/DashboardShell';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatsGrid, StatItem } from '@/components/dashboard/StatsGrid';
import { ContentCard } from '@/components/dashboard/ContentCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { useLabCenter } from '@/hooks/useLabCenter';
import { useTestOrders } from '@/hooks/useTestOrders';
import { LabOrderQueue } from '@/components/lab/LabOrderQueue';
import { TestCatalogManager } from '@/components/lab/TestCatalogManager';
import { LabStaffManager } from '@/components/lab/LabStaffManager';
import { ResultEntry } from '@/components/lab/ResultEntry';
import LabSampleManager from '@/components/lab/LabSampleManager';
import LabHomeCollection from '@/components/lab/LabHomeCollection';
import LabBillingInsurance from '@/components/lab/LabBillingInsurance';
import LabAnalytics from '@/components/lab/LabAnalytics';
import { LabReferralsSection } from '@/components/lab/LabReferralsSection';
import { LabSettingsSection } from '@/components/lab/LabSettingsSection';
import { Button } from '@/components/ui/button';

export default function LabDashboard() {
  const navigate = useNavigate();
  const { myLabCenter, fetchMyLabCenter, loading: labLoading } = useLabCenter();
  const { testOrders, fetchLabOrders } = useTestOrders();
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    fetchMyLabCenter();
  }, [fetchMyLabCenter]);

  useEffect(() => {
    if (myLabCenter) {
      fetchLabOrders(myLabCenter.id);
    }
  }, [myLabCenter, fetchLabOrders]);

  const pendingOrders = testOrders.filter((o) => o.status === 'pending' || o.status === 'scheduled');
  const processingOrders = testOrders.filter((o) => o.status === 'sample_collected' || o.status === 'processing');
  const completedOrders = testOrders.filter((o) => o.status === 'completed');

  const sidebarItems: SidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: <Home className="h-5 w-5" /> },
    {
      id: 'orders',
      label: 'Orders',
      icon: <ClipboardList className="h-5 w-5" />,
      badge: pendingOrders.length || undefined,
    },
    { id: 'samples', label: 'Samples', icon: <Droplets className="h-5 w-5" /> },
    { id: 'results', label: 'Results', icon: <FileText className="h-5 w-5" /> },
    { id: 'home-collection', label: 'Home Collection', icon: <Home className="h-5 w-5" /> },
    { id: 'catalog', label: 'Test Catalog', icon: <FlaskConical className="h-5 w-5" /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard className="h-5 w-5" /> },
    { id: 'staff', label: 'Staff', icon: <Users className="h-5 w-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-5 w-5" /> },
    { id: 'referrals', label: 'Referrals', icon: <ArrowRightLeft className="h-5 w-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ];

  const stats: StatItem[] = [
    {
      label: 'Pending Orders',
      value: pendingOrders.length,
      icon: <Clock className="h-5 w-5" />,
      color: 'warning',
    },
    {
      label: 'In Progress',
      value: processingOrders.length,
      icon: <Microscope className="h-5 w-5" />,
      color: 'info',
    },
    {
      label: 'Completed Today',
      value: completedOrders.length,
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'success',
    },
    {
      label: 'Avg. Turnaround',
      value: `${myLabCenter?.average_turnaround_hours || 24}h`,
      icon: <TestTube className="h-5 w-5" />,
      color: 'primary',
    },
  ];

  if (labLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!myLabCenter) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <EmptyState
          icon={<FlaskConical className="h-16 w-16" />}
          title="No Lab Center Found"
          description="You don't have a lab center associated with your account yet."
          action={<Button onClick={() => navigate('/lab/register')}>Register Lab Center</Button>}
        />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'orders':
        return (
          <LabOrderQueue
            orders={testOrders}
            labCenterId={myLabCenter.id}
            onRefresh={() => fetchLabOrders(myLabCenter.id)}
          />
        );
      case 'samples':
        return <LabSampleManager labCenterId={myLabCenter.id} />;
      case 'results':
        return <ResultEntry orders={processingOrders} labCenterId={myLabCenter.id} />;
      case 'home-collection':
        return <LabHomeCollection labCenterId={myLabCenter.id} />;
      case 'catalog':
        return <TestCatalogManager labCenterId={myLabCenter.id} />;
      case 'billing':
        return <LabBillingInsurance labCenterId={myLabCenter.id} />;
      case 'staff':
        return <LabStaffManager labCenterId={myLabCenter.id} />;
      case 'analytics':
        return <LabAnalytics labCenterId={myLabCenter.id} />;
      case 'referrals':
        return <LabReferralsSection labCenterId={myLabCenter.id} />;
      case 'settings':
        return <LabSettingsSection labCenterId={myLabCenter.id} />;
      default:
        return (
          <div className="space-y-6">
            <StatsGrid stats={stats} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ContentCard title="Recent Orders" description="Latest test orders">
                {pendingOrders.length === 0 ? (
                  <EmptyState
                    icon={<ClipboardList className="h-12 w-12" />}
                    title="No pending orders"
                    description="All caught up!"
                  />
                ) : (
                  <div className="space-y-3">
                    {pendingOrders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            Priority: {order.priority || 'Normal'}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                          {order.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ContentCard>

              <ContentCard title="Quick Stats" description="Lab performance overview">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Orders Today</span>
                    <span className="font-semibold">{testOrders.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Completion Rate</span>
                    <span className="font-semibold text-green-600">
                      {testOrders.length > 0
                        ? Math.round((completedOrders.length / testOrders.length) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Verification Status</span>
                    <span
                      className={`font-semibold ${
                        myLabCenter.is_verified ? 'text-green-600' : 'text-yellow-600'
                      }`}
                    >
                      {myLabCenter.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                </div>
              </ContentCard>
            </div>
          </div>
        );
    }
  };

  return (
    <DashboardShell
      role="lab_admin"
      entityName={myLabCenter.name}
      entityStatus={myLabCenter.is_verified ? 'verified' : 'pending'}
      sidebarItems={sidebarItems}
      activeItem={activeSection}
      onItemChange={setActiveSection}
    >
      <PageHeader
        title={
          activeSection === 'overview'
            ? 'Lab Dashboard'
            : sidebarItems.find((i) => i.id === activeSection)?.label || ''
        }
        description={activeSection === 'overview' ? `Welcome back to ${myLabCenter.name}` : undefined}
      />
      {renderContent()}
    </DashboardShell>
  );
}
