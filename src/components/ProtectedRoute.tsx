import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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

      // Not authenticated
      if (!user) {
        navigate('/auth');
        return;
      }

      // If this route is meant for admin-only content
      if (profile?.role !== 'admin' && profile?.role !== 'clinic_admin') {
        // IMPORTANT: don't navigate to '/dashboard' if you don't have that route
        // Send them to Auth role redirect instead:
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

        // If RLS blocks or another error occurs, don't crash -> send to verify/setup
        if (error) {
          console.error('ProtectedRoute practice check error:', error);
          navigate('/dashboard/verify');
          return;
        }

        // If admin has no practice yet -> go to verify/setup page (no crash)
        if (!practice) {
          navigate('/dashboard/verify');
          return;
        }

        // If not verified -> go verify page
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
