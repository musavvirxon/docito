import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Video, 
  Calendar, 
  Search, 
  Plus,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useVideoConsultation, VideoConsultation } from '@/hooks/useVideoConsultation';
import VideoConsultationCard from './VideoConsultationCard';
import { isToday, isFuture, isPast, parseISO } from 'date-fns';

interface VideoConsultationListProps {
  userRole: 'doctor' | 'patient';
  userId: string;
  doctorId?: string;
  onJoinConsultation: (consultation: VideoConsultation) => void;
  onScheduleNew?: () => void;
  getOtherPartyName: (consultation: VideoConsultation) => string;
  getOtherPartyAvatar?: (consultation: VideoConsultation) => string | undefined;
}

const VideoConsultationList: React.FC<VideoConsultationListProps> = ({
  userRole,
  userId,
  doctorId,
  onJoinConsultation,
  onScheduleNew,
  getOtherPartyName,
  getOtherPartyAvatar,
}) => {
  const { consultations, isLoading, fetchConsultations, updateConsultationStatus } = useVideoConsultation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    const filters = userRole === 'doctor' && doctorId
      ? { doctor_id: doctorId }
      : { patient_id: userId };
    fetchConsultations(filters);
  }, [userRole, userId, doctorId, fetchConsultations]);

  const handleCancel = async (consultation: VideoConsultation) => {
    await updateConsultationStatus(consultation.id, 'cancelled');
  };

  const filterConsultations = (list: VideoConsultation[], tab: string) => {
    let filtered = list;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        getOtherPartyName(c).toLowerCase().includes(query) ||
        c.notes?.toLowerCase().includes(query)
      );
    }

    // Apply tab filter
    switch (tab) {
      case 'today':
        return filtered.filter(c => 
          isToday(parseISO(c.scheduled_start)) &&
          !['completed', 'cancelled', 'no_show'].includes(c.status)
        );
      case 'upcoming':
        return filtered.filter(c => 
          (isFuture(parseISO(c.scheduled_start)) || isToday(parseISO(c.scheduled_start))) &&
          !['completed', 'cancelled', 'no_show'].includes(c.status)
        );
      case 'past':
        return filtered.filter(c => 
          ['completed', 'cancelled', 'no_show'].includes(c.status) ||
          isPast(parseISO(c.scheduled_end))
        );
      default:
        return filtered;
    }
  };

  const todayCount = filterConsultations(consultations, 'today').length;
  const upcomingCount = filterConsultations(consultations, 'upcoming').length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Consultations
          </CardTitle>
          {onScheduleNew && userRole === 'doctor' && (
            <Button onClick={onScheduleNew} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Schedule New
            </Button>
          )}
        </div>
        
        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search consultations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="today" className="flex-1 gap-1">
              <Clock className="h-3 w-3" />
              Today
              {todayCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {todayCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex-1 gap-1">
              <Calendar className="h-3 w-3" />
              Upcoming
              {upcomingCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {upcomingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1 gap-1">
              <CheckCircle className="h-3 w-3" />
              Past
            </TabsTrigger>
          </TabsList>

          {['today', 'upcoming', 'past'].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filterConsultations(consultations, tab).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Video className="h-8 w-8 mb-2 opacity-50" />
                    <p>No {tab} consultations</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filterConsultations(consultations, tab).map((consultation) => (
                      <VideoConsultationCard
                        key={consultation.id}
                        consultation={consultation}
                        otherPartyName={getOtherPartyName(consultation)}
                        otherPartyAvatar={getOtherPartyAvatar?.(consultation)}
                        userRole={userRole}
                        onJoin={onJoinConsultation}
                        onCancel={tab !== 'past' ? handleCancel : undefined}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default VideoConsultationList;
