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
  Clock,
  CheckCircle,
  Loader2,
  Calendar,
  Wrench,
  BarChart3,
  FileText,
  ArrowRightLeft
} from 'lucide-react';
import { useLabCenter } from '@/hooks/useLabCenter';
import { useAuth } from '@/contexts/AuthContext';
import ImagingEquipmentManager from '@/components/imaging/ImagingEquipmentManager';
import ImagingScanWorkflow from '@/components/imaging/ImagingScanWorkflow';
import ImagingReportManager from '@/components/imaging/ImagingReportManager';
import ImagingAnalytics from '@/components/imaging/ImagingAnalytics';
import { ImagingReferralsSection } from '@/components/imaging/ImagingReferralsSection';

export default function ImagingDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { myLabCenter, fetchMyLabCenter, loading: labLoading } = useLabCenter();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchMyLabCenter();
  }, [fetchMyLabCenter]);

  if (authLoading || labLoading) {
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

  // For demo purposes, use a mock center ID
  const centerId = myLabCenter?.id || 'demo-center';

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{myLabCenter?.name || 'Imaging Center Dashboard'}</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Badge variant="default">Active</Badge>
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle className="h-3 w-3 mr-1" /> Verified
            </Badge>
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/imaging/settings')}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Calendar className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Scheduled Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <ScanLine className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">5</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <FileText className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">8</p>
                <p className="text-sm text-muted-foreground">Pending Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">24</p>
                <p className="text-sm text-muted-foreground">Completed Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workflow" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Scan Workflow
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileImage className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-2">
            <Wrench className="h-4 w-4" />
            Equipment
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Users className="h-4 w-4" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Referrals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Today's Queue</CardTitle>
                <CardDescription>Upcoming scans for today</CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Equipment Status</CardTitle>
                <CardDescription>Current equipment availability</CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflow" className="mt-6">
          <ImagingScanWorkflow centerId={centerId} />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <ImagingReportManager centerId={centerId} />
        </TabsContent>

        <TabsContent value="equipment" className="mt-6">
          <ImagingEquipmentManager centerId={centerId} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <ImagingAnalytics centerId={centerId} />
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Staff Management</CardTitle>
              <CardDescription>Manage radiologists and technicians</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Staff management module</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="mt-6">
          <ImagingReferralsSection centerId={centerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
