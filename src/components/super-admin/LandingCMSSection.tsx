import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Save, Trash2, GripVertical, Eye, EyeOff, ExternalLink, Loader2
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';

interface LandingSection {
  id: string;
  section_key: string;
  title: string;
  subtitle: string;
  content: any;
  image_url: string;
  cta_text: string;
  cta_link: string;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export default function LandingCMSSection() {
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<LandingSection | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  const [newSection, setNewSection] = useState({
    section_key: '',
    title: '',
    subtitle: '',
    content: '{}',
    image_url: '',
    cta_text: '',
    cta_link: '',
    display_order: 0,
    is_visible: true,
  });

  const loadSections = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('landing_sections')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      setSections(data || []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadSections(); }, [loadSections]);

  const handleSave = async (section: LandingSection) => {
    setSaving(section.id);
    try {
      const { error } = await (supabase as any)
        .from('landing_sections')
        .update({
          title: section.title,
          subtitle: section.subtitle,
          content: typeof section.content === 'string' ? JSON.parse(section.content) : section.content,
          image_url: section.image_url,
          cta_text: section.cta_text,
          cta_link: section.cta_link,
          display_order: section.display_order,
          is_visible: section.is_visible,
          updated_at: new Date().toISOString(),
        })
        .eq('id', section.id);
      if (error) throw error;
      toast({ title: 'Saved', description: `Section "${section.section_key}" updated.` });
      loadSections();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSaving(null);
    }
  };

  const handleAdd = async () => {
    try {
      let contentObj = {};
      try { contentObj = JSON.parse(newSection.content); } catch {}
      const { error } = await (supabase as any)
        .from('landing_sections')
        .insert({ ...newSection, content: contentObj });
      if (error) throw error;
      toast({ title: 'Added', description: 'New section created.' });
      setShowAddDialog(false);
      setNewSection({ section_key: '', title: '', subtitle: '', content: '{}', image_url: '', cta_text: '', cta_link: '', display_order: 0, is_visible: true });
      loadSections();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this section?')) return;
    try {
      const { error } = await (supabase as any).from('landing_sections').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted' });
      loadSections();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const toggleVisibility = async (section: LandingSection) => {
    try {
      const { error } = await (supabase as any)
        .from('landing_sections')
        .update({ is_visible: !section.is_visible, updated_at: new Date().toISOString() })
        .eq('id', section.id);
      if (error) throw error;
      loadSections();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const updateEditField = (field: string, value: any) => {
    if (!editingSection) return;
    setEditingSection({ ...editingSection, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Landing Page CMS</h1>
          <p className="text-sm text-muted-foreground">Manage landing page sections, content, and visibility</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open('/landing', '_blank')} className="gap-2">
            <ExternalLink className="h-4 w-4" /> Preview
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Section
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sections.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No landing sections yet. Create your first one!</p>
          <Button onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4 mr-2" /> Add Section</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => (
            <Card key={section.id} className={`${!section.is_visible ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{section.title || section.section_key}</h3>
                        <Badge variant="outline" className="text-[10px]">{section.section_key}</Badge>
                        <Badge variant={section.is_visible ? 'default' : 'secondary'} className="text-[10px]">
                          {section.is_visible ? 'Visible' : 'Hidden'}
                        </Badge>
                      </div>
                      {section.subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">{section.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleVisibility(section)}>
                      {section.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingSection({ ...section })}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(section.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Section: {editingSection?.section_key}</DialogTitle>
            <DialogDescription>Update section content and settings</DialogDescription>
          </DialogHeader>
          {editingSection && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input value={editingSection.title} onChange={(e) => updateEditField('title', e.target.value)} />
              </div>
              <div>
                <Label>Subtitle</Label>
                <Input value={editingSection.subtitle} onChange={(e) => updateEditField('subtitle', e.target.value)} />
              </div>
              <div>
                <Label>Content (JSON)</Label>
                <Textarea
                  value={typeof editingSection.content === 'string' ? editingSection.content : JSON.stringify(editingSection.content, null, 2)}
                  onChange={(e) => updateEditField('content', e.target.value)}
                  rows={5}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input value={editingSection.image_url} onChange={(e) => updateEditField('image_url', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CTA Text</Label>
                  <Input value={editingSection.cta_text} onChange={(e) => updateEditField('cta_text', e.target.value)} />
                </div>
                <div>
                  <Label>CTA Link</Label>
                  <Input value={editingSection.cta_link} onChange={(e) => updateEditField('cta_link', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Display Order</Label>
                  <Input type="number" value={editingSection.display_order} onChange={(e) => updateEditField('display_order', Number(e.target.value))} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={editingSection.is_visible} onCheckedChange={(v) => updateEditField('is_visible', v)} />
                  <Label>Visible</Label>
                </div>
              </div>
              <Button onClick={() => handleSave(editingSection)} disabled={saving === editingSection.id} className="w-full">
                {saving === editingSection.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Section</DialogTitle>
            <DialogDescription>Create a new landing page section</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Section Key (unique identifier)</Label>
              <Input value={newSection.section_key} onChange={(e) => setNewSection({ ...newSection, section_key: e.target.value })} placeholder="e.g. hero, features, testimonials" />
            </div>
            <div>
              <Label>Title</Label>
              <Input value={newSection.title} onChange={(e) => setNewSection({ ...newSection, title: e.target.value })} />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input value={newSection.subtitle} onChange={(e) => setNewSection({ ...newSection, subtitle: e.target.value })} />
            </div>
            <div>
              <Label>CTA Text</Label>
              <Input value={newSection.cta_text} onChange={(e) => setNewSection({ ...newSection, cta_text: e.target.value })} />
            </div>
            <div>
              <Label>CTA Link</Label>
              <Input value={newSection.cta_link} onChange={(e) => setNewSection({ ...newSection, cta_link: e.target.value })} />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input type="number" value={newSection.display_order} onChange={(e) => setNewSection({ ...newSection, display_order: Number(e.target.value) })} />
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={!newSection.section_key}>
              <Plus className="h-4 w-4 mr-2" /> Create Section
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
