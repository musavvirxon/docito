import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Truck, 
  Search, 
  Eye, 
  MapPin, 
  Clock,
  CheckCircle,
  Package,
  Phone,
  User,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DeliveryOrder {
  id: string;
  order_number: string;
  patient_id: string;
  pharmacy_id: string;
  delivery_address: string | null;
  delivery_notes: string | null;
  status: string;
  pickup_method: string;
  estimated_ready_at: string | null;
  ready_at: string | null;
  picked_up_at: string | null;
  total_amount: number | null;
  created_at: string;
}

interface Props {
  pharmacyId: string;
}

export default function PharmacyDeliveryOrders({ pharmacyId }: Props) {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (pharmacyId) {
      fetchOrders();
    }
  }, [pharmacyId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fulfillment_orders')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .eq('pickup_method', 'delivery')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching delivery orders:', error);
      toast.error('Failed to load delivery orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setProcessing(true);
    try {
      const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
      
      if (newStatus === 'out_for_delivery') {
        updates.ready_at = new Date().toISOString();
      } else if (newStatus === 'delivered') {
        updates.picked_up_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('fulfillment_orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success(`Order marked as ${newStatus.replace('_', ' ')}`);
      fetchOrders();
      setIsDetailsOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update order');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
      processing: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
      ready: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
      out_for_delivery: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
      delivered: 'bg-green-500/10 text-green-600 border-green-500/30',
      cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
    };
    return (
      <Badge variant="outline" className={colors[status] || ''}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.delivery_address?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingDeliveries = orders.filter(o => o.status === 'ready' || o.status === 'out_for_delivery').length;
  const completedToday = orders.filter(o => {
    if (o.status !== 'delivered' || !o.picked_up_at) return false;
    const today = new Date();
    const deliveryDate = new Date(o.picked_up_at);
    return deliveryDate.toDateString() === today.toDateString();
  }).length;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Deliveries</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Delivery</p>
                  <p className="text-2xl font-bold">{pendingDeliveries}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Out for Delivery</p>
                  <p className="text-2xl font-bold">
                    {orders.filter(o => o.status === 'out_for_delivery').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed Today</p>
                  <p className="text-2xl font-bold">{completedToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Delivery Orders
                </CardTitle>
                <CardDescription>Manage delivery orders and track shipments</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchOrders}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search by order # or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="ready">Ready for Dispatch</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Delivery Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Est. Ready</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No delivery orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 max-w-xs">
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">
                              {order.delivery_address || 'No address'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>${order.total_amount?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {order.estimated_ready_at 
                            ? format(new Date(order.estimated_ready_at), 'MMM d, h:mm a')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(order.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsDetailsOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {order.status === 'ready' && (
                              <Button 
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                                disabled={processing}
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                Dispatch
                              </Button>
                            )}
                            {order.status === 'out_for_delivery' && (
                              <Button 
                                size="sm"
                                onClick={() => updateOrderStatus(order.id, 'delivered')}
                                disabled={processing}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Delivered
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Details - {selectedOrder?.order_number}
            </DialogTitle>
            <DialogDescription>
              View delivery order information and tracking
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Order Amount</p>
                  <p className="font-medium">${selectedOrder.total_amount?.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Delivery Address
                </h4>
                <Card className="p-4 bg-muted/50">
                  <p>{selectedOrder.delivery_address || 'No address provided'}</p>
                </Card>
              </div>

              {selectedOrder.delivery_notes && (
                <div>
                  <h4 className="font-medium mb-2">Delivery Notes</h4>
                  <Card className="p-4 bg-muted/50">
                    <p className="text-sm">{selectedOrder.delivery_notes}</p>
                  </Card>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Order Created</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(selectedOrder.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                  {selectedOrder.ready_at && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <Truck className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Out for Delivery</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(selectedOrder.ready_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedOrder.picked_up_at && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Delivered</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(selectedOrder.picked_up_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
            {selectedOrder?.status === 'ready' && (
              <Button 
                onClick={() => updateOrderStatus(selectedOrder.id, 'out_for_delivery')}
                disabled={processing}
              >
                <Truck className="h-4 w-4 mr-1" />
                Mark as Dispatched
              </Button>
            )}
            {selectedOrder?.status === 'out_for_delivery' && (
              <Button 
                onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                disabled={processing}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark as Delivered
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
