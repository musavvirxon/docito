import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FlaskConical, TestTube, FileText, AlertCircle, 
  Clock, CheckCircle, TrendingUp 
} from "lucide-react";
import type { EntityInfo, LabPermissions } from "@/hooks/useStaffContext";

interface LabDashboardContentProps {
  entityInfo: EntityInfo | null;
  permissions: LabPermissions & { staffType: 'lab' };
  activeSection: string;
}

// Mock data
const mockStats = {
  pendingOrders: 18,
  samplesCollected: 12,
  resultsReady: 8,
  todayProcessed: 34,
};

const mockOrders = [
  { id: '1', patient: 'John Doe', test: 'Complete Blood Count', status: 'pending', priority: 'normal' },
  { id: '2', patient: 'Jane Smith', test: 'Lipid Panel', status: 'collected', priority: 'urgent' },
  { id: '3', patient: 'Bob Wilson', test: 'HbA1c', status: 'processing', priority: 'normal' },
];

export const LabDashboardContent = ({ 
  entityInfo, 
  permissions, 
  activeSection 
}: LabDashboardContentProps) => {
  
  if (activeSection === 'dashboard') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground">{entityInfo?.name} - Laboratory Dashboard</p>
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
                  <p className="text-2xl font-bold">{mockStats.pendingOrders}</p>
                  <p className="text-sm text-muted-foreground">Pending Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <TestTube className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{mockStats.samplesCollected}</p>
                  <p className="text-sm text-muted-foreground">Samples Collected</p>
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
                  <p className="text-2xl font-bold">{mockStats.resultsReady}</p>
                  <p className="text-sm text-muted-foreground">Results Ready</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{mockStats.todayProcessed}</p>
                  <p className="text-sm text-muted-foreground">Processed Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Lab Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5" />
              Recent Lab Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{order.patient}</p>
                      <p className="text-sm text-muted-foreground">{order.test}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {order.priority === 'urgent' && (
                      <Badge variant="destructive">Urgent</Badge>
                    )}
                    <Badge variant={order.status === 'processing' ? 'default' : 'secondary'}>
                      {order.status}
                    </Badge>
                    {permissions.can_process_samples && (
                      <Button size="sm" variant="outline">
                        Process
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
        <h2 className="text-2xl font-bold text-foreground">Lab Orders</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">View and manage incoming lab orders.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'samples') {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Sample Collection</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Track sample collection and processing.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'results') {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Results</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Upload and manage test results.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};
