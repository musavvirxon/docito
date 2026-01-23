import React, { useEffect, useRef, useState } from "react";
import { Lock, MessageSquare } from "lucide-react";
import { useMessaging, useConversationMessages, Conversation } from "@/hooks/useMessaging";
import ConversationList from "./ConversationList";
import MessageThread from "./MessageThread";
import NewChatDialog from "./NewChatDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MessagingCenterProps {
  initialConversationId?: string | null;
  initialRecipientUserId?: string | null;
  onConversationChange?: (conversationId: string | null) => void;
}

const MessagingCenter: React.FC<MessagingCenterProps> = ({
  initialConversationId,
  initialRecipientUserId,
  onConversationChange,
}) => {
  const { user } = useAuth();
  const {
    conversations,
    loading: conversationsLoading,
    getOrCreateDirectConversation,
    createGroupConversation,
    fetchConversations,
  } = useMessaging();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);

  const { messages, loading: messagesLoading, sendMessage, fetchMessages } = useConversationMessages(
    selectedConversation?.id || null
  );

  const didHandleInitialRecipient = useRef(false);

  const fetchConversationById = async (conversationId: string) => {
    try {
      const { data: conv, error } = await supabase
        .from("conversations")
        .select(
          `
          *,
          conversation_participants!inner (
            *,
            profiles:user_id (
              full_name,
              avatar_url
            )
          )
        `
        )
        .eq("id", conversationId)
        .single();

      if (error) throw error;

      if (conv) {
        const formattedConv: Conversation = {
          ...(conv as any),
          participants:
            (conv as any).conversation_participants?.map((p: any) => ({
              ...p,
              user: p.profiles,
            })) || [],
        };
        setSelectedConversation(formattedConv);
        fetchConversations();
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
    }
  };

  // Handle initial conversation ID from URL
  useEffect(() => {
    if (!initialConversationId) return;
    if (conversationsLoading) return;

    const conv = conversations.find((c) => c.id === initialConversationId);
    if (conv) {
      setSelectedConversation(conv);
      return;
    }

    fetchConversationById(initialConversationId);
  }, [initialConversationId, conversations, conversationsLoading]);

  // Handle initial recipient param: create/open a direct conversation
  useEffect(() => {
    if (!initialRecipientUserId) return;
    if (!user?.id) return;
    if (conversationsLoading) return;
    if (didHandleInitialRecipient.current) return;

    didHandleInitialRecipient.current = true;

    (async () => {
      const conv = await getOrCreateDirectConversation(initialRecipientUserId);
      if (!conv) return;

      const fullConv = conversations.find((c) => c.id === conv.id) || (conv as any);
      setSelectedConversation(fullConv as Conversation);
      onConversationChange?.(conv.id);
    })();
  }, [
    initialRecipientUserId,
    user?.id,
    conversationsLoading,
    getOrCreateDirectConversation,
    conversations,
    onConversationChange,
  ]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!selectedConversation?.id || !user?.id) return;

    const channel = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id, user?.id, fetchMessages]);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    onConversationChange?.(conv.id);
  };

  const handleCreateDirect = async (userId: string) => {
    const conv = await getOrCreateDirectConversation(userId);
    if (!conv) return;

    const fullConv = conversations.find((c) => c.id === conv.id) || (conv as any);
    setSelectedConversation(fullConv as Conversation);
    onConversationChange?.(conv.id);
  };

  const handleCreateGroup = async (name: string, userIds: string[]) => {
    const conv = await createGroupConversation(name, userIds);
    if (!conv) return;

    setSelectedConversation(conv as Conversation);
    onConversationChange?.(conv.id);
  };

  const isLocked = (selectedConversation as any)?.is_locked === true;
  const lockedReason = (selectedConversation as any)?.locked_reason;

  return (
    <div className="h-[calc(100vh-200px)] min-h-[500px] flex rounded-lg border border-border overflow-hidden bg-card">
      {/* Conversation List */}
      <div className="w-80 flex-shrink-0">
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversation?.id || null}
          onSelect={handleSelectConversation}
          onNewChat={() => setShowNewChat(true)}
          loading={conversationsLoading}
        />
      </div>

      {/* Message Thread */}
      <div className="flex-1 border-l border-border flex flex-col">
        {selectedConversation ? (
          <>
            {isLocked && (
              <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>
                  This conversation is locked. {lockedReason || "Messages cannot be sent."}
                </span>
              </div>
            )}
            <div className="flex-1">
              <MessageThread
                conversation={selectedConversation}
                messages={messages}
                loading={messagesLoading}
                onSendMessage={sendMessage}
                isLocked={isLocked}
              />
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium">Select a conversation</h3>
              <p className="text-sm mt-1">
                Choose from your existing conversations or start a new one
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Dialog */}
      <NewChatDialog
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        onCreateDirect={handleCreateDirect}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
};

export default MessagingCenter;
