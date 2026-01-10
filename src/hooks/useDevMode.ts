import { useToast } from '@/hooks/use-toast';

// Use build-time environment check for safety
// This ensures dev mode is ONLY active in development builds
const IS_DEV_BUILD = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const useDevMode = () => {
  const { toast } = useToast();

  // Use build-time check instead of runtime hostname checks
  // This is more secure as it cannot be manipulated at runtime
  const isDevMode = () => {
    // Only allow dev mode in development builds
    if (!IS_DEV_BUILD) {
      return false;
    }
    
    // Additional safety: only on localhost in dev builds
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1';
  };

  const skipValidation = (validationFn?: () => boolean) => {
    if (isDevMode()) {
      return true;
    }
    return validationFn ? validationFn() : false;
  };

  // REMOVED: bypassAuth function - authentication should never be bypassed
  // Even in development, use proper test accounts instead

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
    showDevToast,
    // Note: bypassAuth and mockUser have been removed for security
  };
};
