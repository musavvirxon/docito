import React, { useRef, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, MoreVertical, Phone, Video, User, Loader2, Lock } from 'lucide-react';
import { Message, Conversation } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  isLocked?: boolean;
}

const MessageThread: React.FC<MessageThreadProps> = ({
  conversation,
  messages,
  loading,
  onSendMessage,
  isLocked = false,
}) => {
  const { user } = useAuth();
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!input.trim() || sending || isLocked) return;

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

  const handleFileSelect = () => {
    if (isLocked) return;
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || isLocked) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Create message row first to get message_id
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: file.name,
          message_type: 'file',
        } as any)
        .select()
        .single();

      if (messageError) throw messageError;

      const messageId = messageData.id;
      setUploadProgress(25);

      // Step 2: Upload file to storage with correct path convention
      const filePath = `attachments/${conversation.id}/${messageId}/${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // Rollback: delete the orphan message
        await supabase.from('messages').delete().eq('id', messageId);
        throw uploadError;
      }

      setUploadProgress(75);

      // Step 3: Insert attachment record
      const { error: attachmentError } = await supabase
        .from('message_attachments')
        .insert({
          message_id: messageId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        } as any);

      if (attachmentError) {
        // Rollback: delete storage object and message
        await supabase.storage.from('message-attachments').remove([filePath]);
        await supabase.from('messages').delete().eq('id', messageId);
        throw attachmentError;
      }

      setUploadProgress(100);
      toast.success('File uploaded successfully');

      // Refresh messages - trigger will be handled by parent
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
                          {msg.content && msg.content !== attachments[0]?.file_name && (
                            <p className="text-sm">{msg.content}</p>
                          )}
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
        {isLocked ? (
          <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span className="text-sm">This conversation is locked</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleFileSelect}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </Button>
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              disabled={uploading}
            />
            <Button onClick={handleSend} disabled={!input.trim() || sending || uploading}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {uploading && uploadProgress > 0 && (
          <div className="mt-2">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageThread;
