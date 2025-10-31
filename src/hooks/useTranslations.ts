import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TranslationKey {
  id: string;
  key: string;
  module: string;
  context?: string;
  source_text: string;
  translations: Record<string, string>;
  status: Record<string, string>;
  version: number;
  last_updated: string;
  updated_by?: string;
}

export const useTranslations = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTranslations = async (module?: string, language?: string) => {
    try {
      setLoading(true);
      let query = supabase.from('translation_keys').select('*');
      
      if (module) {
        query = query.eq('module', module);
      }
      
      const { data, error } = await query.order('key');
      
      if (error) throw error;
      return data as TranslationKey[];
    } catch (error) {
      console.error('Error fetching translations:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch translations',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const updateTranslation = async (
    keyId: string,
    language: string,
    translation: string,
    status: string = 'draft'
  ) => {
    try {
      setLoading(true);
      
      const { data: existing } = await supabase
        .from('translation_keys')
        .select('translations, status')
        .eq('id', keyId)
        .single();

      if (!existing) throw new Error('Translation key not found');

      const currentTranslations = (existing.translations as Record<string, string>) || {};
      const currentStatus = (existing.status as Record<string, string>) || {};

      const updatedTranslations = {
        ...currentTranslations,
        [language]: translation,
      };

      const updatedStatus = {
        ...currentStatus,
        [language]: status,
      };

      const { error } = await supabase
        .from('translation_keys')
        .update({
          translations: updatedTranslations,
          status: updatedStatus,
          last_updated: new Date().toISOString(),
        })
        .eq('id', keyId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Translation updated successfully',
      });

      return true;
    } catch (error) {
      console.error('Error updating translation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update translation',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const autoTranslate = async (keyId: string, targetLanguages: string[]) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('auto-translate', {
        body: { keyId, targetLanguages },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Auto-translation completed',
      });

      return data;
    } catch (error) {
      console.error('Error auto-translating:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to auto-translate',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const publishTranslations = async (keyIds: string[], environment: 'staging' | 'production') => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('publish-translations', {
        body: { keyIds, environment },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Translations published to ${environment}`,
      });

      return true;
    } catch (error) {
      console.error('Error publishing translations:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to publish translations',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetchTranslations,
    updateTranslation,
    autoTranslate,
    publishTranslations,
  };
};
