import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePharmacy } from '@/hooks/usePharmacy';
import { usePharmacyInventory } from '@/hooks/usePharmacyInventory';
import { usePrescriptions } from '@/hooks/usePrescriptions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  ClipboardList, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Plus,
  FileText,
  Shield,
  Truck,
  BarChart3,
  ArrowRightLeft
} from 'lucide-react';
import PharmacyInventoryManager from '@/components/pharmacy/PharmacyInventoryManager';
import FulfillmentQueue from '@/components/pharmacy/FulfillmentQueue';
import PharmacyStaffManager from '@/components/pharmacy/PharmacyStaffManager';
import PharmacyPrescriptionInbox from '@/components/pharmacy/PharmacyPrescriptionInbox';
import PharmacyInsuranceClaims from '@/components/pharmacy/PharmacyInsuranceClaims';
import PharmacyDeliveryOrders from '@/components/pharmacy/PharmacyDeliveryOrders';
import PharmacyAnalytics from '@/components/pharmacy/PharmacyAnalytics';
import PharmacySettings from '@/components/pharmacy/PharmacySettings';
import PharmacyPatientView from '@/components/pharmacy/PharmacyPatientView';
import { PharmacyReferralsSection } from '@/components/pharmacy/PharmacyReferralsSection';

export default function PharmacyDashboard() {
  const { pharmacyId } = useParams();
  const navigate = useNavigate();
  const { pharmacy, pharmacies, loading: pharmacyLoading, isAdmin } = usePharmacy(pharmacyId);
  const { inventory, lowStockItems, expiringItems, loading: inventoryLoading } = usePharmacyInventory(pharmacyId);
  const { fulfillmentOrders, loading: ordersLoading } = usePrescriptions({ pharmacyId });

  const [activeTab, setActiveTab] = useState('overview');

  // Redirect to pharmacy selection if no pharmacyId
  useEffect(() => {
    if (!pharmacyLoading && !pharmacyId && pharmacies.length > 0) {
      navigate(`/pharmacy/${pharmacies[0].id}`);
    }
  }, [pharmacyLoading, pharmacyId, pharmacies, navigate]);

  if (pharmacyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Pharmacy Found</h2>
            <p className="text-muted-foreground mb-6">
              You don't have access to any pharmacy yet.
            </p>
            <Button onClick={() => navigate('/pharmacy/register')}>
              <Plus className="h-4 w-4 mr-2" />
              Register New Pharmacy
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingOrders = fulfillmentOrders.filter(o => o.status === 'pending').length;
  const processingOrders = fulfillmentOrders.filter(o => o.status === 'processing').length;
  const readyOrders = fulfillmentOrders.filter(o => o.status === 'ready').length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{pharmacy.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={pharmacy.verified ? 'default' : 'secondary'}>
              {pharmacy.verified ? 'Verified' : 'Pending Verification'}
            </Badge>
            {pharmacy.delivery_available && (
              <Badge variant="outline">Delivery Available</Badge>
            )}
          </div>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={() => navigate(`/pharmacy/${pharmacyId}/settings`)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold">{pendingOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold">{processingOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ready for Pickup</p>
                <p className="text-2xl font-bold">{readyOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold">{lowStockItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(lowStockItems.length > 0 || expiringItems.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStockItems.length > 0 && (
            <Card className="border-orange-500/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Low Stock Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {lowStockItems.slice(0, 5).map(item => (
                    <li key={item.id} className="text-sm flex justify-between">
                      <span>{item.medication_name}</span>
                      <span className="text-orange-500 font-medium">
                        {item.quantity_on_hand} left
                      </span>
                    </li>
                  ))}
                </ul>
                {lowStockItems.length > 5 && (
                  <Button variant="link" className="p-0 h-auto mt-2" onClick={() => setActiveTab('inventory')}>
                    View all {lowStockItems.length} items
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {expiringItems.length > 0 && (
            <Card className="border-red-500/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Expiring Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {expiringItems.slice(0, 5).map(item => (
                    <li key={item.id} className="text-sm flex justify-between">
                      <span>{item.medication_name}</span>
                      <span className="text-red-500 font-medium">
                        {item.expiry_date}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="prescriptions" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            Prescriptions
          </TabsTrigger>
          <TabsTrigger value="queue">Fulfillment Queue</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Patients
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-1">
            <Truck className="h-4 w-4" />
            Delivery
          </TabsTrigger>
          <TabsTrigger value="insurance" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            Insurance
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="analytics" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          )}
          {isAdmin && <TabsTrigger value="staff">Staff</TabsTrigger>}
          {isAdmin && (
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          )}
          <TabsTrigger value="referrals" className="flex items-center gap-1">
            <ArrowRightLeft className="h-4 w-4" />
            Referrals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest prescription fulfillment orders</CardDescription>
              </CardHeader>
              <CardContent>
                {fulfillmentOrders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No orders yet
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {fulfillmentOrders.slice(0, 5).map(order => (
                      <li key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.pickup_method === 'delivery' ? 'Delivery' : 'Pickup'}
                          </p>
                        </div>
                        <Badge variant={
                          order.status === 'completed' ? 'default' :
                          order.status === 'ready' ? 'secondary' :
                          order.status === 'processing' ? 'outline' : 'destructive'
                        }>
                          {order.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Summary</CardTitle>
                <CardDescription>Quick overview of stock levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Items</span>
                    <span className="font-bold">{inventory.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Low Stock</span>
                    <span className="font-bold text-orange-500">{lowStockItems.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Expiring Soon</span>
                    <span className="font-bold text-red-500">{expiringItems.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Controlled Substances</span>
                    <span className="font-bold">
                      {inventory.filter(i => i.is_controlled_substance).length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-6">
          <PharmacyPrescriptionInbox pharmacyId={pharmacyId!} />
        </TabsContent>

        <TabsContent value="queue" className="mt-6">
          <FulfillmentQueue pharmacyId={pharmacyId!} />
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <PharmacyInventoryManager pharmacyId={pharmacyId!} />
        </TabsContent>

        <TabsContent value="patients" className="mt-6">
          <PharmacyPatientView pharmacyId={pharmacyId!} />
        </TabsContent>

        <TabsContent value="delivery" className="mt-6">
          <PharmacyDeliveryOrders pharmacyId={pharmacyId!} />
        </TabsContent>

        <TabsContent value="insurance" className="mt-6">
          <PharmacyInsuranceClaims pharmacyId={pharmacyId!} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="analytics" className="mt-6">
            <PharmacyAnalytics pharmacyId={pharmacyId!} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="staff" className="mt-6">
            <PharmacyStaffManager pharmacyId={pharmacyId!} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="settings" className="mt-6">
            <PharmacySettings pharmacyId={pharmacyId!} />
          </TabsContent>
        )}

        <TabsContent value="referrals" className="mt-6">
          <PharmacyReferralsSection pharmacyId={pharmacyId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
