import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Users, User } from 'lucide-react';
import { Conversation } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  onNewChat: () => void;
  loading?: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelect,
  onNewChat,
  loading,
}) => {
  const { user } = useAuth();
  const [search, setSearch] = React.useState('');

  const getConversationName = (conv: Conversation) => {
    // For direct conversations, always prefer the other participant's name
    if (conv.type === 'direct' && conv.participants) {
      const otherParticipant = conv.participants.find(p => p.user_id !== user?.id);
      const participantName = otherParticipant?.user?.full_name;
      if (participantName) return participantName;
    }
    if (conv.name) return conv.name;
    return conv.type === 'group' ? 'Group Chat' : 'Unknown User';
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.type === 'direct' && conv.participants) {
      const otherParticipant = conv.participants.find(p => p.user_id !== user?.id);
      return otherParticipant?.user?.avatar_url;
    }
    return null;
  };

  const filteredConversations = conversations.filter(conv => {
    const name = getConversationName(conv).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full border-r border-border">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Messages</h2>
          <Button size="sm" onClick={onNewChat}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
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
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No conversations yet</p>
            <Button variant="link" onClick={onNewChat} className="mt-2">
              Start a new chat
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={cn(
                  'w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left',
                  selectedId === conv.id && 'bg-accent'
                )}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={getConversationAvatar(conv) || undefined} />
                  <AvatarFallback>
                    {conv.type === 'group' ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">
                      {getConversationName(conv)}
                    </span>
                    {conv.last_message_at && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.last_message?.content || 'No messages yet'}
                    </p>
                    {(conv.unread_count || 0) > 0 && (
                      <Badge variant="default" className="h-5 min-w-[20px] px-1.5">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
