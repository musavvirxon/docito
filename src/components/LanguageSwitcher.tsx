import { Globe } from 'lucide-react';
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
  const { currentLanguage, saveLanguagePreference, loading } = useLanguagePreference();
  const { toast } = useToast();

  const handleLanguageChange = async (langCode: string) => {
    if (loading || langCode === currentLanguage) return;

    const success = await saveLanguagePreference(langCode);

    if (success) {
      toast({
        title: 'Language changed',
        description: `Switched to ${languages.find(l => l.code === langCode)?.name}`,
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to change language',
        variant: 'destructive',
      });
    }
  };

  const current = languages.find(l => l.code === currentLanguage) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" disabled={loading}>
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
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};