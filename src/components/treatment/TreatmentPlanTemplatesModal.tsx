import { useState, useEffect } from "react";
import { Plus, Save, Trash2, Copy, Search, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TreatmentPlanTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  is_public: boolean;
  template_data: any;
  created_at: string;
}

interface TreatmentPlanTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyTemplate?: (templateData: any) => void;
  currentTreatmentPlan?: any; // For saving current plan as template
}

const TreatmentPlanTemplatesModal = ({ 
  open, 
  onOpenChange,
  onApplyTemplate,
  currentTreatmentPlan
}: TreatmentPlanTemplatesModalProps) => {
  const [templates, setTemplates] = useState<TreatmentPlanTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"browse" | "create">("browse");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Form state for creating template
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "general",
    is_public: false,
  });

  const categories = [
    "general",
    "preventive",
    "restorative", 
    "cosmetic",
    "orthodontic",
    "oral_surgery",
    "endodontic",
    "periodontic"
  ];

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get doctor ID
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!doctorData) return;

      // Fetch user's templates and public templates
      const { data, error } = await supabase
        .from("treatment_plan_templates")
        .select("*")
        .or(`doctor_id.eq.${doctorData.id},is_public.eq.true`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error("Failed to load templates: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!currentTreatmentPlan) {
      toast.error("No treatment plan data available to save");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: doctorData } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!doctorData) return;

      // Fetch procedures from current treatment plan
      const { data: procedures } = await supabase
        .from("treatment_plan_procedures")
        .select(`
          *,
          procedure:procedures(*)
        `)
        .eq("treatment_plan_id", currentTreatmentPlan.id);

      // Fetch medications from current treatment plan  
      const { data: medications } = await supabase
        .from("medications")
        .select("*")
        .eq("treatment_plan_id", currentTreatmentPlan.id);

      const templateData = {
        title: currentTreatmentPlan.title,
        description: currentTreatmentPlan.description,
        procedures: procedures || [],
        medications: medications || [],
        estimated_duration_weeks: currentTreatmentPlan.estimated_duration_weeks,
        priority: currentTreatmentPlan.priority
      };

      const { error } = await supabase
        .from("treatment_plan_templates")
        .insert([{
          doctor_id: doctorData.id,
          name: formData.name,
          description: formData.description,
          category: formData.category,
          is_public: formData.is_public,
          template_data: templateData
        }]);

      if (error) throw error;

      toast.success("Template saved successfully");
      setFormData({ name: "", description: "", category: "general", is_public: false });
      setActiveTab("browse");
      fetchTemplates();
    } catch (error: any) {
      toast.error("Failed to save template: " + error.message);
    }
  };

  const handleApplyTemplate = (template: TreatmentPlanTemplate) => {
    if (onApplyTemplate) {
      onApplyTemplate(template.template_data);
      toast.success(`Applied template: ${template.name}`);
      onOpenChange(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await supabase
        .from("treatment_plan_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
      
      toast.success("Template deleted successfully");
      fetchTemplates();
    } catch (error: any) {
      toast.error("Failed to delete template: " + error.message);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Treatment Plan Templates</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex gap-2">
            <Button 
              variant={activeTab === "browse" ? "default" : "outline"}
              onClick={() => setActiveTab("browse")}
            >
              Browse Templates
            </Button>
            {currentTreatmentPlan && (
              <Button 
                variant={activeTab === "create" ? "default" : "outline"}
                onClick={() => setActiveTab("create")}
              >
                Save as Template
              </Button>
            )}
          </div>

          {/* Browse Templates Tab */}
          {activeTab === "browse" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Templates Grid */}
              {loading ? (
                <div className="text-center py-8">Loading templates...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || categoryFilter !== "all" 
                      ? "No templates match your search criteria" 
                      : "No templates available"}
                  </p>
                  {currentTreatmentPlan && (
                    <Button onClick={() => setActiveTab("create")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Template
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">
                                {template.category.charAt(0).toUpperCase() + template.category.slice(1).replace('_', ' ')}
                              </Badge>
                              {template.is_public && (
                                <Badge variant="secondary">Public</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {template.description || "No description available"}
                        </p>
                        
                        {/* Template Stats */}
                        <div className="text-xs text-muted-foreground mb-4">
                          <div>Procedures: {template.template_data?.procedures?.length || 0}</div>
                          <div>Medications: {template.template_data?.medications?.length || 0}</div>
                          {template.template_data?.estimated_duration_weeks && (
                            <div>Duration: {template.template_data.estimated_duration_weeks} weeks</div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApplyTemplate(template)}
                            className="flex-1"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Apply
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save as Template Tab */}
          {activeTab === "create" && (
            <Card>
              <CardHeader>
                <CardTitle>Save Current Treatment Plan as Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Template Name*</Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., Comprehensive Dental Restoration"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="template-description">Description</Label>
                  <Textarea
                    id="template-description"
                    placeholder="Describe this treatment template..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template-category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is-public"
                        checked={formData.is_public}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                      />
                      <Label htmlFor="is-public">Make template public</Label>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setActiveTab("browse")}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveAsTemplate}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TreatmentPlanTemplatesModal;