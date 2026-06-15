import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { languages } from '@/i18n/config';
import { useLanguagePreference } from '@/hooks/useLanguagePreference';
import { useToast } from '@/hooks/use-toast';

export const LanguageSwitcher = () => {
  const { t } = useTranslation('common');
  const { currentLanguage, saveLanguagePreference, loading } = useLanguagePreference();
  const { toast } = useToast();

  const handleLanguageChange = async (langCode: string) => {
    if (loading || langCode === currentLanguage) return;

    const success = await saveLanguagePreference(langCode);
    const langName = languages.find(l => l.code === langCode)?.name ?? langCode;

    if (success) {
      toast({
        title: t('languageSwitcher.toast.changedTitle', 'Language changed'),
        description: t('languageSwitcher.toast.changedDescription', {
          defaultValue: 'Switched to {{language}}',
          language: langName,
        }),
      });
    } else {
      toast({
        title: t('languageSwitcher.toast.errorTitle', 'Error'),
        description: t('languageSwitcher.toast.errorDescription', 'Failed to change language'),
        variant: 'destructive',
      });
    }
  };

  const current = languages.find(l => l.code === currentLanguage) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          disabled={loading}
          aria-label={t('languageSwitcher.trigger', 'Change language')}
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{current.flag} {current.code.toUpperCase()}</span>
          <span className="sm:hidden">{current.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 max-h-96 overflow-y-auto">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={currentLanguage === language.code ? 'bg-accent' : ''}
          >
            <span className="mr-2">{language.flag}</span>
            <span>{language.name}</span>
            {currentLanguage === language.code && (
              <span className="ml-auto text-primary" aria-label={t('languageSwitcher.selected', 'Selected')}>✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
