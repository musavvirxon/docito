import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Inbox } from 'lucide-react';
import { ReferralCard } from './ReferralCard';
import type { Referral } from '@/hooks/useReferrals';

interface ReferralListProps {
  referrals: Referral[];
  loading: boolean;
  role: 'referrer' | 'receiver' | 'patient';
  onAccept?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onViewDetails?: (referral: Referral) => void;
  onBookSlot?: (referral: Referral) => void;
  onPublishSlots?: (referral: Referral) => void;
  onComplete?: (id: string) => void;
  showTabs?: boolean;
}

export const ReferralList = ({
  referrals,
  loading,
  role,
  onAccept,
  onReject,
  onViewDetails,
  onBookSlot,
  onPublishSlots,
  onComplete,
  showTabs = true
}: ReferralListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  // Filter referrals based on search and filters
  const filteredReferrals = referrals.filter(referral => {
    // Search filter
    const searchMatch = !searchTerm || 
      referral.referral_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      referral.patient?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

    // Priority filter
    const priorityMatch = priorityFilter === 'all' || referral.priority === priorityFilter;

    // Tab filter
    let tabMatch = true;
    if (activeTab === 'pending') {
      tabMatch = ['draft', 'sent'].includes(referral.status);
    } else if (activeTab === 'active') {
      tabMatch = ['accepted', 'slots_available', 'booked', 'in_progress'].includes(referral.status);
    } else if (activeTab === 'completed') {
      tabMatch = referral.status === 'completed';
    } else if (activeTab === 'declined') {
      tabMatch = ['rejected', 'cancelled', 'expired'].includes(referral.status);
    }

    return searchMatch && priorityMatch && tabMatch;
  });

  // Count referrals by status group
  const counts = {
    all: referrals.length,
    pending: referrals.filter(r => ['draft', 'sent'].includes(r.status)).length,
    active: referrals.filter(r => ['accepted', 'slots_available', 'booked', 'in_progress'].includes(r.status)).length,
    completed: referrals.filter(r => r.status === 'completed').length,
    declined: referrals.filter(r => ['rejected', 'cancelled', 'expired'].includes(r.status)).length
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search referrals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="routine">Routine</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="stat">STAT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showTabs ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">
              Pending ({counts.pending})
            </TabsTrigger>
            <TabsTrigger value="active" className="text-xs sm:text-sm">
              Active ({counts.active})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm">
              Completed ({counts.completed})
            </TabsTrigger>
            <TabsTrigger value="declined" className="text-xs sm:text-sm">
              Declined ({counts.declined})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <ReferralListContent
              referrals={filteredReferrals}
              role={role}
              onAccept={onAccept}
              onReject={onReject}
              onViewDetails={onViewDetails}
              onBookSlot={onBookSlot}
              onPublishSlots={onPublishSlots}
              onComplete={onComplete}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <ReferralListContent
          referrals={filteredReferrals}
          role={role}
          onAccept={onAccept}
          onReject={onReject}
          onViewDetails={onViewDetails}
          onBookSlot={onBookSlot}
          onPublishSlots={onPublishSlots}
          onComplete={onComplete}
        />
      )}
    </div>
  );
};

// Separate component for the list content
const ReferralListContent = ({
  referrals,
  role,
  onAccept,
  onReject,
  onViewDetails,
  onBookSlot,
  onPublishSlots,
  onComplete
}: Omit<ReferralListProps, 'loading' | 'showTabs'>) => {
  if (referrals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="font-medium text-lg">No referrals found</h3>
        <p className="text-muted-foreground text-sm mt-1">
          {role === 'referrer' 
            ? 'Create a new referral to get started'
            : role === 'receiver'
            ? 'You have no pending referrals'
            : 'No referrals have been made for you yet'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {referrals.map(referral => (
        <ReferralCard
          key={referral.id}
          referral={referral}
          role={role}
          onAccept={onAccept}
          onReject={onReject}
          onViewDetails={onViewDetails}
          onBookSlot={onBookSlot}
          onPublishSlots={onPublishSlots}
          onComplete={onComplete}
        />
      ))}
    </div>
  );
};
