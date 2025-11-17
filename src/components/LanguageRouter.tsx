import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';

const supportedLanguages = ['en', 'ru', 'uz', 'ar'];

/**
 * LanguageRouter handles language-based routing for SEO-friendly URLs
 * Public pages: /en/..., /ru/..., /uz/..., /ar/...
 * Private dashboards: No language prefix (use user preference)
 */
export const LanguageRouter = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentLanguage, saveLanguagePreference } = useLanguagePreference();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Prevent redirect loops
    if (hasRedirected) return;

    const path = location.pathname;
    const pathParts = path.split('/').filter(Boolean);
    const firstPart = pathParts[0];
    const secondPart = pathParts[1];

    // Check for duplicate language prefix (e.g., /en/en/, /de/de/)
    if (supportedLanguages.includes(firstPart) && supportedLanguages.includes(secondPart)) {
      const cleanPath = '/' + pathParts.slice(1).join('/');
      navigate(cleanPath, { replace: true });
      setHasRedirected(true);
      return;
    }

    // Check if this is a private page
    const privatePages = ['/dashboard', '/auth', '/signup', '/notifications', '/admin-dashboard', 
                          '/doctor-dashboard', '/patient-dashboard', '/doctor-signup', '/verify',
                          '/register-practice', '/processing-practice', '/treatment-planning',
                          '/procedure-library', '/doctor-procedures', '/doctor-schedule-settings'];
    
    const isPrivatePage = privatePages.some(prefix => path.startsWith(prefix) || 
                          (supportedLanguages.includes(firstPart) && pathParts.slice(1).join('/').startsWith(prefix.slice(1))));

    if (isPrivatePage) {
      // Private pages: remove language prefix if present
      if (supportedLanguages.includes(firstPart)) {
        const newPath = '/' + pathParts.slice(1).join('/');
        navigate(newPath, { replace: true });
        setHasRedirected(true);
      }
    } else {
      // Public pages: ensure language prefix exists
      if (supportedLanguages.includes(firstPart)) {
        // URL has language prefix, update user preference if different
        if (firstPart !== currentLanguage) {
          saveLanguagePreference(firstPart);
        }
      } else if (path === '/' || !supportedLanguages.includes(firstPart)) {
        // Root or no language prefix - add current language
        const targetPath = path === '/' ? '' : path;
        const newPath = `/${currentLanguage}${targetPath}`;
        navigate(newPath, { replace: true });
        setHasRedirected(true);
      }
    }
  }, [location.pathname, currentLanguage, navigate, saveLanguagePreference, hasRedirected]);

  return <>{children}</>;
};
