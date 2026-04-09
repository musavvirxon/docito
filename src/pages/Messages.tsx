import React, { useEffect, useMemo, useState } from "react";
import { MessagingCenter } from "@/components/messaging";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const Messages: React.FC = () => {
  const { t } = useTranslation('common');
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const conversationIdParam = searchParams.get("c");
  const recipientParam = searchParams.get("recipient");

  const [initialConversationId, setInitialConversationId] = useState<string | null>(null);

  const initialRecipientUserId = useMemo(() => {
    // If a conversation id is provided, we prefer it and ignore recipient
    if (conversationIdParam) return null;
    return recipientParam || null;
  }, [conversationIdParam, recipientParam]);

  useEffect(() => {
    if (conversationIdParam) {
      setInitialConversationId(conversationIdParam);
    }
  }, [conversationIdParam]);

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
        <p className="text-muted-foreground">Communicate securely with your healthcare team</p>
      </div>

      <MessagingCenter
        initialConversationId={initialConversationId}
        initialRecipientUserId={initialRecipientUserId}
        onConversationChange={handleConversationChange}
      />
    </div>
  );
};

export default Messages;
