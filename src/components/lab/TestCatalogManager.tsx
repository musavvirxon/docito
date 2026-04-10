import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Edit, Trash2, FlaskConical, Clock, Settings2 } from 'lucide-react';
import { useLabCenter, TestCatalogInput } from '@/hooks/useLabCenter';
import { TestParameterEditor, ParameterDef } from './TestParameterEditor';

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

interface FormDataWithParams extends TestCatalogInput {
  parameters?: ParameterDef[];
}

export function TestCatalogManager({ labCenterId }: TestCatalogManagerProps) {
  const { testCatalog, fetchTestCatalog, upsertTestCatalog, loading } = useLabCenter();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('basic');

  const [formData, setFormData] = useState<FormDataWithParams>({
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

  // IMPORTANT: keep lab_center_id always synced
  useEffect(() => {
    setFormData((prev) => ({ ...prev, lab_center_id: labCenterId }));
  }, [labCenterId]);

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
    setActiveTab('basic');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // HARD FIX: force lab_center_id on save
    const payload: FormDataWithParams = { ...formData, lab_center_id: labCenterId };

    if (editingTest) {
      await upsertTestCatalog({ ...payload, id: editingTest.id } as any);
    } else {
      await upsertTestCatalog(payload as any);
    }

    setIsDialogOpen(false);
    resetForm();
    fetchTestCatalog(labCenterId);
  };

  const handleEdit = (test: any) => {
    setEditingTest(test);
    setFormData({
      lab_center_id: labCenterId, // HARD FIX
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
      parameters: Array.isArray(test.parameters) ? test.parameters : [],
    });
    setActiveTab('basic');
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this test?')) {
      // Since deleteTest doesn't exist, use supabase directly
      await (supabase as any).from('test_catalog').delete().eq('id', id);
      fetchTestCatalog(labCenterId);
    }
  };

  const filteredTests = testCatalog.filter((test) => {
    const matchesSearch =
      test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (test.test_code || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || test.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedTests = filteredTests.reduce((acc, test) => {
    const category = test.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(test);
    return acc;
  }, {} as Record<string, typeof filteredTests>);

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
              {TEST_CATEGORIES.map((cat) => (
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

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTest ? 'Edit Test' : 'Add New Test'}</DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="parameters">
                  <Settings2 className="h-4 w-4 mr-1" />
                  Parameters ({formData.parameters?.length || 0})
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <TabsContent value="basic" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="test_code">Test Code *</Label>
                      <Input
                        id="test_code"
                        value={formData.test_code}
                        onChange={(e) => setFormData((prev) => ({ ...prev, test_code: e.target.value }))}
                        placeholder="e.g., CBC-001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Test Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
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
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {TEST_CATEGORIES.map((cat) => (
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
                        onChange={(e) => setFormData((prev) => ({ ...prev, sample_type: e.target.value }))}
                        placeholder="e.g., Blood, Urine"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the test"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preparation">Preparation Instructions</Label>
                    <Textarea
                      id="preparation"
                      value={formData.preparation_instructions || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, preparation_instructions: e.target.value }))
                      }
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
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, turnaround_hours: parseInt(e.target.value) }))
                        }
                        min={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price || 0}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, price: parseFloat(e.target.value) }))
                        }
                        min={0}
                        step={0.01}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="fasting"
                      checked={!!formData.requires_fasting}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, requires_fasting: checked }))}
                    />
                    <Label htmlFor="fasting">Requires Fasting</Label>
                  </div>
                </TabsContent>

                <TabsContent value="parameters" className="mt-0">
                  <TestParameterEditor
                    parameters={formData.parameters || []}
                    onChange={(params) => setFormData((prev) => ({ ...prev, parameters: params }))}
                  />
                </TabsContent>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {editingTest ? 'Update Test' : 'Add Test'}
                  </Button>
                </div>
              </form>
            </Tabs>
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
                    {tests.map((test: any) => (
                      <div key={test.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{test.name}</span>
                            <Badge variant="outline" className="font-mono text-xs">
                              {test.test_code}
                            </Badge>
                            {test.requires_fasting && (
                              <Badge variant="secondary" className="text-xs">
                                Fasting
                              </Badge>
                            )}
                            {Array.isArray(test.parameters) && test.parameters.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Settings2 className="h-3 w-3 mr-1" />
                                {test.parameters.length} param{test.parameters.length > 1 ? 's' : ''}
                              </Badge>
                            )}
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
