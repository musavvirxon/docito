import { useLocation } from 'react-router-dom';
import { languages } from '@/i18n/config';

const supportedLanguages = languages.map(l => l.code);

/**
 * Hook to get the current language from the URL and generate localized paths
 */
export const useLocalizedPath = () => {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentLang = supportedLanguages.includes(pathParts[0]) ? pathParts[0] : 'en';

  /**
   * Generates a localized path by prepending the current language
   * @param path - The path without language prefix (e.g., "/help-center")
   * @returns The localized path (e.g., "/en/help-center")
   */
  const getLocalizedPath = (path: string): string => {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    // Check if path already has a language prefix
    const pathFirstPart = cleanPath.split('/')[0];
    if (supportedLanguages.includes(pathFirstPart)) {
      return `/${cleanPath}`;
    }
    
    return `/${currentLang}/${cleanPath}`;
  };

  return { currentLang, getLocalizedPath };
};
