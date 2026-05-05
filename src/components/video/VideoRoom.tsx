import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  type RemoteTrackPublication,
  type LocalTrackPublication,
  type RemoteParticipant,
  type LocalParticipant,
} from 'livekit-client';
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
  MonitorOff,
  MessageSquare,
  Maximize,
  Minimize,
  Users,
} from 'lucide-react';
import { VideoConsultation } from '@/hooks/useVideoConsultation';
import { supabase } from '@/integrations/supabase/client';

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
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(consultation.notes || '');
  const [participantCount, setParticipantCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');

  const updateParticipantCount = useCallback(() => {
    if (!roomRef.current) return;
    setParticipantCount(roomRef.current.numParticipants + 1);
  }, []);

  const handleTrackSubscribed = useCallback(
    (
      track: Track,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant,
    ) => {
      if (track.kind === Track.Kind.Video) {
        if (track.source === Track.Source.ScreenShare) {
          if (screenShareRef.current) {
            const el = track.attach();
            if (el instanceof HTMLVideoElement) {
              screenShareRef.current.srcObject = el.srcObject;
            }
          }
          setIsScreenSharing(true);
        } else {
          if (remoteVideoRef.current) {
            const el = track.attach();
            if (el instanceof HTMLVideoElement) {
              remoteVideoRef.current.srcObject = el.srcObject;
            }
          }
        }
      }
      if (track.kind === Track.Kind.Audio) {
        const audioEl = track.attach();
        document.body.appendChild(audioEl);
      }
    },
    [],
  );

  const handleTrackUnsubscribed = useCallback((track: Track) => {
    track.detach().forEach((el) => el.remove());
    if (track.source === Track.Source.ScreenShare) {
      setIsScreenSharing(false);
      if (screenShareRef.current) {
        screenShareRef.current.srcObject = null;
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;

    const connect = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          setConnectionStatus('error');
          setIsLoading(false);
          return;
        }

        const resp = await supabase.functions.invoke('livekit-token', {
          body: {
            appointmentId: consultation.appointment_id,
            roomId: consultation.room_id,
          },
        });

        if (resp.error || !resp.data?.token) {
          console.error('Failed to get LiveKit token:', resp.error);
          setConnectionStatus('error');
          setIsLoading(false);
          return;
        }

        const { token: livekitToken, url: livekitUrl } = resp.data;

        room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
        room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
        room.on(RoomEvent.ParticipantConnected, updateParticipantCount);
        room.on(RoomEvent.ParticipantDisconnected, updateParticipantCount);
        room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          if (!mounted) return;
          if (state === ConnectionState.Connected) {
            setConnectionStatus('connected');
          } else if (state === ConnectionState.Disconnected) {
            setConnectionStatus('disconnected');
          } else if (state === ConnectionState.Reconnecting) {
            setConnectionStatus('connecting');
          }
        });

        room.on(
          RoomEvent.LocalTrackPublished,
          (pub: LocalTrackPublication, _participant: LocalParticipant) => {
            if (
              pub.track?.kind === Track.Kind.Video &&
              pub.track.source === Track.Source.Camera
            ) {
              if (localVideoRef.current) {
                const el = pub.track.attach();
                if (el instanceof HTMLVideoElement) {
                  localVideoRef.current.srcObject = el.srcObject;
                }
              }
            }
          },
        );

        await room.connect(livekitUrl, livekitToken);
        await room.localParticipant.enableCameraAndMicrophone();

        if (mounted) {
          setIsLoading(false);
          setConnectionStatus('connected');
          updateParticipantCount();
        }
      } catch (err) {
        console.error('LiveKit connect error:', err);
        if (mounted) {
          setConnectionStatus('error');
          setIsLoading(false);
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      room.disconnect(true);
      roomRef.current = null;
    };
  }, [
    consultation.id,
    consultation.room_id,
    handleTrackSubscribed,
    handleTrackUnsubscribed,
    updateParticipantCount,
  ]);

  const toggleAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const enabled = room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(!enabled);
    setIsAudioMuted(enabled);
  }, []);

  const toggleVideo = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const enabled = room.localParticipant.isCameraEnabled;
    await room.localParticipant.setCameraEnabled(!enabled);
    setIsVideoMuted(enabled);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const enabled = room.localParticipant.isScreenShareEnabled;
      await room.localParticipant.setScreenShareEnabled(!enabled);
      setIsScreenSharing(!enabled);
    } catch (err) {
      console.error('Screen share error:', err);
    }
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleEndCall = useCallback(() => {
    roomRef.current?.disconnect(true);
    onEnd(notes);
  }, [notes, onEnd]);

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
            {connectionStatus === 'connected'
              ? 'Live'
              : connectionStatus === 'connecting'
                ? 'Connecting...'
                : 'Error'}
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

      <div className="flex-1 relative bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Starting video call...</p>
            </div>
          </div>
        )}

        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {isScreenSharing && (
          <video
            ref={screenShareRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-contain bg-black z-5"
          />
        )}

        <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-border shadow-lg z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>

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
            variant={isScreenSharing ? 'default' : 'secondary'}
            size="lg"
            onClick={toggleScreenShare}
            className="rounded-full h-14 w-14"
          >
            {isScreenSharing ? (
              <MonitorOff className="h-6 w-6" />
            ) : (
              <Monitor className="h-6 w-6" />
            )}
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
            {isFullscreen ? (
              <Minimize className="h-6 w-6" />
            ) : (
              <Maximize className="h-6 w-6" />
            )}
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
