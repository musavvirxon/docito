import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerification?: boolean;
}

// Admin roles that can access protected admin routes
const ADMIN_ROLES = ['admin', 'clinic_admin', 'super_admin'];

const ProtectedRoute = ({ children, requireVerification = false }: ProtectedRouteProps) => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;

      // Not authenticated
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user has admin role
      const userRole = profile?.role;
      const isAdmin = userRole && ADMIN_ROLES.includes(userRole);
      
      if (!isAdmin) {
        navigate('/auth');
        return;
      }

      // Verification gate
      if (requireVerification) {
        const { data: practice, error } = await supabase
          .from('practices')
          .select('verification_status')
          .eq('admin_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('ProtectedRoute practice check error:', error);
          navigate('/dashboard/verify');
          return;
        }

        if (!practice) {
          navigate('/dashboard/verify');
          return;
        }

        if (practice.verification_status !== 'verified') {
          navigate('/dashboard/verify');
          return;
        }
      }
    };

    void checkAccess();
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
