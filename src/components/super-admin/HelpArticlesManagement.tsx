import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const categories = [
  { value: 'getting_started', label: 'Getting Started' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'telemedicine', label: 'Telemedicine' },
  { value: 'medical_records', label: 'Medical Records' },
  { value: 'billing_payments', label: 'Billing & Payments' },
  { value: 'account_management', label: 'Account Management' }
];

const languages = ['en', 'es', 'ar', 'de', 'pt', 'ru', 'tr', 'uz', 'ja', 'ko', 'zh'];

export default function HelpArticlesManagement() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .order('category')
        .order('display_order');

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load help articles'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveArticle = async (article: any) => {
    try {
      if (article.id) {
        const { error } = await supabase
          .from('help_articles')
          .update(article)
          .eq('id', article.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Article updated successfully' });
      } else {
        const { error } = await supabase
          .from('help_articles')
          .insert([article]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Article created successfully' });
      }

      fetchArticles();
      setIsDialogOpen(false);
      setEditingArticle(null);
    } catch (error: any) {
      console.error('Error saving article:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save article'
      });
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    try {
      const { error } = await supabase
        .from('help_articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Article deleted successfully' });
      fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete article'
      });
    }
  };

  const handleNewArticle = () => {
    setEditingArticle({
      category: 'getting_started',
      slug: '',
      icon: 'Book',
      color: 'from-blue-500 to-indigo-600',
      is_published: true,
      is_popular: false,
      display_order: 0,
      title_en: '',
      description_en: '',
      content_en: ''
    });
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Help Articles Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewArticle}>
              <Plus className="w-4 h-4 mr-2" />
              New Article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingArticle?.id ? 'Edit Article' : 'New Article'}
              </DialogTitle>
            </DialogHeader>
            <ArticleForm
              article={editingArticle}
              onSave={handleSaveArticle}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingArticle(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {articles.map((article) => (
          <Card key={article.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{article.title_en}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="capitalize">{article.category.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>{article.views} views</span>
                    {article.is_popular && (
                      <>
                        <span>•</span>
                        <span className="text-yellow-600">Popular</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingArticle(article);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteArticle(article.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ArticleForm({ article, onSave, onCancel }: any) {
  const [formData, setFormData] = useState(article);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="icon">Icon</Label>
          <Input
            id="icon"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Color Classes</Label>
          <Input
            id="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="display_order">Display Order</Label>
          <Input
            id="display_order"
            type="number"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.is_published}
            onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
          />
          <Label>Published</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.is_popular}
            onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })}
          />
          <Label>Popular</Label>
        </div>
      </div>

      <Tabs defaultValue="en">
        <TabsList className="grid grid-cols-6 lg:grid-cols-11">
          {languages.map((lang) => (
            <TabsTrigger key={lang} value={lang}>
              {lang.toUpperCase()}
            </TabsTrigger>
          ))}
        </TabsList>

        {languages.map((lang) => (
          <TabsContent key={lang} value={lang} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`title_${lang}`}>Title ({lang.toUpperCase()})</Label>
              <Input
                id={`title_${lang}`}
                value={formData[`title_${lang}`] || ''}
                onChange={(e) => setFormData({ ...formData, [`title_${lang}`]: e.target.value })}
                required={lang === 'en'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`description_${lang}`}>Description ({lang.toUpperCase()})</Label>
              <Textarea
                id={`description_${lang}`}
                value={formData[`description_${lang}`] || ''}
                onChange={(e) => setFormData({ ...formData, [`description_${lang}`]: e.target.value })}
                rows={2}
                required={lang === 'en'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`content_${lang}`}>Content ({lang.toUpperCase()})</Label>
              <Textarea
                id={`content_${lang}`}
                value={formData[`content_${lang}`] || ''}
                onChange={(e) => setFormData({ ...formData, [`content_${lang}`]: e.target.value })}
                rows={6}
                required={lang === 'en'}
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Article
        </Button>
      </div>
    </form>
  );
}
