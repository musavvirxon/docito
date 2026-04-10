import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  RefreshCw,
  Clock,
  User,
  TestTube,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useTestOrders } from '@/hooks/useTestOrders';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { LabManualTestOrderDialog } from './LabManualTestOrderDialog';

type TestOrder = Database['public']['Tables']['test_orders']['Row'];
type TestOrderAny = TestOrder & {
  // walk-in snapshot fields (after your migration)
  facility_patient_id?: string | null;
  patient_name?: string | null;
  patient_phone?: string | null;
  patient_email?: string | null;
};

interface LabOrderQueueProps {
  orders: TestOrder[];
  labCenterId: string;
  onRefresh: () => void;
}

export function LabOrderQueue({ orders, labCenterId, onRefresh }: LabOrderQueueProps) {
  const { t } = useTranslation("labAdminDashboard");
  const { updateOrderStatus, loading } = useTestOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<TestOrderAny | null>(null);

  // ✅ B: manual order dialog
  const [manualOpen, setManualOpen] = useState(false);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (orders as TestOrderAny[]).filter((order) => {
      const hay = `${order.order_number ?? ''} ${order.patient_name ?? ''} ${order.patient_phone ?? ''} ${order.patient_id ?? ''}`.toLowerCase();
      const matchesSearch = !term || hay.includes(term);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const getStatusBadge = (status: string | null) => {
    const statusStyles: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      scheduled: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      sample_collected: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      processing: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      completed: 'bg-green-500/10 text-green-500 border-green-500/20',
      cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
    };
    return statusStyles[status || 'pending'] || statusStyles.pending;
  };

  const getPriorityBadge = (priority: string | null) => {
    if (priority === 'stat') return <Badge variant="destructive">STAT</Badge>;
    if (priority === 'urgent') return <Badge variant="outline" className="border-orange-500 text-orange-500">Urgent</Badge>;
    return null;
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await updateOrderStatus(orderId, newStatus);
    onRefresh();
  };

  const getNextAction = (status: string | null) => {
    switch (status) {
      case 'pending':
      case 'scheduled':
        return { label: 'Collect Sample', nextStatus: 'sample_collected' };
      case 'sample_collected':
        return { label: 'Start Processing', nextStatus: 'processing' };
      case 'processing':
        return { label: 'Mark Complete', nextStatus: 'completed' };
      default:
        return null;
    }
  };

  // ✅ B: show patient for registered OR walk-in
  const patientDisplay = (o: TestOrderAny) => {
    const name =
      (o.patient_name && o.patient_name.trim()) ||
      (o.patient_id ? `Patient ${o.patient_id.slice(0, 8)}…` : 'Unknown patient');
    const phone = o.patient_phone || null;
    const isWalkIn = !!o.facility_patient_id || !o.patient_id;
    return { name, phone, isWalkIn };
  };

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order #, patient name/phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="sample_collected">Sample Collected</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* ✅ B: manual order */}
          <Button onClick={() => setManualOpen(true)} disabled={!labCenterId}>
            <Plus className="h-4 w-4 mr-2" />
            New manual order
          </Button>

          <Button variant="outline" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Order List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Orders List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Test Orders ({filteredOrders.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {filteredOrders.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">No orders found</div>
                ) : (
                  <div className="divide-y">
                    {filteredOrders.map((order) => {
                      const p = patientDisplay(order);
                      return (
                        <div
                          key={order.id}
                          className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                            selectedOrder?.id === order.id ? 'bg-muted' : ''
                          }`}
                          onClick={() => setSelectedOrder(order)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium">{order.order_number}</span>
                                {getPriorityBadge(order.priority)}
                                {p.isWalkIn && <Badge variant="outline" className="text-xs">Walk-in</Badge>}
                              </div>

                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span className="line-clamp-1">{p.name}</span>
                                {p.phone ? <span className="font-mono opacity-80">• {p.phone}</span> : null}
                              </div>

                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(new Date(order.created_at), 'MMM d, HH:mm')}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={getStatusBadge(order.status)}>
                                {(order.status || 'pending').replace('_', ' ')}
                              </Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>

                          {order.clinical_notes && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                              {order.clinical_notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedOrder ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-lg font-bold">{selectedOrder.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        Created {format(new Date(selectedOrder.created_at), 'PPp')}
                      </p>
                    </div>
                    <Badge variant="outline" className={getStatusBadge(selectedOrder.status)}>
                      {(selectedOrder.status || 'pending').replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Patient */}
                  {(() => {
                    const p = patientDisplay(selectedOrder);
                    return (
                      <div className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{p.name}</span>
                          {p.isWalkIn && <Badge variant="outline" className="text-xs">Walk-in</Badge>}
                        </div>
                        {p.phone ? (
                          <div className="text-sm text-muted-foreground">
                            Phone: <span className="font-mono">{p.phone}</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Priority</p>
                      <p className="font-medium capitalize">{selectedOrder.priority || 'Routine'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payment</p>
                      <p className="font-medium capitalize">{selectedOrder.payment_status || 'Pending'}</p>
                    </div>

                    {selectedOrder.scheduled_date && (
                      <div>
                        <p className="text-muted-foreground">Scheduled</p>
                        <p className="font-medium">
                          {format(new Date(selectedOrder.scheduled_date), 'MMM d, yyyy')}
                          {selectedOrder.scheduled_time && ` at ${selectedOrder.scheduled_time}`}
                        </p>
                      </div>
                    )}

                    {selectedOrder.sample_collected_at && (
                      <div>
                        <p className="text-muted-foreground">Sample Collected</p>
                        <p className="font-medium">
                          {format(new Date(selectedOrder.sample_collected_at), 'PPp')}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedOrder.clinical_notes && (
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Clinical Notes</p>
                      <p className="text-sm bg-muted p-3 rounded-lg">{selectedOrder.clinical_notes}</p>
                    </div>
                  )}

                  {selectedOrder.diagnosis_codes && selectedOrder.diagnosis_codes.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-sm mb-2">Diagnosis Codes</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedOrder.diagnosis_codes.map((code, i) => (
                          <Badge key={i} variant="secondary">{code}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {getNextAction(selectedOrder.status) && (
                    <div className="pt-4 border-t">
                      <Button
                        className="w-full"
                        onClick={() =>
                          handleStatusChange(
                            selectedOrder.id,
                            getNextAction(selectedOrder.status)!.nextStatus
                          )
                        }
                        disabled={loading}
                      >
                        {getNextAction(selectedOrder.status)!.label}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select an order to view details</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ✅ Manual order dialog */}
      <LabManualTestOrderDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        labCenterId={labCenterId}
        onCreated={onRefresh}
      />
    </>
  );
}
