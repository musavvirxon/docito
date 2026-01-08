import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Package,
  ClipboardList,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  Settings,
  Plus,
  FileText,
  Shield,
  Truck,
  BarChart3,
  ArrowRightLeft,
  Home,
} from 'lucide-react';

import { DashboardShell, SidebarItem } from '@/components/dashboard/DashboardShell';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatsGrid, StatItem } from '@/components/dashboard/StatsGrid';
import { ContentCard } from '@/components/dashboard/ContentCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { usePharmacy } from '@/hooks/usePharmacy';
import { usePharmacyInventory } from '@/hooks/usePharmacyInventory';
import { usePrescriptions } from '@/hooks/usePrescriptions';

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
  const { inventory, lowStockItems, expiringItems } = usePharmacyInventory(pharmacyId);
  const { fulfillmentOrders } = usePrescriptions({ pharmacyId });

  const [activeSection, setActiveSection] = useState('overview');

  // Redirect to pharmacy selection if no pharmacyId
  useEffect(() => {
    if (!pharmacyLoading && !pharmacyId && pharmacies.length > 0) {
      navigate(`/pharmacy/${pharmacies[0].id}`);
    }
  }, [pharmacyLoading, pharmacyId, pharmacies, navigate]);

  const pendingOrders = fulfillmentOrders.filter((o) => o.status === 'pending').length;
  const processingOrders = fulfillmentOrders.filter((o) => o.status === 'processing').length;
  const readyOrders = fulfillmentOrders.filter((o) => o.status === 'ready').length;

  const sidebarItems: SidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: <Home className="h-5 w-5" /> },
    {
      id: 'prescriptions',
      label: 'Prescriptions',
      icon: <FileText className="h-5 w-5" />,
      badge: pendingOrders || undefined,
    },
    { id: 'queue', label: 'Fulfillment Queue', icon: <ClipboardList className="h-5 w-5" /> },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: <Package className="h-5 w-5" />,
      badge: lowStockItems.length || undefined,
    },
    { id: 'patients', label: 'Patients', icon: <Users className="h-5 w-5" /> },
    { id: 'delivery', label: 'Delivery', icon: <Truck className="h-5 w-5" /> },
    { id: 'insurance', label: 'Insurance', icon: <Shield className="h-5 w-5" /> },
    ...(isAdmin
      ? [
          { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-5 w-5" /> },
          { id: 'staff', label: 'Staff', icon: <Users className="h-5 w-5" /> },
        ]
      : []),
    { id: 'referrals', label: 'Referrals', icon: <ArrowRightLeft className="h-5 w-5" /> },
    ...(isAdmin ? [{ id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> }] : []),
  ];

  const stats: StatItem[] = [
    {
      label: 'Pending Orders',
      value: pendingOrders,
      icon: <ClipboardList className="h-5 w-5" />,
      color: 'primary',
    },
    {
      label: 'Processing',
      value: processingOrders,
      icon: <Clock className="h-5 w-5" />,
      color: 'info',
    },
    {
      label: 'Ready for Pickup',
      value: readyOrders,
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'success',
    },
    {
      label: 'Low Stock Items',
      value: lowStockItems.length,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'warning',
    },
  ];

  // ✅ Backend-connected verification status mapping (prevents "hard-coded pending")
  const getPharmacyEntityStatus = (): 'active' | 'pending' | 'verified' | 'suspended' => {
    const vs = (pharmacy?.verification_status || '').toLowerCase();

    if (pharmacy?.verified) return 'verified';
    if (vs === 'verified') return 'verified';
    if (vs === 'suspended') return 'suspended';
    if (vs === 'active') return 'active';

    // pending / under_review / rejected etc.
    return 'pending';
  };

  if (pharmacyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <EmptyState
          icon={<Package className="h-16 w-16" />}
          title="No Pharmacy Found"
          description="You don't have access to any pharmacy yet."
          action={
            <Button onClick={() => navigate('/pharmacy/register')}>
              <Plus className="h-4 w-4 mr-2" />
              Register New Pharmacy
            </Button>
          }
        />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'prescriptions':
        return <PharmacyPrescriptionInbox pharmacyId={pharmacyId!} />;
      case 'queue':
        return <FulfillmentQueue pharmacyId={pharmacyId!} />;
      case 'inventory':
        return <PharmacyInventoryManager pharmacyId={pharmacyId!} />;
      case 'patients':
        return <PharmacyPatientView pharmacyId={pharmacyId!} />;
      case 'delivery':
        return <PharmacyDeliveryOrders pharmacyId={pharmacyId!} />;
      case 'insurance':
        return <PharmacyInsuranceClaims pharmacyId={pharmacyId!} />;
      case 'analytics':
        return isAdmin ? <PharmacyAnalytics pharmacyId={pharmacyId!} /> : null;
      case 'staff':
        return isAdmin ? <PharmacyStaffManager pharmacyId={pharmacyId!} /> : null;
      case 'referrals':
        return <PharmacyReferralsSection pharmacyId={pharmacyId!} />;
      case 'settings':
        return isAdmin ? <PharmacySettings pharmacyId={pharmacyId!} /> : null;
      default:
        return (
          <div className="space-y-6">
            <StatsGrid stats={stats} />

            {/* Alerts */}
            {(lowStockItems.length > 0 || expiringItems.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lowStockItems.length > 0 && (
                  <ContentCard
                    title="Low Stock Alert"
                    description={`${lowStockItems.length} items need attention`}
                    className="border-orange-500/50"
                  >
                    <div className="space-y-2">
                      {lowStockItems.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.medication_name}</span>
                          <span className="text-orange-500 font-medium">{item.quantity_on_hand} left</span>
                        </div>
                      ))}
                    </div>
                  </ContentCard>
                )}

                {expiringItems.length > 0 && (
                  <ContentCard
                    title="Expiring Soon"
                    description={`${expiringItems.length} items expiring`}
                    className="border-red-500/50"
                  >
                    <div className="space-y-2">
                      {expiringItems.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.medication_name}</span>
                          <span className="text-red-500 font-medium">{item.expiry_date}</span>
                        </div>
                      ))}
                    </div>
                  </ContentCard>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ContentCard title="Recent Orders" description="Latest prescription fulfillment orders">
                {fulfillmentOrders.length === 0 ? (
                  <EmptyState
                    icon={<ClipboardList className="h-12 w-12" />}
                    title="No orders yet"
                    description="Orders will appear here"
                  />
                ) : (
                  <div className="space-y-3">
                    {fulfillmentOrders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.pickup_method === 'delivery' ? 'Delivery' : 'Pickup'}
                          </p>
                        </div>
                        <Badge
                          variant={
                            order.status === 'completed'
                              ? 'default'
                              : order.status === 'ready'
                                ? 'secondary'
                                : order.status === 'processing'
                                  ? 'outline'
                                  : 'destructive'
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ContentCard>

              <ContentCard title="Inventory Summary" description="Quick overview of stock levels">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Items</span>
                    <span className="font-bold">{inventory.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Low Stock</span>
                    <span className="font-bold text-orange-500">{lowStockItems.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Expiring Soon</span>
                    <span className="font-bold text-red-500">{expiringItems.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Controlled Substances</span>
                    <span className="font-bold">
                      {inventory.filter((i) => i.is_controlled_substance).length}
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
      role="pharmacy_admin"
      entityName={pharmacy.name}
      entityStatus={getPharmacyEntityStatus()}
      sidebarItems={sidebarItems}
      activeItem={activeSection}
      onItemChange={setActiveSection}
    >
      <PageHeader
        title={
          activeSection === 'overview'
            ? 'Pharmacy Dashboard'
            : sidebarItems.find((i) => i.id === activeSection)?.label || ''
        }
        description={activeSection === 'overview' ? `Welcome back to ${pharmacy.name}` : undefined}
        badges={
          [
            pharmacy.verified && { label: 'Verified', variant: 'default' as const },
            pharmacy.delivery_available && { label: 'Delivery Available', variant: 'outline' as const },
          ].filter(Boolean) as { label: string; variant: 'default' | 'outline' }[]
        }
      />
      {renderContent()}
    </DashboardShell>
  );
}
