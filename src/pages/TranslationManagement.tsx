import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Search, Download, Upload, Globe, Save, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations, TranslationKey } from '@/hooks/useTranslations';
import { languages } from '@/i18n/config';
import { useToast } from '@/hooks/use-toast';

const TranslationManagement = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [translations, setTranslations] = useState<TranslationKey[]>([]);
  const [filteredTranslations, setFilteredTranslations] = useState<TranslationKey[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const { loading, fetchTranslations, updateTranslation, autoTranslate, publishTranslations } = useTranslations();

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
    if (isSuperAdmin) {
      loadTranslations();
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    filterTranslations();
  }, [searchQuery, selectedModule, translations]);

  const loadTranslations = async () => {
    const data = await fetchTranslations();
    setTranslations(data);
    setFilteredTranslations(data);
  };

  const filterTranslations = () => {
    let filtered = [...translations];

    if (selectedModule !== 'all') {
      filtered = filtered.filter(t => t.module === selectedModule);
    }

    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.source_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.translations[selectedLanguage] || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTranslations(filtered);
  };

  const handleEdit = (translation: TranslationKey) => {
    setEditingKey(translation.id);
    setEditValue(translation.translations[selectedLanguage] || '');
  };

  const handleSave = async (keyId: string) => {
    const success = await updateTranslation(keyId, selectedLanguage, editValue, 'draft');
    if (success) {
      setEditingKey(null);
      loadTranslations();
    }
  };

  const handleAutoTranslate = async (keyId: string) => {
    const targetLangs = languages.map(l => l.code).filter(c => c !== 'en');
    await autoTranslate(keyId, targetLangs);
    loadTranslations();
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      approved: 'bg-green-500',
      draft: 'bg-yellow-500',
      review: 'bg-blue-500',
      auto: 'bg-purple-500',
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-500'}>
        {status}
      </Badge>
    );
  };

  const modules = ['all', 'common', 'home', 'doctors', 'patients', 'auth', 'dashboard'];

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
            Translation Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage multilingual content across the platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button size="sm" onClick={() => publishTranslations(filteredTranslations.map(t => t.id), 'production')}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter translations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search translations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                {modules.map(module => (
                  <SelectItem key={module} value={module}>
                    {module.charAt(0).toUpperCase() + module.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Translation Keys ({filteredTranslations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Key</TableHead>
                  <TableHead>Source (EN)</TableHead>
                  <TableHead>Translation ({selectedLanguage.toUpperCase()})</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-48">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredTranslations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No translations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTranslations.map((translation) => (
                    <TableRow key={translation.id}>
                      <TableCell className="font-mono text-xs">
                        {translation.key}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {translation.source_text}
                      </TableCell>
                      <TableCell>
                        {editingKey === translation.id ? (
                          <Textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="min-h-20"
                          />
                        ) : (
                          <div className="max-w-xs truncate">
                            {translation.translations[selectedLanguage] || (
                              <span className="text-muted-foreground italic">Not translated</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(translation.status[selectedLanguage] || 'draft')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {editingKey === translation.id ? (
                            <>
                              <Button size="sm" onClick={() => handleSave(translation.id)}>
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingKey(null)}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleEdit(translation)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleAutoTranslate(translation.id)}>
                                <Globe className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TranslationManagement;
