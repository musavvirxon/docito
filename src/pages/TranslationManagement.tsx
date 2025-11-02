import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Globe, Save, Plus, Eye, FileText, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { languages } from '@/i18n/config';
import { useToast } from '@/hooks/use-toast';

interface PageContent {
  pageKey: string;
  pageName: string;
  translations: {
    [key: string]: {
      label: string;
      texts: {
        [lang: string]: string;
      };
    };
  };
  seo: {
    [lang: string]: {
      title: string;
      description: string;
      keywords: string;
      slug: string;
    };
  };
}

const pages = [
  { key: 'home', name: 'Home Page', route: 'home-page' },
  { key: 'doctors', name: 'Doctors Page', route: 'doctors' },
  { key: 'doctor-profile', name: 'Doctor Profile', route: 'doctor-profile' },
  { key: 'practices', name: 'Practices Page', route: 'practices' },
  { key: 'about', name: 'About Us', route: 'about' },
  { key: 'contact', name: 'Contact', route: 'contact' },
  { key: 'faq', name: 'FAQ', route: 'faq' },
  { key: 'patient-dashboard', name: 'Patient Dashboard', route: 'patient-dashboard' },
  { key: 'doctor-dashboard', name: 'Doctor Dashboard', route: 'doctor-dashboard' },
  { key: 'auth', name: 'Auth Pages', route: 'auth' },
];

const TranslationManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [selectedPage, setSelectedPage] = useState<string>('home');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'super_admin'
        });

        if (error) {
          console.error('Error checking super admin role:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(data === true);
        }
      } catch (error) {
        console.error('Error checking super admin role:', error);
        setIsSuperAdmin(false);
      }
    };

    checkSuperAdmin();
  }, [user]);

  useEffect(() => {
    if (isSuperAdmin && selectedPage) {
      loadPageContent();
    }
  }, [isSuperAdmin, selectedPage]);

  const loadPageContent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('page_translations' as any)
        .select('*')
        .eq('page_key', selectedPage)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading page content:', error);
      }

      if (data) {
        const typedData = data as any;
        if (typedData && typeof typedData === 'object' && typedData.page_key) {
          setPageContent({
            pageKey: typedData.page_key as string,
            pageName: typedData.page_name as string,
            translations: typedData.translations || {},
            seo: typedData.seo || {},
          });
        } else {
          // Initialize empty page content
          setPageContent({
            pageKey: selectedPage,
            pageName: pages.find(p => p.key === selectedPage)?.name || '',
            translations: {},
            seo: {},
          });
        }
      } else {
        // Initialize empty page content
        setPageContent({
          pageKey: selectedPage,
          pageName: pages.find(p => p.key === selectedPage)?.name || '',
          translations: {},
          seo: {},
        });
      }
    } catch (error) {
      console.error('Error loading page content:', error);
      toast({
        title: 'Error',
        description: 'Failed to load page content',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTextElement = () => {
    if (!pageContent) return;
    
    const newKey = `${selectedPage}.element_${Object.keys(pageContent.translations).length + 1}`;
    const newTranslations = { ...pageContent.translations };
    newTranslations[newKey] = {
      label: 'New Text Element',
      texts: { en: '' },
    };

    setPageContent({
      ...pageContent,
      translations: newTranslations,
    });
  };

  const handleUpdateText = (key: string, lang: string, value: string) => {
    if (!pageContent) return;

    // Validate and sanitize input (max 5000 chars, no script tags)
    const maxLength = 5000;
    const trimmed = value.trim().substring(0, maxLength);
    
    if (/<script/i.test(trimmed)) {
      toast({
        title: 'Invalid Content',
        description: 'Script tags are not allowed in translations',
        variant: 'destructive',
      });
      return;
    }

    const updated = { ...pageContent };
    if (!updated.translations[key].texts) {
      updated.translations[key].texts = {};
    }
    updated.translations[key].texts[lang] = trimmed;
    setPageContent(updated);
  };

  const handleUpdateLabel = (key: string, label: string) => {
    if (!pageContent) return;

    const updated = { ...pageContent };
    updated.translations[key].label = label;
    setPageContent(updated);
  };

  const handleUpdateSEO = (lang: string, field: string, value: string) => {
    if (!pageContent) return;

    // Validate SEO fields with appropriate length limits
    const limits: Record<string, number> = {
      metaTitle: 60,
      title: 60,
      metaDescription: 160,
      description: 160,
      keywords: 200,
      slug: 100
    };
    
    const maxLength = limits[field] || 200;
    const trimmed = value.trim();
    
    if (trimmed.length > maxLength * 2) {
      toast({
        title: 'Warning',
        description: `${field} exceeds recommended length. Maximum ${maxLength * 2} characters allowed.`,
        variant: 'destructive',
      });
      return;
    }
    
    if (trimmed.length > maxLength) {
      toast({
        title: 'SEO Warning',
        description: `${field} should be under ${maxLength} characters for optimal SEO`,
      });
    }

    const updated = { ...pageContent };
    if (!updated.seo[lang]) {
      updated.seo[lang] = { title: '', description: '', keywords: '', slug: '' };
    }
    updated.seo[lang] = { ...updated.seo[lang], [field]: trimmed.substring(0, maxLength * 2) };
    setPageContent(updated);
  };

  const handleSave = async () => {
    if (!pageContent) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('page_translations' as any)
        .upsert({
          page_key: pageContent.pageKey,
          page_name: pageContent.pageName,
          translations: pageContent.translations,
          seo: pageContent.seo,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Page translations saved successfully',
      });

      // Trigger language file generation
      try {
        await supabase.functions.invoke('generate-language-files', {
          body: { pageKey: pageContent.pageKey },
        });
      } catch (funcError) {
        console.log('Language file generation will be handled separately');
      }
    } catch (error) {
      console.error('Error saving translations:', error);
      toast({
        title: 'Error',
        description: 'Failed to save translations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteElement = (key: string) => {
    if (!pageContent) return;

    const updated = { ...pageContent };
    delete updated.translations[key];
    setPageContent(updated);
  };

  if (isSuperAdmin === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Access denied. Super admin role required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Globe className="w-8 h-8" />
            Page Translation Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Edit page content and SEO for each language
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading || !pageContent}>
          <Save className="w-4 h-4 mr-2" />
          Save All Changes
        </Button>
      </div>

      {/* Page Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Page to Edit</CardTitle>
          <CardDescription>Choose a page to manage its translations and SEO</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {pages.map((page) => (
              <Button
                key={page.key}
                variant={selectedPage === page.key ? 'default' : 'outline'}
                className="h-auto flex-col py-4"
                onClick={() => setSelectedPage(page.key)}
              >
                <FileText className="w-6 h-6 mb-2" />
                <span className="text-sm font-medium">{page.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : pageContent ? (
        <Tabs value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
            {languages.map((lang) => (
              <TabsTrigger key={lang.code} value={lang.code} className="gap-2">
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {languages.map((lang) => (
            <TabsContent key={lang.code} value={lang.code} className="space-y-6">
              {/* SEO Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    SEO Settings for {lang.name}
                  </CardTitle>
                  <CardDescription>
                    Configure meta tags and URL for this page in {lang.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Page URL Slug</Label>
                    <Input
                      placeholder="e.g., home-page"
                      value={pageContent.seo[lang.code]?.slug || ''}
                      onChange={(e) => handleUpdateSEO(lang.code, 'slug', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Full URL: /{lang.code}/{pageContent.seo[lang.code]?.slug || pages.find(p => p.key === selectedPage)?.route}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Title</Label>
                    <Input
                      placeholder="SEO page title (50-60 characters)"
                      value={pageContent.seo[lang.code]?.title || ''}
                      onChange={(e) => handleUpdateSEO(lang.code, 'title', e.target.value)}
                      maxLength={60}
                    />
                    <p className="text-xs text-muted-foreground">
                      {pageContent.seo[lang.code]?.title?.length || 0}/60 characters
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Description</Label>
                    <Textarea
                      placeholder="SEO description (150-160 characters)"
                      value={pageContent.seo[lang.code]?.description || ''}
                      onChange={(e) => handleUpdateSEO(lang.code, 'description', e.target.value)}
                      maxLength={160}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      {pageContent.seo[lang.code]?.description?.length || 0}/160 characters
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Keywords (comma separated)</Label>
                    <Input
                      placeholder="healthcare, doctor, appointment"
                      value={pageContent.seo[lang.code]?.keywords || ''}
                      onChange={(e) => handleUpdateSEO(lang.code, 'keywords', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Page Content */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Page Content in {lang.name}</CardTitle>
                      <CardDescription>
                        Edit all text elements on this page
                      </CardDescription>
                    </div>
                    <Button onClick={handleAddTextElement} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Text Element
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.keys(pageContent.translations).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No text elements yet. Click "Add Text Element" to start.
                    </div>
                  ) : (
                    Object.entries(pageContent.translations).map(([key, value]) => (
                      <Card key={key} className="border-2">
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-mono text-muted-foreground">{key}</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteElement(key)}
                              className="text-destructive"
                            >
                              Delete
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label>Element Label (for identification)</Label>
                            <Input
                              placeholder="e.g., Hero Title, Button Text"
                              value={value.label}
                              onChange={(e) => handleUpdateLabel(key, e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Text Content</Label>
                            <Textarea
                              placeholder={`Enter text in ${lang.name}`}
                              value={value.texts[lang.code] || ''}
                              onChange={(e) => handleUpdateText(key, lang.code, e.target.value)}
                              rows={3}
                            />
                          </div>
                          {lang.code === 'en' && (
                            <Badge variant="secondary">Source Language</Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : null}
    </div>
  );
};

export default TranslationManagement;
