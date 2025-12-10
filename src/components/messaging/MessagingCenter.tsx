import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useMessaging, useConversationMessages, Conversation } from '@/hooks/useMessaging';
import ConversationList from './ConversationList';
import MessageThread from './MessageThread';
import NewChatDialog from './NewChatDialog';

const MessagingCenter: React.FC = () => {
  const {
    conversations,
    loading: conversationsLoading,
    getOrCreateDirectConversation,
    createGroupConversation,
  } = useMessaging();

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);

  const {
    messages,
    loading: messagesLoading,
    sendMessage,
  } = useConversationMessages(selectedConversation?.id || null);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
  };

  const handleCreateDirect = async (userId: string) => {
    const conv = await getOrCreateDirectConversation(userId);
    if (conv) {
      // Find the full conversation with participants
      const fullConv = conversations.find(c => c.id === conv.id) || conv;
      setSelectedConversation(fullConv as Conversation);
    }
  };

  const handleCreateGroup = async (name: string, userIds: string[]) => {
    const conv = await createGroupConversation(name, userIds);
    if (conv) {
      setSelectedConversation(conv as Conversation);
    }
  };

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
      <div className="flex-1 border-l border-border">
        {selectedConversation ? (
          <MessageThread
            conversation={selectedConversation}
            messages={messages}
            loading={messagesLoading}
            onSendMessage={sendMessage}
          />
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
