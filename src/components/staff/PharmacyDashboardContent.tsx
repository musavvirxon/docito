import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Pill, Package, ClipboardList, AlertCircle, 
  Clock, CheckCircle, TrendingUp 
} from "lucide-react";
import type { EntityInfo, PharmacyPermissions } from "@/hooks/useStaffContext";

interface PharmacyDashboardContentProps {
  entityInfo: EntityInfo | null;
  permissions: PharmacyPermissions & { staffType: 'pharmacy' };
  activeSection: string;
}

// Mock data - in production, this would come from hooks
const mockStats = {
  pendingPrescriptions: 12,
  readyForPickup: 8,
  lowStockItems: 5,
  todayDispensed: 24,
};

const mockPrescriptions = [
  { id: '1', patient: 'John Doe', medication: 'Amoxicillin 500mg', status: 'pending', priority: 'normal' },
  { id: '2', patient: 'Jane Smith', medication: 'Lisinopril 10mg', status: 'processing', priority: 'urgent' },
  { id: '3', patient: 'Bob Wilson', medication: 'Metformin 850mg', status: 'ready', priority: 'normal' },
];

export const PharmacyDashboardContent = ({ 
  entityInfo, 
  permissions, 
  activeSection 
}: PharmacyDashboardContentProps) => {
  
  if (activeSection === 'dashboard') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground">{entityInfo?.name} - Pharmacy Dashboard</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{mockStats.pendingPrescriptions}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
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
                  <p className="text-2xl font-bold">{mockStats.readyForPickup}</p>
                  <p className="text-sm text-muted-foreground">Ready for Pickup</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{mockStats.lowStockItems}</p>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
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
                  <p className="text-2xl font-bold">{mockStats.todayDispensed}</p>
                  <p className="text-sm text-muted-foreground">Dispensed Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Prescriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5" />
              Recent Prescriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockPrescriptions.map((rx) => (
                <div key={rx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{rx.patient}</p>
                      <p className="text-sm text-muted-foreground">{rx.medication}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rx.priority === 'urgent' && (
                      <Badge variant="destructive">Urgent</Badge>
                    )}
                    <Badge variant={rx.status === 'ready' ? 'default' : 'secondary'}>
                      {rx.status}
                    </Badge>
                    {permissions.can_dispense && (
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

  if (activeSection === 'prescriptions') {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Prescriptions</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">View and manage incoming prescriptions.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'dispensing') {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Dispensing Queue</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Process prescriptions ready for dispensing.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'inventory') {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Inventory Management</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Track and manage medication inventory.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};
