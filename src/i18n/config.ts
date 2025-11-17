import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

export const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'uz', name: 'O\'zbek', flag: '🇺🇿' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
];

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: true, // Enable debug to see loading issues
    supportedLngs: languages.map(l => l.code),
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

  backend: {
    loadPath: (lng: string, ns: string) => {
      // Use dynamic timestamp per request to bust cache
      return `/locales/${lng}/${ns}.json?v=${Date.now()}`;
    },
    requestOptions: {
      cache: 'no-store',
      mode: 'cors',
    },
  },

    interpolation: {
      escapeValue: false,
    },

    ns: ['common', 'home', 'doctors', 'patients', 'auth', 'dashboard', 'support', 'about', 'contact', 'faqs', 'features', 'help', 'legal', 'practices', 'specialties'],
    defaultNS: 'common',
    
    // Load namespaces on demand
    partialBundledLanguages: true,

    react: {
      useSuspense: false,
    },
  });

export default i18n;
