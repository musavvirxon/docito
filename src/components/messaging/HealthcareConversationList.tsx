import React, { memo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Users, User, Lock } from 'lucide-react';
import { HealthcareConversation } from '@/hooks/useHealthcareMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import ContextBadge, { ContextType } from './ContextBadge';

interface HealthcareConversationListProps {
  conversations: HealthcareConversation[];
  selectedId: string | null;
  onSelect: (conversation: HealthcareConversation) => void;
  loading?: boolean;
}

const HealthcareConversationList: React.FC<HealthcareConversationListProps> = memo(({
  conversations,
  selectedId,
  onSelect,
  loading,
}) => {
  const { user } = useAuth();
  const [search, setSearch] = React.useState('');

  const getConversationName = (conv: HealthcareConversation) => {
    // For direct conversations, always prefer the other participant's name
    if (conv.type === 'direct' && conv.participants) {
      const otherParticipant = conv.participants.find(p => p.user_id !== user?.id);
      const participantName = otherParticipant?.profile?.full_name;
      if (participantName) return participantName;
    }
    if (conv.name) return conv.name;
    return conv.type === 'group' ? 'Group Chat' : 'Unknown User';
  };

  const getConversationAvatar = (conv: HealthcareConversation) => {
    if (conv.type === 'direct' && conv.participants) {
      const otherParticipant = conv.participants.find(p => p.user_id !== user?.id);
      return otherParticipant?.profile?.avatar_url;
    }
    return null;
  };

  const filteredConversations = React.useMemo(() => 
    conversations.filter(conv => {
      const name = getConversationName(conv).toLowerCase();
      return name.includes(search.toLowerCase());
    }),
    [conversations, search, user?.id]
  );

  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-3">
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
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={cn(
                  'w-full p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left',
                  selectedId === conv.id && 'bg-accent'
                )}
              >
                <div className="relative">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={getConversationAvatar(conv) || undefined} />
                    <AvatarFallback className="text-xs">
                      {conv.type === 'group' ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {conv.is_locked && (
                    <div className="absolute -bottom-1 -right-1 bg-muted rounded-full p-0.5">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate text-sm">
                      {getConversationName(conv)}
                    </span>
                    {conv.last_message_at && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {conv.context_type && conv.context_type !== 'general' && (
                      <ContextBadge contextType={conv.context_type as ContextType} size="sm" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.last_message?.content || 'No messages yet'}
                    </p>
                    {(conv.unread_count || 0) > 0 && (
                      <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-xs">
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
});

HealthcareConversationList.displayName = 'HealthcareConversationList';

export default HealthcareConversationList;
