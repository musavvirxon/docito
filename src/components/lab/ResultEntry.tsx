import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { useTestOrders, TestResultInput } from '@/hooks/useTestOrders';
import { useFileUpload } from '@/hooks/useFileUpload';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TestOrder = Database['public']['Tables']['test_orders']['Row'];

type ParameterGender = 'any' | 'male' | 'female' | 'other';
type RangeRule = {
  gender: ParameterGender;
  age_min_years?: number | null;
  age_max_years?: number | null;
  low?: number | null;
  high?: number | null;
  text?: string | null;
};
type ParameterDef = {
  id: string;
  name: string;
  unit?: string | null;
  result_type?: 'number' | 'text';
  default_range?: { low?: number | null; high?: number | null; text?: string | null };
  ranges?: RangeRule[];
};
type ParameterResult = {
  id: string;
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  low: number | null;
  high: number | null;
  flag: 'normal' | 'high' | 'low' | 'unknown';
  is_abnormal: boolean;
};

function calcAgeYears(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
  return years;
}

function formatRange(low: number | null, high: number | null, text?: string | null) {
  if (text) return text;
  if (low != null && high != null) return `${low}-${high}`;
  if (low != null && high == null) return `≥ ${low}`;
  if (low == null && high != null) return `≤ ${high}`;
  return '';
}

function scoreRule(rule: RangeRule, gender?: string | null, ageYears?: number | null) {
  let score = 0;

  // gender
  if (rule.gender === 'any') score += 1;
  if (gender) {
    if (rule.gender === gender) score += 3;
    if (rule.gender !== 'any' && rule.gender !== gender) score -= 100;
  }

  // age
  const min = rule.age_min_years ?? null;
  const max = rule.age_max_years ?? null;

  if (ageYears == null) {
    if (min == null && max == null) score += 2;
  } else {
    if (min != null) score += 1;
    if (max != null) score += 1;
    if (min != null && ageYears < min) score -= 100;
    if (max != null && ageYears > max) score -= 100;
    if ((min != null || max != null) && score > 0) score += 1;
  }

  return score;
}

function pickReferenceRange(param: ParameterDef, gender?: string | null, ageYears?: number | null) {
  const rules = Array.isArray(param.ranges) ? param.ranges : [];
  const g = gender ? String(gender).toLowerCase() : null;

  if (!rules.length) {
    const low = param.default_range?.low ?? null;
    const high = param.default_range?.high ?? null;
    const text = param.default_range?.text ?? '';
    return { low, high, display: formatRange(low, high, text) };
  }

  let best: RangeRule | null = null;
  let bestScore = -9999;
  for (const r of rules) {
    const s = scoreRule(r, g as any, ageYears);
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }

  if (!best || bestScore < 0) {
    const low = param.default_range?.low ?? null;
    const high = param.default_range?.high ?? null;
    const text = param.default_range?.text ?? '';
    return { low, high, display: formatRange(low, high, text) };
  }

  const low = best.low ?? null;
  const high = best.high ?? null;
  const display = best.text ? best.text : formatRange(low, high, null);
  return { low, high, display };
}

function evalFlag(valueRaw: string, low: number | null, high: number | null): 'normal' | 'high' | 'low' | 'unknown' {
  const v = Number(String(valueRaw).replace(',', '.').trim());
  if (!Number.isFinite(v)) return 'unknown';
  if (low != null && v < low) return 'low';
  if (high != null && v > high) return 'high';
  return 'normal';
}

interface ResultEntryProps {
  orders: TestOrder[];
  labCenterId: string;
}

