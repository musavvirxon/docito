import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { languages } from '@/i18n/config';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language);

  const handleLanguageChange = async (langCode: string) => {
    try {
      // Force reload all namespaces for the new language
      await i18n.changeLanguage(langCode);
      
      // Reload all loaded namespaces
      const loadedNamespaces = Array.isArray(i18n.options.ns) ? i18n.options.ns : [i18n.options.ns || 'common'];
      await Promise.all(
        loadedNamespaces.map((ns: string) => 
          i18n.reloadResources(langCode, ns)
        )
      );
      
      setCurrentLang(langCode);
      localStorage.setItem('i18nextLng', langCode);
      
      // Update document direction for RTL languages
      const language = languages.find(l => l.code === langCode);
      if (language?.dir === 'rtl') {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = langCode;
      } else {
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = langCode;
      }
      
      // Force page reload to ensure all translations load
      window.location.reload();
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const currentLanguage = languages.find(l => l.code === currentLang) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLanguage.flag} {currentLanguage.code.toUpperCase()}</span>
          <span className="sm:hidden">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 max-h-96 overflow-y-auto">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={currentLang === language.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{language.flag}</span>
            <span>{language.name}</span>
            {currentLang === language.code && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
