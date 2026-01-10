import React, { useState, lazy, Suspense, memo, useMemo } from 'react';
import { MessageSquare, Lock, Plus } from 'lucide-react';
import { useHealthcareMessaging, useConversationMessages, HealthcareConversation, MessageFilter } from '@/hooks/useHealthcareMessaging';
import MessageFilters from './MessageFilters';
import ConversationContextPanel from './ConversationContextPanel';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Lazy load heavy components
const HealthcareConversationList = lazy(() => import('./HealthcareConversationList'));
const HealthcareMessageThread = lazy(() => import('./HealthcareMessageThread'));
const HealthcareNewChatDialog = lazy(() => import('./HealthcareNewChatDialog'));

// Skeleton loader for conversations
const ConversationSkeleton = memo(() => (
  <div className="p-4 space-y-3">
    {[1, 2, 3].map(i => (
      <div key={i} className="flex items-center gap-3 animate-pulse">
        <div className="w-12 h-12 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-3 w-32 bg-muted rounded" />
        </div>
      </div>
    ))}
  </div>
));

ConversationSkeleton.displayName = 'ConversationSkeleton';

interface HealthcareMessagingCenterProps {
  userRole?: string;
  className?: string;
}

const HealthcareMessagingCenter: React.FC<HealthcareMessagingCenterProps> = ({
  userRole = 'patient',
  className,
}) => {
  const [selectedConversation, setSelectedConversation] = useState<HealthcareConversation | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MessageFilter>('all');
  const [showContextPanel, setShowContextPanel] = useState(true);

  const {
    conversations,
    loading: conversationsLoading,
    canMessageUser,
  } = useHealthcareMessaging(activeFilter);

  const {
    messages,
    loading: messagesLoading,
    sendMessage,
  } = useConversationMessages(selectedConversation?.id || null);

  // Memoize filtered conversations
  const filteredConversations = useMemo(() => conversations, [conversations]);

  const handleSelectConversation = (conv: HealthcareConversation) => {
    setSelectedConversation(conv);
  };

  const handleSendMessage = async (content: string) => {
    if (selectedConversation?.is_locked) {
      return null;
    }
    return sendMessage(content);
  };

  const totalUnread = useMemo(() => 
    conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [conversations]
  );

  return (
    <div className={cn(
      "h-[calc(100vh-200px)] min-h-[500px] flex rounded-lg border border-border overflow-hidden bg-card",
      className
    )}>
      {/* Left Panel - Filters + Conversation List */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-border">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Messages</h2>
          <Button size="sm" variant="outline" onClick={() => setShowNewChat(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
        <div className="p-3 border-b border-border">
          <MessageFilters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            unreadCount={totalUnread}
          />
        </div>
        
        <Suspense fallback={<ConversationSkeleton />}>
          <HealthcareConversationList
            conversations={filteredConversations}
            selectedId={selectedConversation?.id || null}
            onSelect={handleSelectConversation}
            loading={conversationsLoading}
          />
        </Suspense>
      </div>

      {/* Center Panel - Message Thread */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {selectedConversation.is_locked && (
              <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>This conversation is locked: {selectedConversation.locked_reason || 'Referral completed'}</span>
              </div>
            )}
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="animate-pulse">Loading messages...</div></div>}>
              <HealthcareMessageThread
                conversation={selectedConversation}
                messages={messages}
                loading={messagesLoading}
                onSendMessage={handleSendMessage}
                isLocked={selectedConversation.is_locked || false}
              />
            </Suspense>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium">Select a conversation</h3>
              <p className="text-sm mt-1">
                Choose from your existing conversations
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Context Panel */}
      {selectedConversation && showContextPanel && (
        <div className="w-72 flex-shrink-0 border-l border-border">
          <ConversationContextPanel
            conversation={selectedConversation}
          />
        </div>
      )}

      {/* New Chat Dialog */}
      <Suspense fallback={null}>
        <HealthcareNewChatDialog
          open={showNewChat}
          onClose={() => setShowNewChat(false)}
          canMessageUser={canMessageUser}
        />
      </Suspense>
    </div>
  );
};

export default memo(HealthcareMessagingCenter);