export function ResultEntry({ orders }: ResultEntryProps) {
  const { t } = useTranslation("labAdminDashboard");
  const { fetchOrderItems, createResult, uploadResultFile, loading } = useTestOrders();
  const { uploadFile, uploading } = useFileUpload();

  const [selectedOrder, setSelectedOrder] = useState<TestOrder | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const [patientGender, setPatientGender] = useState<string | null>(null);
  const [patientAgeYears, setPatientAgeYears] = useState<number | null>(null);

  const [parameterResults, setParameterResults] = useState<ParameterResult[]>([]);
  const [resultForm, setResultForm] = useState<TestResultInput>({
    test_order_item_id: '',
    result_data: {},
    result_text: '',
    is_abnormal: false,
    abnormal_flag: '',
    interpretation: '',
  });

  useEffect(() => {
    if (selectedOrder) {
      loadPatientContext(selectedOrder.patient_id);
      loadOrderItems(selectedOrder.id);
    } else {
      setOrderItems([]);
      setSelectedItem(null);
      setParameterResults([]);
    }
  }, [selectedOrder]);

  const loadPatientContext = async (patientId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('gender,date_of_birth')
      .eq('user_id', patientId)
      .maybeSingle();

    const g = (data as any)?.gender ?? null;
    const dob = (data as any)?.date_of_birth ?? null;

    setPatientGender(g ? String(g).toLowerCase() : null);
    setPatientAgeYears(calcAgeYears(dob));
  };

  const loadOrderItems = async (orderId: string) => {
    const items = await fetchOrderItems(orderId);
    setOrderItems(items);
    setSelectedItem(null);
    setParameterResults([]);
  };

  const selectedTest = selectedItem?.test || null;

  const normalizeParameters = (params: any): ParameterDef[] => {
    const arr = Array.isArray(params) ? params : [];
    return arr.filter(Boolean).map((p: any) => ({
      id: String(p.id || ''),
      name: String(p.name || ''),
      unit: String(p.unit || ''),
      result_type: p.result_type === 'text' ? 'text' : 'number',
      default_range: p.default_range || { low: null, high: null, text: '' },
      ranges: Array.isArray(p.ranges) ? p.ranges : [],
    }));
  };

  const initResultsForItem = (item: any) => {
    const params = normalizeParameters(item?.test?.parameters);
    const results: ParameterResult[] = params.map((p) => {
      const rr = pickReferenceRange(p, patientGender, patientAgeYears);
      return {
        id: p.id,
        name: p.name,
        value: '',
        unit: p.unit || '',
        reference_range: rr.display || '',
        low: rr.low,
        high: rr.high,
        flag: 'unknown',
        is_abnormal: false,
      };
    });

    setParameterResults(results);
    setResultForm(prev => ({
      ...prev,
      test_order_item_id: item.id,
      result_data: { schema: 'parameters_v1', parameters: results },
      result_text: '',
      is_abnormal: false,
      abnormal_flag: '',
      interpretation: '',
    }));
  };

  const handleItemSelect = (item: any) => {
    setSelectedItem(item);
    initResultsForItem(item);
  };

  const anyAbnormal = useMemo(() => parameterResults.some(p => p.is_abnormal), [parameterResults]);
  const summaryText = useMemo(() => {
    const parts = parameterResults
      .filter(p => p.value && p.value.trim() !== '')
      .map(p => `${p.name}: ${p.value}${p.unit ? ` ${p.unit}` : ''}`);
    return parts.join(', ');
  }, [parameterResults]);

  const updateParamValue = (pid: string, value: string) => {
    setParameterResults(prev => {
      const next = prev.map(p => {
        if (p.id !== pid) return p;
        const flag = evalFlag(value, p.low, p.high);
        const is_abnormal = flag === 'high' || flag === 'low';
        return { ...p, value, flag, is_abnormal };
      });

      // keep result_data in sync
      setResultForm(rf => ({
        ...rf,
        result_data: { schema: 'parameters_v1', parameters: next },
      }));

      return next;
    });
  };

  const handleSubmitResult = async () => {
    if (!selectedItem) return;

    const payload: TestResultInput = {
      test_order_item_id: selectedItem.id,
      result_data: { schema: 'parameters_v1', parameters: parameterResults },
      result_text: summaryText,
      is_abnormal: anyAbnormal,
      abnormal_flag: anyAbnormal ? 'abnormal' : '',
      interpretation: resultForm.interpretation || '',
    };

    await createResult(payload);

    // Reset selection
    setSelectedItem(null);
    setParameterResults([]);
    setResultForm({
      test_order_item_id: '',
      result_data: {},
      result_text: '',
      is_abnormal: false,
      abnormal_flag: '',
      interpretation: '',
    });

    if (selectedOrder) {
      loadOrderItems(selectedOrder.id);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedItem) return;

    const result = await uploadFile(file, 'lab-results');
    if (result) {
      const newResult = await createResult({
        test_order_item_id: selectedItem.id,
        result_text: `File uploaded: ${file.name}`,
        result_data: { schema: 'file_only_v1', file: { name: file.name, path: result.path } },
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
              <div className="p-6 text-center text-muted-foreground">No orders in progress</div>
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
              <div className="p-6 text-center text-muted-foreground">Select an order to view tests</div>
            ) : orderItems.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No tests in this order</div>
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
                        <div className="flex flex-col">
                          <span className="font-medium">{item.test?.name || `Test #${String(item.test_id).substring(0, 8)}`}</span>
                          <span className="text-xs text-muted-foreground">{item.test?.test_code || ''}</span>
                        </div>
                      </div>
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                    {item.notes && <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>}
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
                <div className="space-y-1">
                  <div className="font-medium">
                    {selectedTest?.name || 'Selected Test'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Patient context: {patientGender || 'unknown gender'}, {patientAgeYears != null ? `${patientAgeYears}y` : 'unknown age'}
                  </div>
                </div>

                {parameterResults.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    This test has no parameters in catalog. Add parameters in the Test Catalog to enable per-parameter result entry.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {parameterResults.map((p) => (
                      <div key={p.id} className="border rounded-md p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{p.name}</div>
                          <Badge variant="outline">
                            {p.flag === 'unknown' ? '—' : p.flag}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mt-3">
                          <div className="space-y-2 col-span-1">
                            <Label>Result</Label>
                            <Input
                              value={p.value}
                              onChange={(e) => updateParamValue(p.id, e.target.value)}
                              placeholder="Enter value"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Unit</Label>
                            <Input value={p.unit} readOnly />
                          </div>

                          <div className="space-y-2">
                            <Label>Normal Range</Label>
                            <Input value={p.reference_range} readOnly />
                          </div>
                        </div>

                        {p.is_abnormal && (
                          <div className="text-sm mt-2 text-destructive">
                            Abnormal ({p.flag})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="interpretation">Interpretation / Notes</Label>
                  <Textarea
                    id="interpretation"
                    value={resultForm.interpretation || ''}
                    onChange={(e) => setResultForm(prev => ({ ...prev, interpretation: e.target.value }))}
                    placeholder="Clinical interpretation / notes"
                    rows={3}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleSubmitResult}
                  disabled={loading || parameterResults.length === 0}
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
