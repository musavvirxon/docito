import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRightLeft } from 'lucide-react';
import { 
  FlaskConical, 
  ClipboardList, 
  Users, 
  FileText, 
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
  Microscope,
  TestTube,
  Droplets,
  Home,
  CreditCard,
  BarChart3
} from 'lucide-react';
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

export default function LabDashboard() {
  const navigate = useNavigate();
  const { myLabCenter, fetchMyLabCenter, loading: labLoading } = useLabCenter();
  const { testOrders, fetchLabOrders, loading: ordersLoading } = useTestOrders();
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    fetchMyLabCenter();
  }, [fetchMyLabCenter]);

  useEffect(() => {
    if (myLabCenter) {
      fetchLabOrders(myLabCenter.id);
    }
  }, [myLabCenter, fetchLabOrders]);

  if (labLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!myLabCenter) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <FlaskConical className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle>No Lab Center Found</CardTitle>
            <CardDescription>
              You don't have a lab center associated with your account yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/lab/register')}>
              Register Lab Center
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingOrders = testOrders.filter(o => o.status === 'pending' || o.status === 'scheduled');
  const processingOrders = testOrders.filter(o => o.status === 'sample_collected' || o.status === 'processing');
  const completedOrders = testOrders.filter(o => o.status === 'completed');

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{myLabCenter.name}</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Badge variant={myLabCenter.status === 'active' ? 'default' : 'secondary'}>
              {myLabCenter.status}
            </Badge>
            {myLabCenter.is_verified && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" /> Verified
              </Badge>
            )}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/lab/settings')}>
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
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Microscope className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{processingOrders.length}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
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
                <p className="text-2xl font-bold">{completedOrders.length}</p>
                <p className="text-sm text-muted-foreground">Completed Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <TestTube className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{myLabCenter.average_turnaround_hours || 24}h</p>
                <p className="text-sm text-muted-foreground">Avg. Turnaround</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="orders" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="samples" className="gap-2">
              <Droplets className="h-4 w-4" />
              <span className="hidden sm:inline">Samples</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Results</span>
            </TabsTrigger>
            <TabsTrigger value="home-collection" className="gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home Collection</span>
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              <span className="hidden sm:inline">Catalog</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Staff</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Referrals</span>
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="orders" className="mt-6">
          <LabOrderQueue 
            orders={testOrders} 
            labCenterId={myLabCenter.id}
            onRefresh={() => fetchLabOrders(myLabCenter.id)}
          />
        </TabsContent>

        <TabsContent value="samples" className="mt-6">
          <LabSampleManager labCenterId={myLabCenter.id} />
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <ResultEntry 
            orders={processingOrders}
            labCenterId={myLabCenter.id}
          />
        </TabsContent>

        <TabsContent value="home-collection" className="mt-6">
          <LabHomeCollection labCenterId={myLabCenter.id} />
        </TabsContent>

        <TabsContent value="catalog" className="mt-6">
          <TestCatalogManager labCenterId={myLabCenter.id} />
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <LabBillingInsurance labCenterId={myLabCenter.id} />
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <LabStaffManager labCenterId={myLabCenter.id} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <LabAnalytics labCenterId={myLabCenter.id} />
        </TabsContent>

        <TabsContent value="referrals" className="mt-6">
          <LabReferralsSection labCenterId={myLabCenter.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
