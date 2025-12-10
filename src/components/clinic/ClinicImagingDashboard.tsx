import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ScanLine, 
  Clock, 
  CheckCircle, 
  Upload,
  RefreshCw,
  Search,
  Image as ImageIcon
} from 'lucide-react';
import { useClinicImagingOrders } from '@/hooks/useClinicImagingOrders';
import { useFileUpload } from '@/hooks/useFileUpload';
import { format } from 'date-fns';

interface ClinicImagingDashboardProps {
  clinicId: string;
}

const MODALITY_ICONS: Record<string, string> = {
  xray: '🩻',
  ct: '🔬',
  mri: '🧲',
  ultrasound: '📡',
  cbct: '🦷',
  panoramic: '📸',
};

export function ClinicImagingDashboard({ clinicId }: ClinicImagingDashboardProps) {
  const { imagingOrders, fetchImagingOrders, updateOrderStatus, uploadResult, loading } = useClinicImagingOrders();
  const { uploadFile, uploading } = useFileUpload();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [resultForm, setResultForm] = useState({
    impression: '',
    findings: '',
    result_report: '',
    result_images: [] as string[],
    result_url: '',
  });

  useEffect(() => {
    fetchImagingOrders(clinicId);
  }, [clinicId, fetchImagingOrders]);

  const filteredOrders = imagingOrders.filter(order => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.exam_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'pending') {
      return matchesSearch && ['pending', 'scheduled'].includes(order.status);
    } else if (activeTab === 'in_progress') {
      return matchesSearch && order.status === 'in_progress';
    } else if (activeTab === 'completed') {
      return matchesSearch && order.status === 'completed';
    }
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500',
      scheduled: 'bg-blue-500/10 text-blue-500',
      in_progress: 'bg-purple-500/10 text-purple-500',
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
    fetchImagingOrders(clinicId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const result = await uploadFile(files[i], 'medical-documents');
      if (result) {
        urls.push(result.url);
      }
    }
    setResultForm(prev => ({ ...prev, result_images: [...prev.result_images, ...urls] }));
  };

  const handleReportUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setResultForm({ impression: '', findings: '', result_report: '', result_images: [], result_url: '' });
    fetchImagingOrders(clinicId);
  };

  const stats = {
    pending: imagingOrders.filter(o => ['pending', 'scheduled'].includes(o.status)).length,
    in_progress: imagingOrders.filter(o => o.status === 'in_progress').length,
    completed: imagingOrders.filter(o => o.status === 'completed').length,
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
                <ScanLine className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.in_progress}</p>
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
                <CardTitle>Imaging Orders</CardTitle>
                <Button variant="outline" size="sm" onClick={() => fetchImagingOrders(clinicId)}>
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
                  <TabsTrigger value="in_progress">In Progress ({stats.in_progress})</TabsTrigger>
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
                                <span className="text-xl">{MODALITY_ICONS[order.modality] || '📷'}</span>
                                <span className="font-mono font-medium">{order.order_number}</span>
                                {getPriorityBadge(order.priority)}
                              </div>
                              <p className="font-medium">{order.exam_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.modality.toUpperCase()} • {order.body_part || 'N/A'} • {format(new Date(order.created_at), 'MMM d, HH:mm')}
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
              <ScrollArea className="h-[550px] pr-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{MODALITY_ICONS[selectedOrder.modality] || '📷'}</span>
                      <p className="font-mono font-bold">{selectedOrder.order_number}</p>
                    </div>
                    <p className="text-lg font-medium mt-1">{selectedOrder.exam_name}</p>
                    <Badge variant="outline" className={getStatusBadge(selectedOrder.status)}>
                      {selectedOrder.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Modality</p>
                      <p className="font-medium uppercase">{selectedOrder.modality}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Body Part</p>
                      <p className="font-medium">{selectedOrder.body_part || 'N/A'}</p>
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
                  {(selectedOrder.status === 'pending' || selectedOrder.status === 'scheduled') && (
                    <Button 
                      className="w-full" 
                      onClick={() => handleStatusUpdate(selectedOrder.id, 'in_progress')}
                    >
                      Start Examination
                    </Button>
                  )}

                  {selectedOrder.status === 'in_progress' && (
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="font-medium">Upload Results</h4>
                      
                      <div className="space-y-2">
                        <Label>Impression</Label>
                        <Textarea
                          value={resultForm.impression}
                          onChange={(e) => setResultForm(prev => ({ ...prev, impression: e.target.value }))}
                          placeholder="Brief diagnostic impression..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Findings</Label>
                        <Textarea
                          value={resultForm.findings}
                          onChange={(e) => setResultForm(prev => ({ ...prev, findings: e.target.value }))}
                          placeholder="Detailed findings..."
                          rows={4}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Upload Images</Label>
                        <Input
                          type="file"
                          accept="image/*,.dcm"
                          multiple
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                        {resultForm.result_images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {resultForm.result_images.map((url, i) => (
                              <div key={i} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                                <ImageIcon className="h-3 w-3" />
                                Image {i + 1}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Upload Report (PDF)</Label>
                        <Input
                          type="file"
                          accept=".pdf"
                          onChange={handleReportUpload}
                          disabled={uploading}
                        />
                      </div>

                      <Button 
                        className="w-full" 
                        onClick={handleSubmitResult}
                        disabled={!resultForm.impression && !resultForm.findings}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Submit Results
                      </Button>
                    </div>
                  )}

                  {selectedOrder.status === 'completed' && (
                    <div className="space-y-3 pt-4 border-t">
                      <h4 className="font-medium">Results</h4>
                      {selectedOrder.impression && (
                        <div>
                          <p className="text-muted-foreground text-sm">Impression</p>
                          <p className="text-sm bg-muted p-2 rounded mt-1">{selectedOrder.impression}</p>
                        </div>
                      )}
                      {selectedOrder.findings && (
                        <div>
                          <p className="text-muted-foreground text-sm">Findings</p>
                          <p className="text-sm bg-muted p-2 rounded mt-1">{selectedOrder.findings}</p>
                        </div>
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
              </ScrollArea>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <ScanLine className="h-12 w-12 mx-auto mb-4 opacity-50" />
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
