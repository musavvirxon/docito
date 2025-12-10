import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  MessageSquare,
  Settings,
  Maximize,
  Minimize,
  Users,
} from 'lucide-react';
import { VideoConsultation } from '@/hooks/useVideoConsultation';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface VideoRoomProps {
  consultation: VideoConsultation;
  userName: string;
  userRole: 'doctor' | 'patient';
  onEnd: (notes?: string) => void;
  onLeave: () => void;
}

const VideoRoom: React.FC<VideoRoomProps> = ({
  consultation,
  userName,
  userRole,
  onEnd,
  onLeave,
}) => {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(consultation.notes || '');
  const [participantCount, setParticipantCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadJitsiScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Jitsi'));
        document.body.appendChild(script);
      });
    };

    const initJitsi = async () => {
      try {
        await loadJitsiScript();

        if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) return;

        const domain = 'meet.jit.si';
        const options = {
          roomName: consultation.room_id,
          parentNode: jitsiContainerRef.current,
          userInfo: {
            displayName: userName,
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableClosePage: false,
            enableWelcomePage: false,
            toolbarButtons: [],
            hideConferenceSubject: true,
            hideConferenceTimer: false,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: '',
            SHOW_POWERED_BY: false,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            FILM_STRIP_MAX_HEIGHT: 120,
            MOBILE_APP_PROMO: false,
            HIDE_INVITE_MORE_HEADER: true,
          },
        };

        apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

        apiRef.current.addListener('videoConferenceJoined', () => {
          setIsLoading(false);
        });

        apiRef.current.addListener('participantJoined', () => {
          setParticipantCount(prev => prev + 1);
        });

        apiRef.current.addListener('participantLeft', () => {
          setParticipantCount(prev => Math.max(1, prev - 1));
        });

        apiRef.current.addListener('audioMuteStatusChanged', ({ muted }: { muted: boolean }) => {
          setIsAudioMuted(muted);
        });

        apiRef.current.addListener('videoMuteStatusChanged', ({ muted }: { muted: boolean }) => {
          setIsVideoMuted(muted);
        });

        apiRef.current.addListener('readyToClose', () => {
          onLeave();
        });

      } catch (error) {
        console.error('Error initializing Jitsi:', error);
        setIsLoading(false);
      }
    };

    initJitsi();

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
      }
    };
  }, [consultation.room_id, userName, onLeave]);

  const toggleAudio = () => {
    apiRef.current?.executeCommand('toggleAudio');
  };

  const toggleVideo = () => {
    apiRef.current?.executeCommand('toggleVideo');
  };

  const toggleScreenShare = () => {
    apiRef.current?.executeCommand('toggleShareScreen');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      jitsiContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleEndCall = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
    }
    onEnd(notes);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Badge variant={consultation.status === 'in_progress' ? 'default' : 'secondary'}>
            {consultation.status === 'in_progress' ? 'Live' : consultation.status}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Room: {consultation.room_id}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {participantCount}
          </Badge>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Connecting to video room...</p>
            </div>
          </div>
        )}
        <div
          ref={jitsiContainerRef}
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        />

        {/* Notes Panel */}
        {showNotes && userRole === 'doctor' && (
          <div className="absolute right-4 top-4 w-80 z-20">
            <Card className="p-4 bg-card/95 backdrop-blur">
              <h4 className="font-medium mb-2">Consultation Notes</h4>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this consultation..."
                className="min-h-[120px] resize-none"
              />
            </Card>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button
            variant={isAudioMuted ? 'destructive' : 'secondary'}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full h-14 w-14"
          >
            {isAudioMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          <Button
            variant={isVideoMuted ? 'destructive' : 'secondary'}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full h-14 w-14"
          >
            {isVideoMuted ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={toggleScreenShare}
            className="rounded-full h-14 w-14"
          >
            <Monitor className="h-6 w-6" />
          </Button>

          {userRole === 'doctor' && (
            <Button
              variant={showNotes ? 'default' : 'secondary'}
              size="lg"
              onClick={() => setShowNotes(!showNotes)}
              className="rounded-full h-14 w-14"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          )}

          <Button
            variant="secondary"
            size="lg"
            onClick={toggleFullscreen}
            className="rounded-full h-14 w-14"
          >
            {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={handleEndCall}
            className="rounded-full h-14 w-14 ml-4"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoRoom;
