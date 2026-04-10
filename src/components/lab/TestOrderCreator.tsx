import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  FlaskConical, 
  Search, 
  CalendarIcon,
  Plus,
  X,
  TestTube
} from 'lucide-react';
import { useLabCenter } from '@/hooks/useLabCenter';
import { useTestOrders, TestOrderInput } from '@/hooks/useTestOrders';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TestOrderCreatorProps {
  patientId: string;
  doctorId?: string;
  appointmentId?: string;
  onSuccess?: () => void;
}

export function TestOrderCreator({ patientId, doctorId, appointmentId, onSuccess }: TestOrderCreatorProps) {
  const { t } = useTranslation("labAdminDashboard");
  const { labCenters, testCatalog, fetchLabCenters, fetchTestCatalog, loading: catalogLoading } = useLabCenter();
  const { createTestOrder, loading: orderLoading } = useTestOrders();
  
  const [selectedLabId, setSelectedLabId] = useState<string>('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [orderData, setOrderData] = useState<Partial<TestOrderInput>>({
    priority: 'routine',
    clinical_notes: '',
    diagnosis_codes: [],
  });

  useEffect(() => {
    fetchLabCenters();
  }, [fetchLabCenters]);

  useEffect(() => {
    if (selectedLabId) {
      fetchTestCatalog(selectedLabId);
    }
  }, [selectedLabId, fetchTestCatalog]);

  const filteredTests = testCatalog.filter(test => {
    const matchesSearch = 
      test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.test_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || test.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(testCatalog.map(t => t.category))];

  const toggleTest = (testId: string) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedLabId || selectedTests.length === 0) return;

    const order: TestOrderInput = {
      patient_id: patientId,
      doctor_id: doctorId,
      lab_center_id: selectedLabId,
      appointment_id: appointmentId,
      priority: orderData.priority || 'routine',
      clinical_notes: orderData.clinical_notes,
      diagnosis_codes: orderData.diagnosis_codes,
      scheduled_date: scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : undefined,
    };

    const result = await createTestOrder(order, selectedTests);
    if (result && onSuccess) {
      onSuccess();
    }
  };

  const selectedTestDetails = testCatalog.filter(t => selectedTests.includes(t.id));
  const totalPrice = selectedTestDetails.reduce((sum, t) => sum + (t.price || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Lab Selection & Test Search */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Select Lab Center
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedLabId} onValueChange={setSelectedLabId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a lab center" />
              </SelectTrigger>
              <SelectContent>
                {labCenters.map(lab => (
                  <SelectItem key={lab.id} value={lab.id}>
                    <div className="flex items-center gap-2">
                      <span>{lab.name}</span>
                      <span className="text-muted-foreground text-xs">({lab.city})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedLabId && (
          <Card>
            <CardHeader>
              <CardTitle>Available Tests</CardTitle>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {catalogLoading ? (
                  <div className="p-6 text-center">Loading tests...</div>
                ) : filteredTests.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    No tests found
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredTests.map(test => (
                      <div
                        key={test.id}
                        className={cn(
                          "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                          selectedTests.includes(test.id) && "bg-primary/5"
                        )}
                        onClick={() => toggleTest(test.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedTests.includes(test.id)}
                            onCheckedChange={() => toggleTest(test.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{test.name}</span>
                              <Badge variant="outline" className="text-xs font-mono">
                                {test.test_code}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span>{test.category}</span>
                              {test.sample_type && <span>• {test.sample_type}</span>}
                              {test.turnaround_hours && <span>• {test.turnaround_hours}h</span>}
                            </div>
                            {test.requires_fasting && (
                              <Badge variant="secondary" className="mt-2 text-xs">
                                Requires Fasting
                              </Badge>
                            )}
                          </div>
                          {test.price && (
                            <span className="font-medium">${test.price}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Order Summary */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selected Tests */}
            <div>
              <Label className="text-sm text-muted-foreground">Selected Tests ({selectedTests.length})</Label>
              {selectedTestDetails.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-2">No tests selected</p>
              ) : (
                <div className="space-y-2 mt-2">
                  {selectedTestDetails.map(test => (
                    <div key={test.id} className="flex items-center justify-between text-sm">
                      <span>{test.name}</span>
                      <div className="flex items-center gap-2">
                        {test.price && <span className="text-muted-foreground">${test.price}</span>}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleTest(test.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select 
                value={orderData.priority || 'routine'} 
                onValueChange={(value) => setOrderData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scheduled Date */}
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !scheduledDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Clinical Notes */}
            <div className="space-y-2">
              <Label>Clinical Notes</Label>
              <Textarea
                value={orderData.clinical_notes || ''}
                onChange={(e) => setOrderData(prev => ({ ...prev, clinical_notes: e.target.value }))}
                placeholder="Relevant clinical information"
                rows={3}
              />
            </div>

            {/* Total */}
            {totalPrice > 0 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="font-medium">Estimated Total</span>
                <span className="text-lg font-bold">${totalPrice.toFixed(2)}</span>
              </div>
            )}

            <Button 
              className="w-full" 
              onClick={handleSubmit}
              disabled={orderLoading || selectedTests.length === 0 || !selectedLabId}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Create Test Order
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
