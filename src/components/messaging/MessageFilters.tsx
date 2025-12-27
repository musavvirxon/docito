import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Calendar, ArrowRightLeft, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageFilter } from '@/hooks/useHealthcareMessaging';

interface MessageFiltersProps {
  activeFilter: MessageFilter;
  onFilterChange: (filter: MessageFilter) => void;
  unreadCount?: number;
}

const filters: { value: MessageFilter; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All', icon: MessageSquare },
  { value: 'visits', label: 'Visits', icon: Calendar },
  { value: 'referrals', label: 'Referrals', icon: ArrowRightLeft },
  { value: 'unread', label: 'Unread', icon: Bell },
];

const MessageFilters: React.FC<MessageFiltersProps> = ({
  activeFilter,
  onFilterChange,
  unreadCount = 0,
}) => {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.value;
        const showBadge = filter.value === 'unread' && unreadCount > 0;

        return (
          <Button
            key={filter.value}
            variant={isActive ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onFilterChange(filter.value)}
            className={cn(
              'relative flex-1 h-8',
              isActive && 'bg-background shadow-sm'
            )}
          >
            <Icon className="h-3.5 w-3.5 mr-1.5" />
            <span className="text-xs">{filter.label}</span>
            {showBadge && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};

export default MessageFilters;
