import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useVerificationStatus = (practiceId?: string) => {
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!practiceId) {
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        // Check practice verification_status field
        const { data: practice, error } = await supabase
          .from('practices')
          .select('verification_status')
          .eq('id', practiceId)
          .single();

        if (error) throw error;

        const status = practice?.verification_status || 'pending';
        setVerificationStatus(status);
        setIsVerified(status === 'verified');

        // Store in localStorage to track if we've shown the modal
        const hasShownModal = localStorage.getItem(`verification_modal_shown_${practiceId}`);
        if (status === 'verified' && !hasShownModal) {
          localStorage.setItem(`verification_modal_shown_${practiceId}`, 'true');
        }
      } catch (error) {
        console.error('Error fetching verification status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Subscribe to changes
    const channel = supabase
      .channel('practice-verification-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'practices',
          filter: `id=eq.${practiceId}`,
        },
        (payload) => {
          const newStatus = payload.new?.verification_status;
          if (newStatus) {
            setVerificationStatus(newStatus);
            setIsVerified(newStatus === 'verified');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [practiceId]);

  const shouldShowModal = () => {
    if (!practiceId || !isVerified) return false;
    const hasShownModal = localStorage.getItem(`verification_modal_shown_${practiceId}`);
    return !hasShownModal;
  };

  const markModalAsShown = () => {
    if (practiceId) {
      localStorage.setItem(`verification_modal_shown_${practiceId}`, 'true');
    }
  };

  return {
    isVerified,
    verificationStatus,
    loading,
    shouldShowModal,
    markModalAsShown,
  };
};
