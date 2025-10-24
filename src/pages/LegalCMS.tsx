import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, Plus, Trash2 } from 'lucide-react';

interface LegalPage {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  is_published: boolean;
}

interface AboutSection {
  id: string;
  section_key: string;
  title: string;
  content: string;
  order_index: number;
  is_published: boolean;
}

export default function LegalCMS() {
  const { profile, user } = useAuth();
  const [legalPages, setLegalPages] = useState<LegalPage[]>([]);
  const [aboutSections, setAboutSections] = useState<AboutSection[]>([]);
  const [selectedPage, setSelectedPage] = useState<LegalPage | null>(null);
  const [selectedSection, setSelectedSection] = useState<AboutSection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    checkSuperAdminAccess();
  }, [user]);

  const checkSuperAdminAccess = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .single();

      const hasAccess = !!data;
      setIsSuperAdmin(hasAccess);
      
      if (hasAccess) {
        fetchAllContent();
      } else {
        setLoading(false);
      }
    } catch (error) {
      setIsSuperAdmin(false);
      setLoading(false);
    }
  };

  const fetchAllContent = async () => {
    try {
      const [legalRes, aboutRes] = await Promise.all([
        supabase.from('legal_pages').select('*').order('title'),
        supabase.from('about_content').select('*').order('order_index'),
      ]);

      if (legalRes.error) throw legalRes.error;
      if (aboutRes.error) throw aboutRes.error;

      setLegalPages(legalRes.data || []);
      setAboutSections(aboutRes.data || []);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLegalPage = async () => {
    if (!selectedPage) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('legal_pages')
        .update({
          title: selectedPage.title,
          description: selectedPage.description,
          content: selectedPage.content,
          is_published: selectedPage.is_published,
        })
        .eq('id', selectedPage.id);

      if (error) throw error;

      toast.success('Legal page updated successfully');
      fetchAllContent();
    } catch (error) {
      console.error('Error saving legal page:', error);
      toast.error('Failed to save legal page');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAboutSection = async () => {
    if (!selectedSection) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('about_content')
        .update({
          title: selectedSection.title,
          content: selectedSection.content,
          order_index: selectedSection.order_index,
          is_published: selectedSection.is_published,
        })
        .eq('id', selectedSection.id);

      if (error) throw error;

      toast.success('About section updated successfully');
      fetchAllContent();
    } catch (error) {
      console.error('Error saving about section:', error);
      toast.error('Failed to save about section');
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading CMS...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Legal Content Management</h1>

      <Tabs defaultValue="legal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="legal">Legal Pages</TabsTrigger>
          <TabsTrigger value="about">About Content</TabsTrigger>
        </TabsList>

        <TabsContent value="legal" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Legal Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {legalPages.map((page) => (
                    <Button
                      key={page.id}
                      variant={selectedPage?.id === page.id ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setSelectedPage(page)}
                    >
                      {page.title}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedPage && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Edit: {selectedPage.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={selectedPage.title}
                      onChange={(e) =>
                        setSelectedPage({ ...selectedPage, title: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={selectedPage.description || ''}
                      onChange={(e) =>
                        setSelectedPage({ ...selectedPage, description: e.target.value })
                      }
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Content (Markdown)</Label>
                    <Textarea
                      id="content"
                      value={selectedPage.content}
                      onChange={(e) =>
                        setSelectedPage({ ...selectedPage, content: e.target.value })
                      }
                      rows={15}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={selectedPage.is_published}
                      onCheckedChange={(checked) =>
                        setSelectedPage({ ...selectedPage, is_published: checked })
                      }
                    />
                    <Label>Published</Label>
                  </div>

                  <Button onClick={handleSaveLegalPage} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="about" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>About Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {aboutSections.map((section) => (
                    <Button
                      key={section.id}
                      variant={selectedSection?.id === section.id ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => setSelectedSection(section)}
                    >
                      {section.title}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedSection && (
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Edit: {selectedSection.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="section-title">Title</Label>
                    <Input
                      id="section-title"
                      value={selectedSection.title}
                      onChange={(e) =>
                        setSelectedSection({ ...selectedSection, title: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="section-content">Content (Markdown)</Label>
                    <Textarea
                      id="section-content"
                      value={selectedSection.content}
                      onChange={(e) =>
                        setSelectedSection({ ...selectedSection, content: e.target.value })
                      }
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="order">Display Order</Label>
                    <Input
                      id="order"
                      type="number"
                      value={selectedSection.order_index}
                      onChange={(e) =>
                        setSelectedSection({
                          ...selectedSection,
                          order_index: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={selectedSection.is_published}
                      onCheckedChange={(checked) =>
                        setSelectedSection({ ...selectedSection, is_published: checked })
                      }
                    />
                    <Label>Published</Label>
                  </div>

                  <Button onClick={handleSaveAboutSection} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
