import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useTestOrders, TestResultInput } from '@/hooks/useTestOrders';
import { useFileUpload } from '@/hooks/useFileUpload';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type TestOrder = Database['public']['Tables']['test_orders']['Row'];
type TestOrderItem = Database['public']['Tables']['test_order_items']['Row'];

interface ResultEntryProps {
  orders: TestOrder[];
  labCenterId: string;
}

export function ResultEntry({ orders, labCenterId }: ResultEntryProps) {
  const { 
    fetchOrderItems, 
    createResult, 
    verifyResult,
    uploadResultFile,
    loading 
  } = useTestOrders();
  const { uploadFile, uploading } = useFileUpload();
  
  const [selectedOrder, setSelectedOrder] = useState<TestOrder | null>(null);
  const [orderItems, setOrderItems] = useState<TestOrderItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<TestOrderItem | null>(null);
  const [resultForm, setResultForm] = useState<TestResultInput>({
    test_order_item_id: '',
    result_data: {},
    result_text: '',
    reference_range: '',
    unit: '',
    is_abnormal: false,
    abnormal_flag: '',
    interpretation: '',
  });

  useEffect(() => {
    if (selectedOrder) {
      loadOrderItems(selectedOrder.id);
    }
  }, [selectedOrder]);

  const loadOrderItems = async (orderId: string) => {
    const items = await fetchOrderItems(orderId);
    setOrderItems(items);
    setSelectedItem(null);
  };

  const handleItemSelect = (item: TestOrderItem) => {
    setSelectedItem(item);
    setResultForm(prev => ({
      ...prev,
      test_order_item_id: item.id,
    }));
  };

  const handleSubmitResult = async () => {
    if (!selectedItem) return;
    await createResult(resultForm);
    // Reset form
    setResultForm({
      test_order_item_id: '',
      result_data: {},
      result_text: '',
      reference_range: '',
      unit: '',
      is_abnormal: false,
      abnormal_flag: '',
      interpretation: '',
    });
    setSelectedItem(null);
    if (selectedOrder) {
      loadOrderItems(selectedOrder.id);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedItem) return;

    const result = await uploadFile(file, 'lab-results');
    if (result) {
      // First create a result if doesn't exist, then attach file
      // For simplicity, we'll create a basic result with the file
      const newResult = await createResult({
        test_order_item_id: selectedItem.id,
        result_text: `File uploaded: ${file.name}`,
      });
      
      if (newResult) {
        await uploadResultFile({
          test_result_id: newResult.id,
          file_name: file.name,
          file_path: result.path,
          file_type: file.type,
          file_size: file.size,
          file_category: 'report',
        });
      }
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Orders List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Orders In Progress</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {orders.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No orders in progress
              </div>
            ) : (
              <div className="divide-y">
                {orders.map(order => (
                  <div
                    key={order.id}
                    className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedOrder?.id === order.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono font-medium">{order.order_number}</span>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), 'MMM d, HH:mm')}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Test Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {selectedOrder ? `Tests - ${selectedOrder.order_number}` : 'Select an Order'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {!selectedOrder ? (
              <div className="p-6 text-center text-muted-foreground">
                Select an order to view tests
              </div>
            ) : orderItems.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No tests in this order
              </div>
            ) : (
              <div className="divide-y">
                {orderItems.map(item => (
                  <div
                    key={item.id}
                    className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedItem?.id === item.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => handleItemSelect(item)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className="font-medium">Test #{item.test_id.substring(0, 8)}</span>
                      </div>
                      <Badge variant="outline">
                        {item.status}
                      </Badge>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Result Entry Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Enter Results</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedItem ? (
            <div className="h-[450px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a test to enter results</p>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="manual">
              <TabsList className="w-full">
                <TabsTrigger value="manual" className="flex-1">Manual Entry</TabsTrigger>
                <TabsTrigger value="upload" className="flex-1">Upload File</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="result_text">Result Value</Label>
                  <Input
                    id="result_text"
                    value={resultForm.result_text || ''}
                    onChange={(e) => setResultForm(prev => ({ ...prev, result_text: e.target.value }))}
                    placeholder="Enter result value"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={resultForm.unit || ''}
                      onChange={(e) => setResultForm(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="e.g., mg/dL"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference">Reference Range</Label>
                    <Input
                      id="reference"
                      value={resultForm.reference_range || ''}
                      onChange={(e) => setResultForm(prev => ({ ...prev, reference_range: e.target.value }))}
                      placeholder="e.g., 70-100"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="abnormal">Abnormal Result</Label>
                  <Switch
                    id="abnormal"
                    checked={resultForm.is_abnormal}
                    onCheckedChange={(checked) => setResultForm(prev => ({ ...prev, is_abnormal: checked }))}
                  />
                </div>

                {resultForm.is_abnormal && (
                  <div className="space-y-2">
                    <Label htmlFor="flag">Abnormal Flag</Label>
                    <Select
                      value={resultForm.abnormal_flag || ''}
                      onValueChange={(value) => setResultForm(prev => ({ ...prev, abnormal_flag: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select flag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="critical_high">Critical High</SelectItem>
                        <SelectItem value="critical_low">Critical Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="interpretation">Interpretation</Label>
                  <Textarea
                    id="interpretation"
                    value={resultForm.interpretation || ''}
                    onChange={(e) => setResultForm(prev => ({ ...prev, interpretation: e.target.value }))}
                    placeholder="Clinical interpretation of results"
                    rows={3}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSubmitResult}
                  disabled={loading || !resultForm.result_text}
                >
                  Save Result
                </Button>
              </TabsContent>

              <TabsContent value="upload" className="mt-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload lab report, images, or scan results
                  </p>
                  <Input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.dicom"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="max-w-xs mx-auto"
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
