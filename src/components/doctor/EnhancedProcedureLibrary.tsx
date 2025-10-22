import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Plus, Edit, Trash2, Clock, DollarSign, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function EnhancedProcedureLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customFormData, setCustomFormData] = useState({
    name: '',
    description: '',
    category: 'Consultation',
    duration_minutes: 30,
    price: 0,
    is_bookable: true
  });

  // Fetch doctor's procedures
  const { data: myProcedures, isLoading: loadingMine } = useQuery({
    queryKey: ['my-procedures', user?.id],
    queryFn: async () => {
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      if (!doctorData) return [];
      
      const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('dentist_id', doctorData.id)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch procedure templates
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['procedure-templates', search, category],
    queryFn: async () => {
      let query = supabase
        .from('procedure_templates')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }
      
      if (category !== 'all') {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  // Add procedure from template
  const addFromTemplate = useMutation({
    mutationFn: async (template: any) => {
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      const { data, error } = await supabase
        .from('procedures')
        .insert({
          dentist_id: doctorData.id,
          name: template.name,
          description: template.description,
          category: template.category,
          duration_minutes: template.duration_minutes,
          price: template.default_price,
          is_bookable: true,
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-procedures'] });
      toast.success('Procedure added to your services');
    }
  });

  // Add custom procedure
  const addCustomProcedure = useMutation({
    mutationFn: async (newProcedure: any) => {
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      const { data, error } = await supabase
        .from('procedures')
        .insert({
          ...newProcedure,
          dentist_id: doctorData.id,
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-procedures'] });
      toast.success('Custom procedure created');
      setIsAddingCustom(false);
      setCustomFormData({
        name: '',
        description: '',
        category: 'Consultation',
        duration_minutes: 30,
        price: 0,
        is_bookable: true
      });
    }
  });

  // Delete procedure
  const deleteProcedure = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('procedures')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-procedures'] });
      toast.success('Procedure deleted');
    }
  });

  // Toggle bookable
  const toggleBookable = useMutation({
    mutationFn: async ({ id, is_bookable }: { id: string; is_bookable: boolean }) => {
      const { error } = await supabase
        .from('procedures')
        .update({ is_bookable })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-procedures'] });
    }
  });

  const categories = ['all', 'Preventive', 'Restorative', 'Cosmetic', 'Surgical', 'Consultation', 'Assessment', 'Emergency'];

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in to access the procedure library.</p>
          <Button onClick={() => navigate('/signup')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/doctor-dashboard')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Procedure Library</h1>
            <p className="text-muted-foreground mt-2">
              Manage your procedures and add from templates
            </p>
          </div>
        </div>
        <Button onClick={() => setIsAddingCustom(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Create Custom
        </Button>
      </div>

      {/* My Procedures Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">
          My Procedures ({myProcedures?.length || 0})
        </h2>
        
        {loadingMine ? (
          <div className="text-center py-8">Loading...</div>
        ) : myProcedures && myProcedures.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {myProcedures.map((procedure: any) => (
              <Card key={procedure.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-2">{procedure.name}</h3>
                      <Badge variant={procedure.is_bookable ? 'default' : 'secondary'}>
                        {procedure.is_bookable ? 'Bookable' : 'Not Bookable'}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBookable.mutate({ id: procedure.id, is_bookable: !procedure.is_bookable })}
                    >
                      Toggle
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {procedure.description}
                  </p>

                  <div className="flex items-center gap-6 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{procedure.duration_minutes} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">${procedure.price}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this procedure?')) {
                          deleteProcedure.mutate(procedure.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                No procedures yet. Add from templates or create custom ones.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Template Library Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Browse Templates</h2>
        
        {/* Search & Filters */}
        <div className="mb-6 grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search procedures..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12"
            />
          </div>
          
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Templates Grid */}
        {loadingTemplates ? (
          <div className="text-center py-12">Loading templates...</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {templates?.map((template: any) => {
              const isAdded = myProcedures?.some((p: any) => p.name === template.name);
              return (
                <Card key={template.id}>
                  <CardContent className="p-6">
                    <div className="mb-3">
                      <h3 className="text-lg font-bold mb-2">{template.name}</h3>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {template.description}
                    </p>

                    <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />{template.duration_minutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />${template.default_price}
                      </span>
                    </div>

                    <Button
                      onClick={() => addFromTemplate.mutate(template)}
                      disabled={isAdded}
                      className="w-full"
                      variant={isAdded ? 'secondary' : 'default'}
                    >
                      {isAdded ? 'Already Added' : '+ Add to My Procedures'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Custom Procedure Modal */}
      <Dialog open={isAddingCustom} onOpenChange={setIsAddingCustom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Procedure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Procedure Name *</Label>
              <Input
                required
                value={customFormData.name}
                onChange={(e) => setCustomFormData({ ...customFormData, name: e.target.value })}
                placeholder="e.g., Custom Consultation"
              />
            </div>

            <div>
              <Label>Description *</Label>
              <Textarea
                required
                value={customFormData.description}
                onChange={(e) => setCustomFormData({ ...customFormData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select 
                  value={customFormData.category}
                  onValueChange={(value) => setCustomFormData({ ...customFormData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c !== 'all').map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  required
                  min="5"
                  step="5"
                  value={customFormData.duration_minutes}
                  onChange={(e) => setCustomFormData({ ...customFormData, duration_minutes: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Price ($)</Label>
              <Input
                type="number"
                required
                min="0"
                step="0.01"
                value={customFormData.price}
                onChange={(e) => setCustomFormData({ ...customFormData, price: parseFloat(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingCustom(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (customFormData.name && customFormData.description) {
                  addCustomProcedure.mutate(customFormData);
                } else {
                  toast.error('Please fill in all required fields');
                }
              }}
            >
              Create Procedure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}