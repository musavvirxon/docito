import React, { useEffect, useState } from 'react';
import { MessagingCenter } from '@/components/messaging';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Messages: React.FC = () => {
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialConversationId, setInitialConversationId] = useState<string | null>(null);

  // Extract conversation ID from URL on mount and when params change
  useEffect(() => {
    const conversationId = searchParams.get('c');
    if (conversationId) {
      setInitialConversationId(conversationId);
    }
  }, [searchParams]);

  // Callback to update URL when conversation changes
  const handleConversationChange = (conversationId: string | null) => {
    if (conversationId) {
      setSearchParams({ c: conversationId }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Communicate securely with your healthcare team
        </p>
      </div>

      <MessagingCenter 
        initialConversationId={initialConversationId}
        onConversationChange={handleConversationChange}
      />
    </div>
  );
};

export default Messages;
