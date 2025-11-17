import { useEffect } from 'react';
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

  useEffect(() => {
    const path = location.pathname;
    const pathParts = path.split('/').filter(Boolean);
    const firstPart = pathParts[0];

    // Check if this is a public page (not dashboard/auth/etc)
    const isPublicPage = !path.startsWith('/dashboard') && 
                         !path.startsWith('/auth') && 
                         !path.startsWith('/notifications') &&
                         !path.startsWith('/admin') &&
                         !path.startsWith('/doctor-dashboard') &&
                         !path.startsWith('/patient-dashboard');

    if (isPublicPage) {
      // Check if URL has language prefix
      if (supportedLanguages.includes(firstPart)) {
        // URL has language prefix, update user preference if different
        if (firstPart !== currentLanguage) {
          saveLanguagePreference(firstPart);
        }
      } else {
        // URL doesn't have language prefix, add it based on user preference
        const newPath = `/${currentLanguage}${path}`;
        navigate(newPath, { replace: true });
      }
    } else {
      // Private pages: remove language prefix if present
      if (supportedLanguages.includes(firstPart)) {
        const newPath = '/' + pathParts.slice(1).join('/');
        navigate(newPath, { replace: true });
      }
    }
  }, [location.pathname, currentLanguage, navigate, saveLanguagePreference]);

  return <>{children}</>;
};
