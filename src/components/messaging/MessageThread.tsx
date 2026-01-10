import React, { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, User } from 'lucide-react';
import { Message, Conversation } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import MessageAttachmentPreview from './MessageAttachmentPreview';

interface MessageThreadProps {
  conversation: Conversation;
  messages: Message[];
  loading?: boolean;
  onSendMessage: (content: string) => Promise<any>;
}

const MessageThread: React.FC<MessageThreadProps> = ({
  conversation,
  messages,
  loading,
  onSendMessage,
}) => {
  const { user } = useAuth();
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getConversationName = () => {
    if (conversation.name) return conversation.name;
    if (conversation.type === 'direct' && conversation.participants) {
      const otherParticipant = conversation.participants.find((p: any) => p.user_id !== user?.id);
      return otherParticipant?.user?.full_name || 'Unknown User';
    }
    return 'Group Chat';
  };

  const getOtherParticipant = () => {
    if (conversation.type === 'direct' && conversation.participants) {
      return conversation.participants.find((p: any) => p.user_id !== user?.id);
    }
    return null;
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    setSending(true);
    try {
      await onSendMessage(input);
      setInput('');
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
            <AvatarImage src={otherParticipant?.user?.avatar_url || undefined} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{getConversationName()}</h3>
            {conversation.type === 'group' && conversation.participants && (
              <p className="text-xs text-muted-foreground">
                {conversation.participants.length} members
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Search Messages</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Block User</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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
              <p className="text-lg">No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isOwn = msg.sender_id === user?.id;
              const showAvatar =
                !isOwn && (index === 0 || messages[index - 1]?.sender_id !== msg.sender_id);

              const attachments = ((msg as any).attachments || []) as any[];

              return (
                <div key={msg.id} className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
                  {!isOwn && (
                    <div className="w-8">
                      {showAvatar && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={msg.sender?.avatar_url || undefined} />
                          <AvatarFallback>{msg.sender?.full_name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}

                  <div className={cn('max-w-[70%]', isOwn && 'items-end')}>
                    {!isOwn && showAvatar && (
                      <p className="text-xs text-muted-foreground mb-1 ml-1">
                        {msg.sender?.full_name}
                      </p>
                    )}

                    <div
                      className={cn(
                        'px-4 py-2 rounded-2xl break-words',
                        isOwn
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      )}
                    >
                      {msg.message_type === 'file' && attachments.length > 0 ? (
                        <div className="space-y-2">
                          {msg.content ? <p className="text-sm">{msg.content}</p> : null}
                          {attachments.map((att) => (
                            <MessageAttachmentPreview
                              key={att.id}
                              attachment={att}
                              isOwn={isOwn}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm">{msg.content}</p>
                      )}
                    </div>

                    <p
                      className={cn(
                        'text-xs text-muted-foreground mt-1',
                        isOwn ? 'text-right mr-1' : 'ml-1'
                      )}
                    >
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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            ref={inputRef}
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button variant="ghost" size="icon">
            <Smile className="h-4 w-4" />
          </Button>
          <Button onClick={handleSend} disabled={!input.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageThread;
