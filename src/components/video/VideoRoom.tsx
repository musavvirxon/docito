import React, { useEffect, useRef, useState, useCallback } from 'react';
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

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(consultation.notes || '');
  const [participantCount, setParticipantCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting');

  // ICE servers for NAT traversal
  const iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // Initialize local media
  const initLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsLoading(false);
      setConnectionStatus('connected');
      return stream;
    } catch (err) {
      console.error('Failed to get local media:', err);
      setIsLoading(false);
      setConnectionStatus('error');
      return null;
    }
  }, []);

  // Set up WebRTC peer connection with Supabase Realtime signaling
  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      const stream = await initLocalMedia();
      if (!stream || !mounted) return;

      // Create peer connection
      const pc = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote tracks
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setParticipantCount(2);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          setParticipantCount(1);
        }
      };

      // Use Supabase Realtime for signaling
      const channel = supabase.channel(`video-signal-${consultation.room_id}`, {
        config: { broadcast: { self: false } },
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate.toJSON(), from: userName },
          });
        }
      };

      channel
        .on('broadcast', { event: 'offer' }, async ({ payload }) => {
          if (!peerConnectionRef.current) return;
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          channel.send({
            type: 'broadcast',
            event: 'answer',
            payload: { sdp: answer, from: userName },
          });
        })
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (!peerConnectionRef.current) return;
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (!peerConnectionRef.current) return;
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.error('ICE candidate error:', e);
          }
        })
        .on('broadcast', { event: 'join' }, async () => {
          // When another participant joins, create an offer
          if (!peerConnectionRef.current) return;
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          channel.send({
            type: 'broadcast',
            event: 'offer',
            payload: { sdp: offer, from: userName },
          });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Announce our presence
            channel.send({
              type: 'broadcast',
              event: 'join',
              payload: { from: userName, role: userRole },
            });
          }
        });

      return () => {
        channel.unsubscribe();
      };
    };

    const cleanupPromise = setup();

    return () => {
      mounted = false;
      cleanupPromise.then((cleanup) => cleanup?.());
      peerConnectionRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [consultation.room_id, userName, userRole, initLocalMedia]);

  const toggleAudio = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsAudioMuted(!isAudioMuted);
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsVideoMuted(!isVideoMuted);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);

      // Replace screen track with camera track
      const cameraStream = localStreamRef.current;
      if (cameraStream && peerConnectionRef.current) {
        const videoTrack = cameraStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        if (screenShareRef.current) {
          screenShareRef.current.srcObject = screenStream;
        }

        // Replace camera track with screen track in peer connection
        const screenTrack = screenStream.getVideoTracks()[0];
        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };
      } catch (err) {
        console.error('Screen share error:', err);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleEndCall = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerConnectionRef.current?.close();
    onEnd(notes);
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
            {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting...' : 'Error'}
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
      <div className="flex-1 relative bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Starting video call...</p>
            </div>
          </div>
        )}

        {/* Remote video (main) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Screen share overlay */}
        {isScreenSharing && (
          <video
            ref={screenShareRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-contain bg-black z-5"
          />
        )}

        {/* Local video (PiP) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-border shadow-lg z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>

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
            variant={isScreenSharing ? 'default' : 'secondary'}
            size="lg"
            onClick={toggleScreenShare}
            className="rounded-full h-14 w-14"
          >
            {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
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
