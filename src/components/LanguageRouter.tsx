import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { languages } from '@/i18n/config';

const supportedLanguages = languages.map(l => l.code);

/**
 * LanguageRouter handles language-based routing for SEO-friendly URLs
 * Public pages: /en/..., /ru/..., /uz/..., /ar/...
 * Private dashboards: No language prefix (use user preference)
 */
export const LanguageRouter = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLanguage, saveLanguagePreference } = useLanguagePreference();
  const lastPathRef = useRef<string>('');
  const redirectCountRef = useRef<number>(0);

  useEffect(() => {
    const path = location.pathname;
    
    // CRITICAL: Prevent infinite redirect loops
    // If we've seen this path before or redirected too many times, stop
    if (lastPathRef.current === path) return;
    if (redirectCountRef.current > 3) {
      console.error('LanguageRouter: Too many redirects, stopping to prevent loop');
      redirectCountRef.current = 0;
      return;
    }
    
    lastPathRef.current = path;
    const pathParts = path.split('/').filter(Boolean);
    const firstPart = pathParts[0];

    // CRITICAL FIX: Detect infinite cascade (multiple language codes in path)
    const languageCount = pathParts.filter(part => supportedLanguages.includes(part)).length;
    if (languageCount > 1) {
      // Path has multiple language codes like /de/de/de or /ru/de
      // Clean it completely - navigate to root and let it redirect properly
      console.warn('LanguageRouter: Detected cascading language prefixes, cleaning path');
      navigate('/en/', { replace: true });
      redirectCountRef.current++;
      return;
    }

    // Private pages list (authenticated pages - no language prefix)
    const privatePages = [
      'dashboard', 'auth', 'notifications', 'admin-dashboard', 
      'doctor-dashboard', 'patient-dashboard', 'doctor-signup', 'verify',
      'register-practice', 'processing-practice', 'treatment-planning',
      'procedure-library', 'doctor-procedures', 'doctor-schedule-settings',
      'booking-confirmation', 'book-appointment', 'legal-cms', 'super-admin-dashboard',
      'admin', 'staff-dashboard', 'messages', 'video', 'pharmacy', 'lab', 'imaging',
      'imaging-center', 'practice-dashboard', 'practices', 'settings', 'profile', 'accept-invite'
    ];
    
    // Public pages that don't have translations yet - serve as English only (no prefix)
    const englishOnlyPages = ['for-pharmacies', 'for-doctors', 'for-labs', 'for-imaging'];
    
    // Check if current path (without lang prefix) is a private page or english-only page
    const pathWithoutLang = supportedLanguages.includes(firstPart) 
      ? pathParts.slice(1).join('/') 
      : pathParts.join('/');
    
    const isPrivatePage = privatePages.some(prefix => 
      pathWithoutLang.startsWith(prefix) || 
      pathWithoutLang === prefix
    );
    
    const isEnglishOnlyPage = englishOnlyPages.some(prefix => 
      pathWithoutLang.startsWith(prefix) || 
      pathWithoutLang === prefix
    );

    if (isPrivatePage || isEnglishOnlyPage) {
      // Private pages and English-only pages: MUST NOT have language prefix
      if (supportedLanguages.includes(firstPart)) {
        const newPath = '/' + pathParts.slice(1).join('/');
        navigate(newPath, { replace: true });
        redirectCountRef.current++;
      } else {
        // Page without prefix - this is correct, do nothing
        redirectCountRef.current = 0;
      }
    } else {
      // Public pages with translations: MUST have language prefix
      if (supportedLanguages.includes(firstPart)) {
        // Has valid language prefix - update preference if needed
        if (firstPart !== currentLanguage) {
          saveLanguagePreference(firstPart);
        }
        redirectCountRef.current = 0;
      } else {
        // No language prefix - add current language
        const targetPath = path === '/' ? '' : path;
        const newPath = `/${currentLanguage}${targetPath}`;
        navigate(newPath, { replace: true });
        redirectCountRef.current++;
      }
    }
  }, [location.pathname, currentLanguage, navigate, saveLanguagePreference]);

  return <>{children}</>;
};
