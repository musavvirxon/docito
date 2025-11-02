import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for managing multilingual database content
 * Fetches translations from the page_translations table based on current language
 */
export const useContentTranslation = () => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language || 'en';

  /**
   * Get translated content for a specific page and key
   * @param pageKey - The page identifier (e.g., 'home', 'about')
   * @param contentKey - The specific content key within the page
   * @param fallback - Fallback text if translation is not found
   */
  const getTranslatedContent = useCallback(
    async (pageKey: string, contentKey: string, fallback: string = '') => {
      try {
        const { data, error } = await supabase
          .from('page_translations')
          .select('translations')
          .eq('page_key', pageKey)
          .single();

        if (error || !data) {
          console.warn(`No translation found for page: ${pageKey}`);
          return fallback;
        }

        // Navigate through the translations object to find the specific content
        const translations = data.translations as any;
        const langTranslations = translations[currentLanguage];
        
        if (!langTranslations) {
          console.warn(`No ${currentLanguage} translation found for page: ${pageKey}`);
          return fallback;
        }

        // Support nested keys like "hero.title"
        const keys = contentKey.split('.');
        let value = langTranslations;
        
        for (const key of keys) {
          if (value && typeof value === 'object' && key in value) {
            value = value[key];
          } else {
            console.warn(`Translation key not found: ${contentKey} in ${pageKey}`);
            return fallback;
          }
        }

        return typeof value === 'string' ? value : fallback;
      } catch (err) {
        console.error('Error fetching translation:', err);
        return fallback;
      }
    },
    [currentLanguage]
  );

  /**
   * Get all translations for a specific page
   * @param pageKey - The page identifier
   */
  const getPageTranslations = useCallback(
    async (pageKey: string) => {
      try {
        const { data, error } = await supabase
          .from('page_translations')
          .select('translations')
          .eq('page_key', pageKey)
          .single();

        if (error || !data) {
          console.warn(`No translations found for page: ${pageKey}`);
          return null;
        }

        const translations = data.translations as any;
        return translations[currentLanguage] || null;
      } catch (err) {
        console.error('Error fetching page translations:', err);
        return null;
      }
    },
    [currentLanguage]
  );

  /**
   * Get translated field from a database record
   * Assumes the record has a structure like: { name_en, name_ru, name_uz, name_ar }
   * @param record - The database record
   * @param fieldName - The base field name (e.g., 'name', 'description')
   */
  const getTranslatedField = useCallback(
    (record: any, fieldName: string): string => {
      if (!record) return '';
      
      // Try current language first
      const translatedField = `${fieldName}_${currentLanguage}`;
      if (record[translatedField]) {
        return record[translatedField];
      }
      
      // Fallback to English
      const englishField = `${fieldName}_en`;
      if (record[englishField]) {
        return record[englishField];
      }
      
      // Fallback to the base field without suffix
      if (record[fieldName]) {
        return record[fieldName];
      }
      
      return '';
    },
    [currentLanguage]
  );

  return {
    currentLanguage,
    getTranslatedContent,
    getPageTranslations,
    getTranslatedField,
  };
};
