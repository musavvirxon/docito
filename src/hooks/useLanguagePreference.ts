import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

export const useLanguagePreference = () => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Load user's preferred language from database or localStorage
  useEffect(() => {
    const loadLanguagePreference = async () => {
      if (user) {
        // Authenticated: fetch from database
        try {
          const { data, error } = await supabase
            .from('user_preferences')
            .select('preferred_language')
            .eq('user_id', user.id)
            .single();

          if (!error && data?.preferred_language) {
            if (i18n.language !== data.preferred_language) {
              await i18n.changeLanguage(data.preferred_language);
              localStorage.setItem('i18nextLng', data.preferred_language);
            }
          }
        } catch (error) {
          console.error('Error loading language preference:', error);
        }
      } else {
        // Guest: use localStorage or browser language
        const storedLang = localStorage.getItem('i18nextLng');
        if (storedLang && i18n.language !== storedLang) {
          await i18n.changeLanguage(storedLang);
        }
      }
    };

    loadLanguagePreference();
  }, [user, i18n]);

  // Save language preference (without reloading page)
  const saveLanguagePreference = useCallback(async (language: string) => {
    setLoading(true);
    try {
      // Always save to localStorage for guests
      localStorage.setItem('i18nextLng', language);
      
      if (user) {
        // Authenticated: save to database (preserves auth state)
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            preferred_language: language,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (error) throw error;
      }

      // Change i18n language immediately
      await i18n.changeLanguage(language);
      
      // Update document direction for RTL languages
      if (language === 'ar') {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = language;
      } else {
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = language;
      }

      return true;
    } catch (error) {
      console.error('Error saving language preference:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, i18n]);

  return {
    currentLanguage: i18n.language || 'en',
    saveLanguagePreference,
    loading,
  };
};
