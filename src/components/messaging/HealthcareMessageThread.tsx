import React, { useRef, useEffect, memo, useCallback, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, User, Info, Lock } from 'lucide-react';
import { Message } from '@/hooks/useMessaging';
import { HealthcareConversation } from '@/hooks/useHealthcareMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import RoleBadge from './RoleBadge';
import ContextBadge from './ContextBadge';
import FileUploadButton from './FileUploadButton';
import MessageAttachmentPreview from './MessageAttachmentPreview';

interface HealthcareMessageThreadProps {
  conversation: HealthcareConversation;
  messages: Message[];
  loading?: boolean;
  onSendMessage: (content: string) => Promise<any>;
  isLocked?: boolean;
}

const HealthcareMessageThread: React.FC<HealthcareMessageThreadProps> = memo(({
  conversation,
  messages,
  loading,
  onSendMessage,
  isLocked = false,
}) => {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getConversationName = useCallback(() => {
    if (conversation.name) return conversation.name;
    if (conversation.type === 'direct' && conversation.participants) {
      const otherParticipant = conversation.participants.find(p => p.user_id !== user?.id);
      return otherParticipant?.profile?.full_name || 'Unknown User';
    }
    return 'Group Chat';
  }, [conversation, user?.id]);

  const getOtherParticipant = useCallback(() => {
    if (conversation.type === 'direct' && conversation.participants) {
      return conversation.participants.find(p => p.user_id !== user?.id);
    }
    return null;
  }, [conversation, user?.id]);

  const formatMessageDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  }, []);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending || isLocked) return;
    
    setSending(true);
    try {
      await onSendMessage(input);
      setInput('');
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  }, [input, sending, isLocked, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleFileUpload = useCallback(async (file: File) => {
    // File upload handled via the hook
    console.log('File to upload:', file.name);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const otherParticipant = getOtherParticipant();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherParticipant?.profile?.avatar_url || undefined} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{getConversationName()}</h3>
              {conversation.context_type && conversation.context_type !== 'general' && (
                <ContextBadge contextType={conversation.context_type} size="sm" />
              )}
            </div>
            {conversation.type === 'group' && conversation.participants && (
              <p className="text-xs text-muted-foreground">
                {conversation.participants.length} participants
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn('flex gap-3', i % 2 === 0 && 'flex-row-reverse')}>
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                <div className={cn('space-y-1', i % 2 === 0 && 'items-end')}>
                  <div className="h-16 w-48 bg-muted rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start the conversation</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isOwn = msg.sender_id === user?.id;
              const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender_id !== msg.sender_id);
              const isSystemMessage = msg.message_type === 'system';
              
              if (isSystemMessage) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="px-3 py-1.5 bg-muted/50 rounded-full text-xs text-muted-foreground">
                      {msg.content}
                    </div>
                  </div>
                );
              }
              
              return (
                <div
                  key={msg.id}
                  className={cn('flex gap-3', isOwn && 'flex-row-reverse')}
                >
                  {!isOwn && (
                    <div className="w-8 flex-shrink-0">
                      {showAvatar && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={msg.sender?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {msg.sender?.full_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}
                  <div className={cn('max-w-[70%]', isOwn && 'items-end')}>
                    {!isOwn && showAvatar && (
                      <div className="flex items-center gap-2 mb-1 ml-1">
                        <span className="text-xs font-medium">{msg.sender?.full_name}</span>
                        <RoleBadge role="provider" size="sm" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'px-4 py-2.5 rounded-2xl break-words',
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      )}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                    <p className={cn(
                      'text-xs text-muted-foreground mt-1',
                      isOwn ? 'text-right mr-1' : 'ml-1'
                    )}>
                      {formatMessageDate(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        {isLocked ? (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>This conversation is locked and cannot receive new messages</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <FileUploadButton onUpload={handleFileUpload} />
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!input.trim() || sending} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});

HealthcareMessageThread.displayName = 'HealthcareMessageThread';

export default HealthcareMessageThread;
