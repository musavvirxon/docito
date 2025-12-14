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
  Image as ImageIcon
} from 'lucide-react';
import { useLabCenter } from '@/hooks/useLabCenter';
import { useClinicImagingOrders } from '@/hooks/useClinicImagingOrders';
import { useAuth } from '@/contexts/AuthContext';

export default function ImagingDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { myLabCenter, fetchMyLabCenter, loading: labLoading } = useLabCenter();
  const { imagingOrders, fetchDoctorImagingOrders, loading: ordersLoading } = useClinicImagingOrders();
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    fetchMyLabCenter();
  }, [fetchMyLabCenter]);

  useEffect(() => {
    if (myLabCenter) {
      // Fetch imaging orders for this center
      // Note: Using doctor orders as imaging orders for the center
    }
  }, [myLabCenter]);

  if (authLoading) {
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

  if (labLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading imaging center...</p>
        </div>
      </div>
    );
  }

  if (!myLabCenter || (myLabCenter.type !== 'imaging' && myLabCenter.type !== 'both')) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <ScanLine className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle>No Imaging Center Found</CardTitle>
            <CardDescription>
              You don't have an imaging center associated with your account yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/lab/register')}>
              Register Imaging Center
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingOrders = imagingOrders.filter(o => o.status === 'pending' || o.status === 'scheduled');
  const inProgressOrders = imagingOrders.filter(o => o.status === 'in_progress');
  const completedOrders = imagingOrders.filter(o => o.status === 'completed');

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
            <Badge variant="outline">Imaging Center</Badge>
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
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
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
                <p className="text-2xl font-bold">{inProgressOrders.length}</p>
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
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{myLabCenter.average_turnaround_hours || 2}h</p>
                <p className="text-sm text-muted-foreground">Avg. Wait Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="orders" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <FileImage className="h-4 w-4" />
            <span className="hidden sm:inline">Results</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Staff</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Imaging Orders</CardTitle>
              <CardDescription>Manage incoming imaging requests</CardDescription>
            </CardHeader>
            <CardContent>
              {imagingOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No imaging orders yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {imagingOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{order.exam_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.modality} • {order.body_part}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Order: {order.order_number}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          order.status === 'completed' ? 'default' :
                          order.status === 'in_progress' ? 'secondary' : 'outline'
                        }>
                          {order.status}
                        </Badge>
                        <Badge variant="outline">{order.priority}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>View and manage imaging appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Schedule view coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Results</CardTitle>
              <CardDescription>Upload and manage imaging results</CardDescription>
            </CardHeader>
            <CardContent>
              {inProgressOrders.length === 0 ? (
                <div className="text-center py-12">
                  <FileImage className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No exams pending results</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {inProgressOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{order.exam_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.modality} • Order: {order.order_number}
                        </p>
                      </div>
                      <Button size="sm">Upload Result</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
                <p className="text-muted-foreground">Staff management coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
