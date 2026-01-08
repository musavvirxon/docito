import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBookingAuth = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      setUser(user);
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingClick = (doctorId: string, doctorName?: string) => {
    if (!isLoggedIn) {
      toast({
        title: "Sign in required",
        description: doctorName
          ? `Complete sign-up to book with ${doctorName}`
          : "Please sign in to book an appointment",
      });

      // Redirect to the existing Auth page, preserving return destination
      const returnUrl = `/book-appointment/${doctorId}`;
      navigate(`/auth?returnTo=${encodeURIComponent(returnUrl)}`);
      return
    }

    // User is logged in, navigate directly to booking
    navigate(`/book-appointment/${doctorId}`);
  };

  return {
    isLoggedIn,
    loading,
    user,
    handleBookingClick
  };
};
