import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Edit, Trash2, FlaskConical, Clock } from 'lucide-react';
import { useLabCenter, TestCatalogInput } from '@/hooks/useLabCenter';

interface TestCatalogManagerProps {
  labCenterId: string;
}

const TEST_CATEGORIES = [
  'Blood Tests',
  'Urine Analysis',
  'Pathology',
  'Microbiology',
  'Immunology',
  'Radiology',
  'CT Scan',
  'MRI',
  'Ultrasound',
  'X-Ray',
  'ECG',
  'Other',
];

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
  unit: string;
  result_type: 'number' | 'text';
  default_range: { low?: number | null; high?: number | null; text?: string | null };
  ranges: RangeRule[];
};

function newId() {
  try {
    // modern browsers
    // @ts-ignore
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function toNumberOrNull(v: string): number | null {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function TestCatalogManager({ labCenterId }: TestCatalogManagerProps) {
  const { testCatalog, fetchTestCatalog, addTest, updateTest, deleteTest, loading } = useLabCenter();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(null);

  const [formData, setFormData] = useState<TestCatalogInput>({
    lab_center_id: labCenterId,
    test_code: '',
    name: '',
    category: '',
    subcategory: '',
    description: '',
    sample_type: '',
    preparation_instructions: '',
    turnaround_hours: 24,
    price: 0,
    requires_fasting: false,
    parameters: [],
  });

  useEffect(() => {
    fetchTestCatalog(labCenterId);
  }, [labCenterId, fetchTestCatalog]);

  const filteredTests = useMemo(() => {
    return testCatalog.filter(test => {
      const matchesSearch =
        test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (test.test_code || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || test.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [testCatalog, searchTerm, categoryFilter]);

  const resetForm = () => {
    setFormData({
      lab_center_id: labCenterId,
      test_code: '',
      name: '',
      category: '',
      subcategory: '',
      description: '',
      sample_type: '',
      preparation_instructions: '',
      turnaround_hours: 24,
      price: 0,
      requires_fasting: false,
      parameters: [],
    });
    setEditingTest(null);
  };

  const normalizeParameters = (params: any): ParameterDef[] => {
    const arr = Array.isArray(params) ? params : [];
    return arr
      .filter(Boolean)
      .map((p: any) => ({
        id: typeof p?.id === 'string' && p.id ? p.id : newId(),
        name: String(p?.name || ''),
        unit: String(p?.unit || ''),
        result_type: p?.result_type === 'text' ? 'text' : 'number',
        default_range: {
          low: p?.default_range?.low ?? null,
          high: p?.default_range?.high ?? null,
          text: p?.default_range?.text ?? '',
        },
        ranges: Array.isArray(p?.ranges) ? p.ranges : [],
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure ids exist
    const params = normalizeParameters(formData.parameters);

    const payload: TestCatalogInput = {
      ...formData,
      lab_center_id: labCenterId,
      parameters: params,
    };

    if (editingTest) {
      await updateTest(editingTest.id, payload);
    } else {
      await addTest(payload);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (test: any) => {
    setEditingTest(test);
    setFormData({
      lab_center_id: labCenterId,
      test_code: test.test_code || '',
      name: test.name,
      category: test.category,
      subcategory: test.subcategory || '',
      description: test.description || '',
      sample_type: test.sample_type || '',
      preparation_instructions: test.preparation_instructions || '',
      turnaround_hours: test.turnaround_hours || 24,
      price: test.price || 0,
      requires_fasting: test.requires_fasting || false,
      parameters: normalizeParameters(test.parameters),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this test?')) {
      await deleteTest(id);
    }
  };

  const groupedTests = useMemo(() => {
    return filteredTests.reduce((acc, test) => {
      const category = test.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(test);
      return acc;
    }, {} as Record<string, typeof filteredTests>);
  }, [filteredTests]);

  const parameters = (formData.parameters as any[]) || [];

  const addParameter = () => {
    const next: ParameterDef = {
      id: newId(),
      name: '',
      unit: '',
      result_type: 'number',
      default_range: { low: null, high: null, text: '' },
      ranges: [],
    };
    setFormData(prev => ({ ...prev, parameters: [...(prev.parameters || []), next] }));
  };

  const removeParameter = (pid: string) => {
    setFormData(prev => ({
      ...prev,
      parameters: (prev.parameters || []).filter((p: any) => p.id !== pid),
    }));
  };

  const updateParameter = (pid: string, patch: Partial<ParameterDef>) => {
    setFormData(prev => ({
      ...prev,
      parameters: (prev.parameters || []).map((p: any) => (p.id === pid ? { ...p, ...patch } : p)),
    }));
  };

  const addRule = (pid: string) => {
    const rule: RangeRule = {
      gender: 'any',
      age_min_years: null,
      age_max_years: null,
      low: null,
      high: null,
      text: '',
    };
    setFormData(prev => ({
      ...prev,
      parameters: (prev.parameters || []).map((p: any) =>
        p.id === pid ? { ...p, ranges: [...(p.ranges || []), rule] } : p
      ),
    }));
  };

  const removeRule = (pid: string, idx: number) => {
    setFormData(prev => ({
      ...prev,
      parameters: (prev.parameters || []).map((p: any) => {
        if (p.id !== pid) return p;
        const next = [...(p.ranges || [])];
        next.splice(idx, 1);
        return { ...p, ranges: next };
      }),
    }));
  };

  const updateRule = (pid: string, idx: number, patch: Partial<RangeRule>) => {
    setFormData(prev => ({
      ...prev,
      parameters: (prev.parameters || []).map((p: any) => {
        if (p.id !== pid) return p;
        const next = [...(p.ranges || [])];
        next[idx] = { ...next[idx], ...patch };
        return { ...p, ranges: next };
      }),
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
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
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {TEST_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Test
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTest ? 'Edit Test' : 'Add New Test'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test_code">Test Code *</Label>
                  <Input
                    id="test_code"
                    value={formData.test_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, test_code: e.target.value }))}
                    placeholder="e.g., CBC-001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Test Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Complete Blood Count"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sample_type">Sample Type</Label>
                  <Input
                    id="sample_type"
                    value={formData.sample_type || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, sample_type: e.target.value }))}
                    placeholder="e.g., Blood, Urine"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the test"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preparation">Preparation Instructions</Label>
                <Textarea
                  id="preparation"
                  value={formData.preparation_instructions || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, preparation_instructions: e.target.value }))}
                  placeholder="e.g., Fast for 8-12 hours before test"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="turnaround">Turnaround Time (hours)</Label>
                  <Input
                    id="turnaround"
                    type="number"
                    value={formData.turnaround_hours || 24}
                    onChange={(e) => setFormData(prev => ({ ...prev, turnaround_hours: parseInt(e.target.value) }))}
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price || 0}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                    min={0}
                    step={0.01}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="fasting"
                  checked={!!formData.requires_fasting}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_fasting: checked }))}
                />
                <Label htmlFor="fasting">Requires Fasting</Label>
              </div>

              {/* Parameters */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">Measured Parameters</CardTitle>
                    <Button type="button" size="sm" variant="outline" onClick={addParameter}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Parameter
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {parameters.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Add at least one parameter if this test has measured values (CBC, metabolic panel, etc.).
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {parameters.map((p: ParameterDef, pIdx: number) => (
                        <Card key={p.id} className="border">
                          <CardContent className="pt-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium text-sm">
                                Parameter #{pIdx + 1}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => removeParameter(p.id)}
                              >
                                Remove
                              </Button>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-2 col-span-2">
                                <Label>Parameter Name *</Label>
                                <Input
                                  value={p.name}
                                  onChange={(e) => updateParameter(p.id, { name: e.target.value })}
                                  placeholder="e.g., WBC"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Unit</Label>
                                <Input
                                  value={p.unit}
                                  onChange={(e) => updateParameter(p.id, { unit: e.target.value })}
                                  placeholder="e.g., mg/dL"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <Label>Result Type</Label>
                                <Select
                                  value={p.result_type}
                                  onValueChange={(v) => updateParameter(p.id, { result_type: v as any })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="text">Text</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {p.result_type === 'number' ? (
                                <>
                                  <div className="space-y-2">
                                    <Label>Default Range Low</Label>
                                    <Input
                                      type="number"
                                      value={p.default_range.low ?? ''}
                                      onChange={(e) =>
                                        updateParameter(p.id, {
                                          default_range: { ...p.default_range, low: toNumberOrNull(e.target.value) },
                                        })
                                      }
                                      placeholder="e.g., 3.5"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Default Range High</Label>
                                    <Input
                                      type="number"
                                      value={p.default_range.high ?? ''}
                                      onChange={(e) =>
                                        updateParameter(p.id, {
                                          default_range: { ...p.default_range, high: toNumberOrNull(e.target.value) },
                                        })
                                      }
                                      placeholder="e.g., 10.5"
                                    />
                                  </div>
                                </>
                              ) : (
                                <div className="space-y-2 col-span-2">
                                  <Label>Default Normal Range (text)</Label>
                                  <Input
                                    value={p.default_range.text ?? ''}
                                    onChange={(e) =>
                                      updateParameter(p.id, {
                                        default_range: { ...p.default_range, text: e.target.value },
                                      })
                                    }
                                    placeholder="e.g., Negative / Normal / 0-2 per HPF"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Overrides */}
                            <div className="pt-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-medium text-sm">Age/Gender Overrides</div>
                                <Button type="button" size="sm" variant="outline" onClick={() => addRule(p.id)}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Override
                                </Button>
                              </div>

                              {(p.ranges || []).length === 0 ? (
                                <div className="text-sm text-muted-foreground mt-2">
                                  No overrides. Default range will be used for all ages/genders.
                                </div>
                              ) : (
                                <div className="space-y-3 mt-3">
                                  {(p.ranges || []).map((r: RangeRule, rIdx: number) => (
                                    <div key={rIdx} className="border rounded-md p-3 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium">Override #{rIdx + 1}</div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          className="text-destructive"
                                          onClick={() => removeRule(p.id, rIdx)}
                                        >
                                          Remove
                                        </Button>
                                      </div>

                                      <div className="grid grid-cols-4 gap-3">
                                        <div className="space-y-2">
                                          <Label>Gender</Label>
                                          <Select
                                            value={r.gender}
                                            onValueChange={(v) => updateRule(p.id, rIdx, { gender: v as any })}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder="Gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="any">Any</SelectItem>
                                              <SelectItem value="male">Male</SelectItem>
                                              <SelectItem value="female">Female</SelectItem>
                                              <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        <div className="space-y-2">
                                          <Label>Age Min (years)</Label>
                                          <Input
                                            type="number"
                                            value={r.age_min_years ?? ''}
                                            onChange={(e) => updateRule(p.id, rIdx, { age_min_years: toNumberOrNull(e.target.value) })}
                                            placeholder="e.g., 0"
                                          />
                                        </div>

                                        <div className="space-y-2">
                                          <Label>Age Max (years)</Label>
                                          <Input
                                            type="number"
                                            value={r.age_max_years ?? ''}
                                            onChange={(e) => updateRule(p.id, rIdx, { age_max_years: toNumberOrNull(e.target.value) })}
                                            placeholder="e.g., 12"
                                          />
                                        </div>

                                        {p.result_type === 'number' ? (
                                          <div className="space-y-2">
                                            <Label>Range (low-high)</Label>
                                            <div className="flex gap-2">
                                              <Input
                                                type="number"
                                                value={r.low ?? ''}
                                                onChange={(e) => updateRule(p.id, rIdx, { low: toNumberOrNull(e.target.value) })}
                                                placeholder="low"
                                              />
                                              <Input
                                                type="number"
                                                value={r.high ?? ''}
                                                onChange={(e) => updateRule(p.id, rIdx, { high: toNumberOrNull(e.target.value) })}
                                                placeholder="high"
                                              />
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="space-y-2 col-span-1">
                                            <Label>Text Range</Label>
                                            <Input
                                              value={r.text ?? ''}
                                              onChange={(e) => updateRule(p.id, rIdx, { text: e.target.value })}
                                              placeholder="e.g., Negative"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {editingTest ? 'Update Test' : 'Add Test'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Test List */}
      <ScrollArea className="h-[600px]">
        {Object.keys(groupedTests).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No tests found. Add your first test to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedTests).map(([category, tests]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {tests.map(test => (
                      <div key={test.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{test.name}</span>
                            <Badge variant="outline" className="font-mono text-xs">
                              {test.test_code}
                            </Badge>
                            {test.requires_fasting && <Badge variant="secondary" className="text-xs">Fasting</Badge>}
                            <Badge variant="outline" className="text-xs">
                              {(Array.isArray((test as any).parameters) ? (test as any).parameters.length : 0)} params
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            {test.sample_type && <span>{test.sample_type}</span>}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {test.turnaround_hours}h
                            </span>
                            {test.price ? <span>${test.price}</span> : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(test)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDelete(test.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
