import { useNavigate } from 'react-router-dom';
import { DISABLE_VALIDATION } from '@/config/quickDevConfig';
import { useToast } from '@/hooks/use-toast';

export const useQuickNavigate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const quickNavigate = (path: string, message?: string) => {
    if (DISABLE_VALIDATION && message) {
      toast({
        title: "Development Mode",
        description: message,
        duration: 2000,
      });
    }
    navigate(path);
    return true;
  };

  const navigateToPatientDashboard = () => {
    return quickNavigate('/patient-dashboard', 'Navigated to patient dashboard (dev mode)');
  };

  const navigateToDoctorDashboard = () => {
    return quickNavigate('/doctor-dashboard', 'Navigated to doctor dashboard (dev mode)');
  };

  const navigateToAdminDashboard = () => {
    return quickNavigate('/admin-dashboard', 'Navigated to admin dashboard (dev mode)');
  };

  const navigateToSearchResults = (query?: string) => {
    const searchPath = query ? `/search-results?q=${encodeURIComponent(query)}` : '/search-results';
    return quickNavigate(searchPath, 'Navigated to search results (dev mode)');
  };

  return {
    quickNavigate,
    navigateToPatientDashboard,
    navigateToDoctorDashboard,
    navigateToAdminDashboard,
    navigateToSearchResults,
    isDevMode: DISABLE_VALIDATION
  };
};