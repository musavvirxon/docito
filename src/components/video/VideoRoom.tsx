import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  type RemoteTrack,
  type RemoteTrackPublication,
  type LocalTrackPublication,
  type LocalTrack,
  type RemoteParticipant,
  type Participant,
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
  AlertTriangle,
  Loader2,
  PlayCircle,
} from 'lucide-react';
import { VideoConsultation } from '@/hooks/useVideoConsultation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoRoomProps {
  consultation: VideoConsultation;
  userName: string;
  userRole: 'doctor' | 'patient';
  onEnd: (notes?: string) => void;
  onLeave: () => void;
}

type Status = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

const VideoRoom: React.FC<VideoRoomProps> = ({
  consultation,
  userRole,
  onEnd,
  onLeave,
}) => {
  const localVideoContainer = useRef<HTMLDivElement>(null);
  const remoteVideoContainer = useRef<HTMLDivElement>(null);
  const screenShareContainer = useRef<HTMLDivElement>(null);
  const audioContainer = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [mediaStarted, setMediaStarted] = useState(false);
  const [startingMedia, setStartingMedia] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasRemoteScreen, setHasRemoteScreen] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(consultation.notes || '');
  const [participantCount, setParticipantCount] = useState(1);

  const attachInto = (track: Track, container: HTMLElement | null) => {
    if (!container) return;
    const el = track.attach();
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.objectFit = track.source === Track.Source.ScreenShare ? 'contain' : 'cover';
    (el as HTMLMediaElement).autoplay = true;
    el.setAttribute('playsinline', 'true');
    if (track.kind === Track.Kind.Video) {
      container.replaceChildren(el);
    } else {
      container.appendChild(el);
    }
  };

  const detachAll = (track: Track) => {
    track.detach().forEach((el) => el.remove());
  };

  /* ---------- LiveKit event handlers ---------- */
  const handleTrackSubscribed = useCallback(
    (track: RemoteTrack, _pub: RemoteTrackPublication, _p: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video) {
        if (track.source === Track.Source.ScreenShare) {
          setHasRemoteScreen(true);
          attachInto(track, screenShareContainer.current);
        } else {
          attachInto(track, remoteVideoContainer.current);
        }
      } else if (track.kind === Track.Kind.Audio) {
        attachInto(track, audioContainer.current);
      }
    },
    [],
  );

  const handleTrackUnsubscribed = useCallback((track: RemoteTrack) => {
    detachAll(track);
    if (track.source === Track.Source.ScreenShare) setHasRemoteScreen(false);
  }, []);

  const handleLocalTrackPublished = useCallback((pub: LocalTrackPublication) => {
    if (!pub.track) return;
    setMediaStarted(true);
    if (pub.track.kind === Track.Kind.Video) {
      if (pub.track.source === Track.Source.Camera) {
        attachInto(pub.track, localVideoContainer.current);
        setIsVideoOn(true);
      } else if (pub.track.source === Track.Source.ScreenShare) {
        attachInto(pub.track, screenShareContainer.current);
        setHasRemoteScreen(true);
        setIsScreenSharing(true);
      }
    } else if (pub.track.kind === Track.Kind.Audio) {
      setIsAudioOn(true);
    }
  }, []);

  const handleLocalTrackUnpublished = useCallback((pub: LocalTrackPublication) => {
    if (!pub.track) return;
    detachAll(pub.track);
    if (pub.track.source === Track.Source.Camera) setIsVideoOn(false);
    if (pub.track.source === Track.Source.ScreenShare) {
      setIsScreenSharing(false);
      setHasRemoteScreen(false);
    }
    if (pub.track.kind === Track.Kind.Audio) setIsAudioOn(false);
  }, []);

  const updateParticipantCount = useCallback((_p?: Participant) => {
    if (!roomRef.current) return;
    setParticipantCount(roomRef.current.numParticipants + 1);
  }, []);

  /* ---------- Connect on mount ---------- */
  useEffect(() => {
    let mounted = true;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
    room.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
    room.on(RoomEvent.ParticipantConnected, updateParticipantCount);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipantCount);
    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      if (!mounted) return;
      if (state === ConnectionState.Connected) setStatus('connected');
      else if (state === ConnectionState.Reconnecting) setStatus('connecting');
      else if (state === ConnectionState.Disconnected) setStatus('disconnected');
    });

    const connect = async () => {
      try {
        setStatus('connecting');
        setErrorMsg(null);

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.access_token) {
          setStatus('error');
          setErrorMsg('You must be signed in to join the call.');
          return;
        }

        const resp = await supabase.functions.invoke('livekit-token', {
          body: {
            appointmentId: consultation.appointment_id,
            roomId: consultation.room_id,
          },
        });

        if (resp.error || !resp.data?.token) {
          setStatus('error');
          setErrorMsg(resp.error?.message || 'Failed to get video token');
          return;
        }

        const { token, url } = resp.data;
        await room.connect(url, token);

        if (mounted) {
          setStatus('connected');
          updateParticipantCount();
        }
      } catch (err: any) {
        console.error('LiveKit connect error:', err);
        if (mounted) {
          setStatus('error');
          setErrorMsg(err?.message || 'Could not connect to the video room.');
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      try {
        room.disconnect(true);
      } catch {
        /* noop */
      }
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultation.appointment_id, consultation.room_id]);

  const explainMediaError = (err: any, fallback: string) => {
    const name = err?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      toast.error('Permission denied. Allow camera, microphone, or screen sharing in your browser settings.');
    } else if (name === 'NotFoundError') {
      toast.error('No matching camera or microphone was found on this device.');
    } else if (name === 'NotReadableError') {
      toast.error('The camera or microphone is already in use by another app.');
    } else if (name === 'NotSupportedError' || name === 'SecurityError') {
      toast.error('Media permissions require a secure HTTPS browser context.');
    } else {
      toast.error(err?.message || fallback);
    }
  };

  const canUseMedia = () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) {
      toast.error('Still connecting to the room. Try again in a second.');
      return null;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Your browser does not support camera/microphone access.');
      return null;
    }
    if (!window.isSecureContext) {
      toast.error('Camera and microphone require HTTPS.');
      return null;
    }
    return room;
  };

  const publishTracks = async (tracks: LocalTrack[]) => {
    const room = roomRef.current;
    if (!room) return;
    await Promise.all(tracks.map((track) => room.localParticipant.publishTrack(track)));
  };

  /* ---------- Media gesture-driven start ---------- */
  const startMedia = useCallback(async () => {
    const room = canUseMedia();
    if (!room) return;

    // Important: createTracks() invokes getUserMedia synchronously from this click handler.
    const tracksPromise = room.localParticipant.createTracks({ audio: true, video: true });

    setStartingMedia(true);
    try {
      const tracks = await tracksPromise;
      await publishTracks(tracks);
      setMediaStarted(true);
      setIsAudioOn(true);
      setIsVideoOn(true);
    } catch (err: any) {
      console.error('Media start error:', err);
      explainMediaError(err, 'Failed to start camera and microphone.');
    } finally {
      setStartingMedia(false);
    }
  }, []);

  const toggleAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) {
      toast.error('Still connecting to the room. Try again in a second.');
      return;
    }
    try {
      const current = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (current?.track && !current.isMuted) {
        await current.mute();
        setIsAudioOn(false);
        return;
      }
      if (current) {
        await current.unmute();
        setMediaStarted(true);
        setIsAudioOn(true);
        return;
      }
      const tracksPromise = room.localParticipant.createTracks({ audio: true, video: false });
      const tracks = await tracksPromise;
      await publishTracks(tracks);
      setMediaStarted(true);
      setIsAudioOn(true);
    } catch (err: any) {
      explainMediaError(err, 'Could not toggle microphone.');
    }
  }, []);

  const toggleVideo = useCallback(async () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) {
      toast.error('Still connecting to the room. Try again in a second.');
      return;
    }
    try {
      const current = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (current?.track && !current.isMuted) {
        await current.mute();
        setIsVideoOn(false);
        return;
      }
      if (current) {
        await current.unmute();
        setMediaStarted(true);
        setIsVideoOn(true);
        return;
      }
      const tracksPromise = room.localParticipant.createTracks({ audio: false, video: true });
      const tracks = await tracksPromise;
      await publishTracks(tracks);
      setMediaStarted(true);
      setIsVideoOn(true);
    } catch (err: any) {
      explainMediaError(err, 'Could not toggle camera.');
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) {
      toast.error('Connect to the room before sharing your screen.');
      return;
    }
    try {
      const current = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
      if (current?.track) {
        await room.localParticipant.unpublishTrack(current.track, true);
        const audio = room.localParticipant.getTrackPublication(Track.Source.ScreenShareAudio);
        if (audio?.track) await room.localParticipant.unpublishTrack(audio.track, true);
        setIsScreenSharing(false);
        setHasRemoteScreen(false);
        return;
      }

      // Important: createScreenTracks() invokes getDisplayMedia synchronously from this click handler.
      let tracksPromise = room.localParticipant.createScreenTracks({ audio: true });
      let tracks: LocalTrack[];
      try {
        tracks = await tracksPromise;
      } catch (err: any) {
        if (err?.name !== 'NotAllowedError' && err?.name !== 'PermissionDeniedError') {
          tracksPromise = room.localParticipant.createScreenTracks({ audio: false });
          tracks = await tracksPromise;
        } else {
          throw err;
        }
      }
      await publishTracks(tracks);
      setIsScreenSharing(true);
      setHasRemoteScreen(true);
    } catch (err: any) {
      console.error('Screen share error:', err);
      if (err?.name === 'NotAllowedError') {
        toast.error('Screen share was cancelled or not permitted.');
      } else {
        explainMediaError(err, 'Failed to start screen sharing.');
      }
    }
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleEndCall = useCallback(() => {
    try {
      roomRef.current?.disconnect(true);
    } catch {
      /* noop */
    }
    onEnd(notes);
  }, [notes, onEnd]);

  const handleLeave = useCallback(() => {
    try {
      roomRef.current?.disconnect(true);
    } catch {
      /* noop */
    }
    onLeave();
  }, [onLeave]);

  /* ---------- Render ---------- */
  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-background rounded-lg overflow-hidden border border-border w-full"
      style={{ height: isFullscreen ? '100vh' : 'min(80vh, 900px)', minHeight: '560px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Badge variant={status === 'connected' ? 'default' : 'secondary'}>
            {status === 'connected'
              ? 'Live'
              : status === 'connecting'
                ? 'Connecting…'
                : status === 'error'
                  ? 'Error'
                  : status === 'disconnected'
                    ? 'Disconnected'
                    : 'Idle'}
          </Badge>
          <span className="text-xs text-muted-foreground truncate max-w-[40ch]">
            Room: {consultation.room_id}
          </span>
        </div>
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" />
          {participantCount}
        </Badge>
      </div>

      {/* Stage */}
      <div className="flex-1 relative bg-black">
        {/* Remote camera */}
        <div ref={remoteVideoContainer} className="absolute inset-0 w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />

        {/* Remote screen-share overlay */}
        <div
          ref={screenShareContainer}
          className={`absolute inset-0 w-full h-full bg-black [&>video]:w-full [&>video]:h-full [&>video]:object-contain ${hasRemoteScreen ? 'z-10' : 'hidden'}`}
        />

        {/* Hidden audio sink */}
        <div ref={audioContainer} className="hidden" />

        {/* Local PiP */}
        <div className="absolute bottom-3 right-3 w-40 sm:w-56 aspect-video rounded-md overflow-hidden border border-border shadow-lg bg-muted z-20">
          <div
            ref={localVideoContainer}
            className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {!isVideoOn && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Camera off
            </div>
          )}
        </div>

        {/* Connection / start overlays */}
        {status === 'connecting' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Connecting to video room…
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 p-4">
            <Card className="p-6 max-w-md text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
              <h4 className="font-medium">Could not join the call</h4>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button onClick={handleLeave} variant="outline">Leave</Button>
            </Card>
          </div>
        )}

        {status === 'connected' && !mediaStarted && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/85 p-4">
            <Card className="p-6 max-w-md text-center space-y-4">
              <PlayCircle className="h-10 w-10 text-primary mx-auto" />
              <div>
                <h4 className="font-medium">Ready to join</h4>
                <p className="text-sm text-muted-foreground">
                  Your browser will ask for camera and microphone access.
                </p>
              </div>
              <Button onClick={startMedia} disabled={startingMedia} className="gap-2">
                {startingMedia ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
                Start camera & microphone
              </Button>
            </Card>
          </div>
        )}

        {showNotes && userRole === 'doctor' && (
          <div className="absolute right-3 top-3 w-72 z-20">
            <Card className="p-3 bg-card/95 backdrop-blur">
              <h4 className="font-medium mb-2 text-sm">Consultation Notes</h4>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this consultation…"
                className="min-h-[120px] resize-none"
              />
            </Card>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button
            variant={!isAudioOn ? 'destructive' : 'secondary'}
            size="lg"
            onClick={toggleAudio}
            disabled={!mediaStarted}
            className="rounded-full h-12 w-12"
            aria-label={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            variant={!isVideoOn ? 'destructive' : 'secondary'}
            size="lg"
            onClick={toggleVideo}
            disabled={!mediaStarted}
            className="rounded-full h-12 w-12"
            aria-label={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button
            variant={isScreenSharing ? 'default' : 'secondary'}
            size="lg"
            onClick={toggleScreenShare}
            disabled={status !== 'connected'}
            className="rounded-full h-12 w-12"
            aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </Button>

          {userRole === 'doctor' && (
            <Button
              variant={showNotes ? 'default' : 'secondary'}
              size="lg"
              onClick={() => setShowNotes((v) => !v)}
              className="rounded-full h-12 w-12"
              aria-label="Toggle notes"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          )}

          <Button
            variant="secondary"
            size="lg"
            onClick={toggleFullscreen}
            className="rounded-full h-12 w-12"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={handleEndCall}
            className="rounded-full h-12 w-12 ml-2"
            aria-label="End call"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoRoom;
