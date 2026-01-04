import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Static cache buster - changes only on app reload
const APP_VERSION = Date.now();

// Language configuration with RTL support
export interface LanguageConfig {
  code: string;
  name: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

// Primary supported languages (en, ru, uz, ar as specified)
export const languages: LanguageConfig[] = [
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'uz', name: 'O\'zbek', flag: '🇺🇿', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  // Additional languages
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', dir: 'ltr' },
  { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'zh', name: '中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'pt', name: 'Português', flag: '🇧🇷', dir: 'ltr' },
  { code: 'ja', name: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', name: '한국어', flag: '🇰🇷', dir: 'ltr' },
];

// RTL languages list
export const rtlLanguages = ['ar', 'he', 'fa', 'ur'];

// Helper to check if language is RTL
export const isRTL = (langCode: string): boolean => rtlLanguages.includes(langCode);

// Helper to get language direction
export const getDirection = (langCode: string): 'ltr' | 'rtl' => 
  isRTL(langCode) ? 'rtl' : 'ltr';

// Apply RTL direction to document
export const applyDirection = (langCode: string): void => {
  const dir = getDirection(langCode);
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', langCode);
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    supportedLngs: languages.map(l => l.code),
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    backend: {
      loadPath: `/locales/{{lng}}/{{ns}}.json?v=${APP_VERSION}`,
      requestOptions: {
        cache: 'default',
        mode: 'cors',
      },
    },

    interpolation: {
      escapeValue: false,
    },

    ns: [
      'common', 
      'home', 
      'doctors', 
      'patients', 
      'auth', 
      'dashboard', 
      'support', 
      'about', 
      'contact', 
      'faqs', 
      'features', 
      'help', 
      'legal', 
      'practices', 
      'specialties', 
      'lab', 
      'pharmacy', 
      'imaging',
      'admin',
      'popups'
    ],
    defaultNS: 'common',
    
    partialBundledLanguages: true,

    react: {
      useSuspense: false,
    },
  });

// Apply initial direction based on detected language
i18n.on('initialized', () => {
  applyDirection(i18n.language);
});

// Apply direction on language change
i18n.on('languageChanged', (lng) => {
  applyDirection(lng);
});

export default i18n;
