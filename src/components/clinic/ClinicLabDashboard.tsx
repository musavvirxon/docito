import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FlaskConical, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Upload,
  RefreshCw,
  Search
} from 'lucide-react';
import { useClinicLabOrders } from '@/hooks/useClinicLabOrders';
import { useFileUpload } from '@/hooks/useFileUpload';
import { format } from 'date-fns';

interface ClinicLabDashboardProps {
  clinicId: string;
}

export function ClinicLabDashboard({ clinicId }: ClinicLabDashboardProps) {
  const { labOrders, fetchLabOrders, updateOrderStatus, uploadResult, loading } = useClinicLabOrders();
  const { uploadFile, uploading } = useFileUpload();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [resultForm, setResultForm] = useState({
    result_text: '',
    reference_range: '',
    is_abnormal: false,
    result_url: '',
  });

  useEffect(() => {
    fetchLabOrders(clinicId);
  }, [clinicId, fetchLabOrders]);

  const filteredOrders = labOrders.filter(order => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.test_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'pending') {
      return matchesSearch && ['pending', 'sample_collected'].includes(order.status);
    } else if (activeTab === 'processing') {
      return matchesSearch && order.status === 'processing';
    } else if (activeTab === 'completed') {
      return matchesSearch && order.status === 'completed';
    }
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500',
      sample_collected: 'bg-blue-500/10 text-blue-500',
      processing: 'bg-purple-500/10 text-purple-500',
      completed: 'bg-green-500/10 text-green-500',
      cancelled: 'bg-red-500/10 text-red-500',
    };
    return styles[status] || styles.pending;
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'stat') return <Badge variant="destructive">STAT</Badge>;
    if (priority === 'urgent') return <Badge variant="outline" className="border-orange-500 text-orange-500">Urgent</Badge>;
    return null;
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    await updateOrderStatus(orderId, newStatus);
    fetchLabOrders(clinicId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file, 'medical-documents');
    if (result) {
      setResultForm(prev => ({ ...prev, result_url: result.url }));
    }
  };

  const handleSubmitResult = async () => {
    if (!selectedOrder) return;
    await uploadResult(selectedOrder.id, resultForm);
    setSelectedOrder(null);
    setResultForm({ result_text: '', reference_range: '', is_abnormal: false, result_url: '' });
    fetchLabOrders(clinicId);
  };

  const stats = {
    pending: labOrders.filter(o => ['pending', 'sample_collected'].includes(o.status)).length,
    processing: labOrders.filter(o => o.status === 'processing').length,
    completed: labOrders.filter(o => o.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <FlaskConical className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.processing}</p>
                <p className="text-sm text-muted-foreground">Processing</p>
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
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Lab Orders</CardTitle>
                <Button variant="outline" size="sm" onClick={() => fetchLabOrders(clinicId)}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <div className="flex gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start px-4">
                  <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
                  <TabsTrigger value="processing">Processing ({stats.processing})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[500px]">
                  <div className="divide-y">
                    {filteredOrders.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground">
                        No orders found
                      </div>
                    ) : (
                      filteredOrders.map(order => (
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
                              </div>
                              <p className="font-medium">{order.test_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.test_type} • {format(new Date(order.created_at), 'MMM d, HH:mm')}
                              </p>
                            </div>
                            <Badge variant="outline" className={getStatusBadge(order.status)}>
                              {order.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Order Details / Result Entry */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedOrder ? 'Order Details' : 'Select Order'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedOrder ? (
              <div className="space-y-4">
                <div>
                  <p className="font-mono font-bold">{selectedOrder.order_number}</p>
                  <p className="text-lg font-medium mt-1">{selectedOrder.test_name}</p>
                  <Badge variant="outline" className={getStatusBadge(selectedOrder.status)}>
                    {selectedOrder.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Test Type</p>
                    <p className="font-medium capitalize">{selectedOrder.test_type}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Priority</p>
                    <p className="font-medium capitalize">{selectedOrder.priority}</p>
                  </div>
                </div>

                {selectedOrder.clinical_notes && (
                  <div>
                    <p className="text-muted-foreground text-sm">Clinical Notes</p>
                    <p className="text-sm bg-muted p-2 rounded mt-1">{selectedOrder.clinical_notes}</p>
                  </div>
                )}

                {/* Actions based on status */}
                {selectedOrder.status === 'pending' && (
                  <Button 
                    className="w-full" 
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'sample_collected')}
                  >
                    Mark Sample Collected
                  </Button>
                )}

                {selectedOrder.status === 'sample_collected' && (
                  <Button 
                    className="w-full" 
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'processing')}
                  >
                    Start Processing
                  </Button>
                )}

                {selectedOrder.status === 'processing' && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">Enter Results</h4>
                    
                    <div className="space-y-2">
                      <Label>Result Value</Label>
                      <Textarea
                        value={resultForm.result_text}
                        onChange={(e) => setResultForm(prev => ({ ...prev, result_text: e.target.value }))}
                        placeholder="Enter test results..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Reference Range</Label>
                      <Input
                        value={resultForm.reference_range}
                        onChange={(e) => setResultForm(prev => ({ ...prev, reference_range: e.target.value }))}
                        placeholder="e.g., 70-100 mg/dL"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Abnormal Result</Label>
                      <Switch
                        checked={resultForm.is_abnormal}
                        onCheckedChange={(checked) => setResultForm(prev => ({ ...prev, is_abnormal: checked }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Upload Report (PDF)</Label>
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={handleSubmitResult}
                      disabled={!resultForm.result_text}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Submit Results
                    </Button>
                  </div>
                )}

                {selectedOrder.status === 'completed' && (
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="font-medium">Results</h4>
                    <div className="bg-muted p-3 rounded-lg text-sm">
                      {selectedOrder.result_text || 'No text results'}
                    </div>
                    {selectedOrder.is_abnormal && (
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <AlertTriangle className="h-3 w-3" />
                        Abnormal
                      </Badge>
                    )}
                    {selectedOrder.result_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedOrder.result_url} target="_blank" rel="noopener noreferrer">
                          View Report PDF
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an order to view details</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
