import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ScanLine, 
  ClipboardList, 
  Users, 
  FileImage, 
  Settings,
  CheckCircle,
  Loader2,
  Calendar,
  Wrench,
  BarChart3,
  FileText,
  ArrowRightLeft,
  LayoutDashboard
} from 'lucide-react';
import { useImagingCenter } from '@/hooks/useImagingCenter';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardShell, SidebarItem } from '@/components/dashboard/DashboardShell';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatsGrid, StatCardProps } from '@/components/dashboard/StatsGrid';
import { ContentCard } from '@/components/dashboard/ContentCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import ImagingEquipmentManager from '@/components/imaging/ImagingEquipmentManager';
import ImagingScanWorkflow from '@/components/imaging/ImagingScanWorkflow';
import ImagingReportManager from '@/components/imaging/ImagingReportManager';
import ImagingAnalytics from '@/components/imaging/ImagingAnalytics';
import { ImagingReferralsSection } from '@/components/imaging/ImagingReferralsSection';

export default function ImagingDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, activeRole } = useAuth();
  const { myImagingCenter, fetchMyImagingCenter, loading: centerLoading } = useImagingCenter();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchMyImagingCenter();
  }, [fetchMyImagingCenter]);

  const sidebarItems: SidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: 'workflow', label: 'Scan Workflow', icon: <ClipboardList className="h-5 w-5" /> },
    { id: 'reports', label: 'Reports', icon: <FileImage className="h-5 w-5" /> },
    { id: 'equipment', label: 'Equipment', icon: <Wrench className="h-5 w-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-5 w-5" /> },
    { id: 'staff', label: 'Staff', icon: <Users className="h-5 w-5" /> },
    { id: 'referrals', label: 'Referrals', icon: <ArrowRightLeft className="h-5 w-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" />, onClick: () => navigate('/imaging/settings') },
  ];

  const stats: StatCardProps[] = [
    { label: 'Scheduled Today', value: 12, icon: <Calendar className="h-6 w-6" /> },
    { label: 'In Progress', value: 5, icon: <ScanLine className="h-6 w-6" /> },
    { label: 'Pending Reports', value: 8, icon: <FileText className="h-6 w-6" /> },
    { label: 'Completed Today', value: 24, icon: <CheckCircle className="h-6 w-6" /> },
  ];

  if (authLoading || centerLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">Sign In Required</CardTitle>
            <CardDescription className="mb-4">
              Please sign in to access the imaging center dashboard.
            </CardDescription>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!myImagingCenter) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No Imaging Center Found</CardTitle>
            <CardDescription className="mb-4">
              You don't have an imaging center associated with your account.
            </CardDescription>
            <Button onClick={() => navigate('/imaging/register')}>Register Imaging Center</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const centerId = myImagingCenter.id;

  return (
    <DashboardShell
      role={activeRole as any}
      entityName={myImagingCenter.name}
      entityStatus={myImagingCenter.is_verified ? 'verified' : 'pending'}
      sidebarItems={sidebarItems}
      activeItem={activeTab}
      onItemChange={setActiveTab}
    >
      {activeTab === 'overview' && (
        <>
          <PageHeader
            title="Dashboard Overview"
            description="Monitor your imaging center's performance"
            badges={[
              { label: myImagingCenter.is_verified ? 'Verified' : 'Pending Verification', variant: myImagingCenter.is_verified ? 'default' : 'secondary' }
            ]}
          />
          
          <StatsGrid stats={stats} className="mb-8" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ContentCard
              title="Today's Queue"
              description="Upcoming scans for today"
              icon={<Calendar className="h-5 w-5" />}
            >
              <div className="space-y-3">
                {[
                  { time: '09:00', patient: 'John Smith', exam: 'Brain MRI', status: 'checked_in' },
                  { time: '09:30', patient: 'Emily Johnson', exam: 'Chest CT', status: 'scheduled' },
                  { time: '10:00', patient: 'Robert Davis', exam: 'X-ray', status: 'in_progress' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.patient}</p>
                      <p className="text-sm text-muted-foreground">{item.exam} • {item.time}</p>
                    </div>
                    <Badge variant={item.status === 'in_progress' ? 'default' : 'outline'}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </ContentCard>

            <ContentCard
              title="Equipment Status"
              description="Current equipment availability"
              icon={<Wrench className="h-5 w-5" />}
            >
              <div className="space-y-3">
                {[
                  { name: 'MRI Scanner', status: 'active', utilization: 78 },
                  { name: 'CT Scanner', status: 'active', utilization: 85 },
                  { name: 'X-ray Unit', status: 'maintenance', utilization: 0 },
                ].map((eq, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{eq.name}</p>
                      <p className="text-sm text-muted-foreground">{eq.utilization}% utilized</p>
                    </div>
                    <Badge variant={eq.status === 'active' ? 'default' : 'secondary'}>
                      {eq.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ContentCard>
          </div>
        </>
      )}

      {activeTab === 'workflow' && (
        <>
          <PageHeader title="Scan Workflow" description="Manage imaging procedures and patient flow" />
          <ImagingScanWorkflow centerId={centerId} />
        </>
      )}

      {activeTab === 'reports' && (
        <>
          <PageHeader title="Reports" description="View and manage imaging reports" />
          <ImagingReportManager centerId={centerId} />
        </>
      )}

      {activeTab === 'equipment' && (
        <>
          <PageHeader title="Equipment Management" description="Monitor and manage imaging equipment" />
          <ImagingEquipmentManager centerId={centerId} />
        </>
      )}

      {activeTab === 'analytics' && (
        <>
          <PageHeader title="Analytics" description="Performance metrics and insights" />
          <ImagingAnalytics centerId={centerId} />
        </>
      )}

      {activeTab === 'staff' && (
        <>
          <PageHeader title="Staff Management" description="Manage radiologists and technicians" />
          <ContentCard title="Staff Directory" icon={<Users className="h-5 w-5" />}>
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="Staff Management"
              description="Staff management module coming soon"
            />
          </ContentCard>
        </>
      )}

      {activeTab === 'referrals' && (
        <>
          <PageHeader title="Referrals" description="Manage incoming referrals for imaging procedures" />
          <ImagingReferralsSection centerId={centerId} />
        </>
      )}
    </DashboardShell>
  );
}
