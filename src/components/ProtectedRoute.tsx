import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useVerificationStatus } from '@/hooks/useVerificationStatus';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerification?: boolean;
}

const ProtectedRoute = ({ children, requireVerification = false }: ProtectedRouteProps) => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;

      // Check if user is authenticated
      if (!user) {
        navigate('/auth');
        return;
      }

      // SECURITY: Check role (backend secured with user_roles table & RLS)
      if (profile?.role !== 'admin') {
        navigate('/dashboard');
        return;
      }

      // If verification is required, check practice verification status
      if (requireVerification) {
        const { data: practice } = await supabase
          .from('practices')
          .select('verification_status')
          .eq('admin_id', user.id)
          .single();

        if (practice?.verification_status !== 'verified') {
          navigate('/dashboard/verify');
          return;
        }
      }
    };

    checkAccess();
  }, [user, profile, authLoading, requireVerification, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
