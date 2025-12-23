import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ScanLine, Image as ImageIcon, FileText, AlertCircle, 
  Clock, CheckCircle, TrendingUp 
} from "lucide-react";
import type { EntityInfo, ImagingPermissions } from "@/hooks/useStaffContext";

interface ImagingDashboardContentProps {
  entityInfo: EntityInfo | null;
  permissions: ImagingPermissions & { staffType: 'imaging' };
  activeSection: string;
}

// Mock data
const mockStats = {
  pendingScans: 8,
  inProgress: 3,
  pendingReview: 5,
  todayCompleted: 15,
};

const mockOrders = [
  { id: '1', patient: 'John Doe', exam: 'Chest X-Ray', modality: 'X-Ray', status: 'scheduled', priority: 'normal' },
  { id: '2', patient: 'Jane Smith', exam: 'Brain MRI', modality: 'MRI', status: 'in_progress', priority: 'urgent' },
  { id: '3', patient: 'Bob Wilson', exam: 'Abdominal CT', modality: 'CT', status: 'completed', priority: 'normal' },
];

export const ImagingDashboardContent = ({ 
  entityInfo, 
  permissions, 
  activeSection 
}: ImagingDashboardContentProps) => {
  
  if (activeSection === 'dashboard') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground">{entityInfo?.name} - Imaging Dashboard</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{mockStats.pendingScans}</p>
                  <p className="text-sm text-muted-foreground">Pending Scans</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ScanLine className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{mockStats.inProgress}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{mockStats.pendingReview}</p>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{mockStats.todayCompleted}</p>
                  <p className="text-sm text-muted-foreground">Completed Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Imaging Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Recent Imaging Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{order.patient}</p>
                      <p className="text-sm text-muted-foreground">{order.exam}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{order.modality}</Badge>
                    {order.priority === 'urgent' && (
                      <Badge variant="destructive">Urgent</Badge>
                    )}
                    <Badge variant={order.status === 'in_progress' ? 'default' : 'secondary'}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                    {permissions.can_process_scans && (
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'orders') {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Imaging Orders</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">View and manage imaging orders.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'scans') {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Scan Queue</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Manage scheduled scans and appointments.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'results') {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Results Upload</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Upload scan results and reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};
