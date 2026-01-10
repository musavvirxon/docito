import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Hook for handling the "Message" action across the app.
 * Uses create_direct_conversation RPC to ensure proper conversation creation.
 */
export function useMessageAction() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const startConversation = useCallback(async (targetUserId: string) => {
    if (!user) {
      // Redirect to auth with return path
      const returnPath = `/messages`;
      navigate(`/auth?redirect=${encodeURIComponent(returnPath)}`);
      return null;
    }

    if (targetUserId === user.id) {
      toast.error('You cannot message yourself');
      return null;
    }

    setLoading(true);
    try {
      const { data: conversationId, error } = await supabase.rpc(
        'create_direct_conversation' as any,
        { target_user_id: targetUserId } as any
      );

      if (error) throw error;

      // Navigate to messages with the conversation ID
      navigate(`/messages?c=${conversationId}`);
      return conversationId as string;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  return {
    startConversation,
    loading,
    isAuthenticated: !!user,
  };
}
