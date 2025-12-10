import { useState } from 'react';
import { usePrescriptions, FulfillmentOrder } from '@/hooks/usePrescriptions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Search, Clock, CheckCircle, Package, Truck, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  pharmacyId: string;
}

export default function FulfillmentQueue({ pharmacyId }: Props) {
  const { fulfillmentOrders, loading, processFulfillment } = usePrescriptions({ pharmacyId });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const filteredOrders = fulfillmentOrders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'destructive',
      processing: 'secondary',
      ready: 'default',
      completed: 'outline',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'urgent') return <Badge variant="destructive">Urgent</Badge>;
    if (priority === 'high') return <Badge variant="secondary">High</Badge>;
    return null;
  };

  const handleAction = async (orderId: string, action: string) => {
    setProcessing(true);
    try {
      await processFulfillment(orderId, action);
      setIsDetailsOpen(false);
      setSelectedOrder(null);
    } finally {
      setProcessing(false);
    }
  };

  const viewDetails = (order: FulfillmentOrder) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Fulfillment Queue
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="destructive">{fulfillmentOrders.filter(o => o.status === 'pending').length} Pending</Badge>
              <Badge variant="secondary">{fulfillmentOrders.filter(o => o.status === 'processing').length} Processing</Badge>
              <Badge variant="default">{fulfillmentOrders.filter(o => o.status === 'ready').length} Ready</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Search by order number..."
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
                <SelectItem value="ready">Ready for Pickup</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
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
                  <TableHead>Priority</TableHead>
                  <TableHead>Pickup Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No orders in the queue
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {order.pickup_method === 'delivery' ? (
                            <><Truck className="h-4 w-4" /> Delivery</>
                          ) : (
                            <><Package className="h-4 w-4" /> Pickup</>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        ${order.total_amount?.toFixed(2) || '0.00'}
                        {order.copay_amount && order.copay_amount > 0 && (
                          <span className="text-sm text-muted-foreground block">
                            Copay: ${order.copay_amount.toFixed(2)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.estimated_ready_at ? format(new Date(order.estimated_ready_at), 'MMM d, h:mm a') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => viewDetails(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status === 'pending' && (
                            <Button size="sm" onClick={() => handleAction(order.id, 'start_processing')}>
                              <Clock className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          )}
                          {order.status === 'processing' && (
                            <Button size="sm" onClick={() => handleAction(order.id, 'ready_for_pickup')}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Ready
                            </Button>
                          )}
                          {order.status === 'ready' && (
                            <Button size="sm" onClick={() => handleAction(order.id, 'complete')}>
                              Complete
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

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.order_number}</DialogTitle>
            <DialogDescription>
              View prescription and fulfillment details
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{getStatusBadge(selectedOrder.status)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <p className="font-medium">{selectedOrder.priority}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pickup Method</p>
                  <p className="font-medium">{selectedOrder.pickup_method}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Status</p>
                  <p className="font-medium">{selectedOrder.payment_status}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Pricing</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span>${selectedOrder.total_amount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Insurance</span>
                    <span>-${selectedOrder.insurance_amount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Copay Due</span>
                    <span>${selectedOrder.copay_amount?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>

              {selectedOrder.prescription && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Prescription Items</h4>
                  <ul className="space-y-2">
                    {selectedOrder.prescription.items?.map((item, idx) => (
                      <li key={idx} className="flex justify-between p-2 bg-muted/50 rounded">
                        <div>
                          <p className="font-medium">{item.medication_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.dosage} - {item.frequency}
                          </p>
                        </div>
                        <div className="text-right">
                          <p>Qty: {item.quantity} {item.unit}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
            {selectedOrder?.status === 'pending' && (
              <Button onClick={() => handleAction(selectedOrder.id, 'start_processing')} disabled={processing}>
                Start Processing
              </Button>
            )}
            {selectedOrder?.status === 'processing' && (
              <Button onClick={() => handleAction(selectedOrder.id, 'ready_for_pickup')} disabled={processing}>
                Mark Ready
              </Button>
            )}
            {selectedOrder?.status === 'ready' && (
              <Button onClick={() => handleAction(selectedOrder.id, 'complete')} disabled={processing}>
                Complete Order
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
