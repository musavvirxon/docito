import { BYPASS_VALIDATION, MOCK_USER } from '@/config/devConfig';
import { useToast } from '@/hooks/use-toast';

export const useDevMode = () => {
  const { toast } = useToast();

  const isDevMode = () => {
    return BYPASS_VALIDATION || 
           window.location.hostname.includes('localhost') || 
           window.location.hostname.includes('127.0.0.1');
  };

  const skipValidation = (validationFn?: () => boolean) => {
    if (isDevMode()) {
      return true;
    }
    return validationFn ? validationFn() : false;
  };

  const bypassAuth = (user: any) => {
    if (isDevMode() && !user) {
      return MOCK_USER;
    }
    return user;
  };

  const showDevToast = (message: string) => {
    if (isDevMode()) {
      toast({
        title: "🚧 Dev Mode",
        description: message,
        duration: 2000,
      });
    }
  };

  return {
    isDevMode: isDevMode(),
    skipValidation,
    bypassAuth,
    showDevToast,
    mockUser: MOCK_USER
  };
};