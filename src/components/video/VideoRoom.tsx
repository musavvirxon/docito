import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  RefreshCw,
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

type TileKind = 'camera' | 'screen';

interface TileMeta {
  id: string;
  label: string;
  kind: TileKind;
  isLocal: boolean;
  participantSid: string;
}

const tileId = (participantSid: string, source: Track.Source): string | null => {
  if (source === Track.Source.Camera) return `${participantSid}:camera`;
  if (source === Track.Source.ScreenShare) return `${participantSid}:screen`;
  return null;
};

const VideoRoom: React.FC<VideoRoomProps> = ({
  consultation,
  userRole,
  onEnd,
  onLeave,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContainer = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const cancelledRef = useRef(false);

  // tileId -> DOM node
  const nodeRegistry = useRef<Map<string, HTMLDivElement>>(new Map());
  // tileId -> Track (latest)
  const trackRegistry = useRef<Map<string, Track>>(new Map());
  // tileIds awaiting their DOM node to mount
  const pendingAttachRef = useRef<Set<string>>(new Set());
  // tileId -> isLocal (so attach can mute local elements)
  const localTileRef = useRef<Map<string, boolean>>(new Map());

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [mediaStarted, setMediaStarted] = useState(false);
  const [startingMedia, setStartingMedia] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Refs mirroring the booleans above to avoid stale closures in toggles.
  const isAudioOnRef = useRef(false);
  const isVideoOnRef = useRef(false);
  const isScreenSharingRef = useRef(false);
  useEffect(() => { isAudioOnRef.current = isAudioOn; }, [isAudioOn]);
  useEffect(() => { isVideoOnRef.current = isVideoOn; }, [isVideoOn]);
  useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);

  const [tiles, setTiles] = useState<TileMeta[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(consultation.notes || '');
  const [participantCount, setParticipantCount] = useState(1);
  const [reconnectKey, setReconnectKey] = useState(0);

  /* ---------- attach helpers ---------- */
  const attachTrackToNode = (track: Track, node: HTMLElement) => {
    const el = track.attach();
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.objectFit = track.source === Track.Source.ScreenShare ? 'contain' : 'cover';
    (el as HTMLMediaElement).autoplay = true;
    el.setAttribute('playsinline', 'true');
    if (track.kind === Track.Kind.Video) {
      // Replace any previous video element in the node
      Array.from(node.querySelectorAll('video')).forEach((v) => v.remove());
      node.appendChild(el);
    } else {
      node.appendChild(el);
    }
  };

  const tryAttach = (id: string) => {
    const track = trackRegistry.current.get(id);
    const node = nodeRegistry.current.get(id);
    if (track && node) attachTrackToNode(track, node);
  };

  const registerNode = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      nodeRegistry.current.set(id, el);
      tryAttach(id);
    } else {
      nodeRegistry.current.delete(id);
    }
  }, []);

  const upsertTile = (meta: TileMeta, track: Track) => {
    trackRegistry.current.set(meta.id, track);
    setTiles((prev) => {
      if (prev.some((t) => t.id === meta.id)) return prev;
      return [...prev, meta];
    });
    setFocusedId((cur) => cur ?? meta.id);
    // attempt attach next tick (after node renders)
    setTimeout(() => tryAttach(meta.id), 0);
  };

  const removeTile = (id: string) => {
    const track = trackRegistry.current.get(id);
    try {
      track?.detach().forEach((el) => el.remove());
    } catch {
      /* noop */
    }
    trackRegistry.current.delete(id);
    setTiles((prev) => prev.filter((t) => t.id !== id));
    setFocusedId((cur) => (cur === id ? null : cur));
  };

  /* ---------- LiveKit handlers ---------- */
  const handleRemoteTrack = useCallback(
    (track: RemoteTrack, _pub: RemoteTrackPublication, p: RemoteParticipant) => {
      if (track.kind === Track.Kind.Audio) {
        if (audioContainer.current) attachTrackToNode(track, audioContainer.current);
        return;
      }
      const id = tileId(p.sid, track.source);
      if (!id) return;
      const label =
        track.source === Track.Source.ScreenShare
          ? `${p.identity || 'Participant'} · Screen`
          : p.identity || 'Participant';
      upsertTile({ id, label, kind: track.source === Track.Source.ScreenShare ? 'screen' : 'camera', isLocal: false, participantSid: p.sid }, track);
    },
    [],
  );

  const handleRemoteTrackGone = useCallback(
    (track: RemoteTrack, _pub: RemoteTrackPublication, p: RemoteParticipant) => {
      const id = tileId(p.sid, track.source);
      if (id) removeTile(id);
    },
    [],
  );

  const handleLocalPublished = useCallback((pub: LocalTrackPublication) => {
    const track = pub.track;
    if (!track) return;
    setMediaStarted(true);
    if (track.kind === Track.Kind.Audio) {
      setIsAudioOn(true);
      return;
    }
    const sid = roomRef.current?.localParticipant.sid || 'local';
    const id = tileId(sid, track.source);
    if (!id) return;
    if (track.source === Track.Source.Camera) setIsVideoOn(true);
    if (track.source === Track.Source.ScreenShare) setIsScreenSharing(true);
    upsertTile(
      {
        id,
        label: track.source === Track.Source.ScreenShare ? 'You · Screen' : 'You',
        kind: track.source === Track.Source.ScreenShare ? 'screen' : 'camera',
        isLocal: true,
        participantSid: sid,
      },
      track,
    );
  }, []);

  const handleLocalUnpublished = useCallback((pub: LocalTrackPublication) => {
    const track = pub.track;
    if (!track) return;
    if (track.kind === Track.Kind.Audio) {
      setIsAudioOn(false);
      return;
    }
    const sid = roomRef.current?.localParticipant.sid || 'local';
    const id = tileId(sid, track.source);
    if (track.source === Track.Source.Camera) setIsVideoOn(false);
    if (track.source === Track.Source.ScreenShare) setIsScreenSharing(false);
    if (id) removeTile(id);
  }, []);

  const handleParticipantGone = useCallback((p: Participant) => {
    [Track.Source.Camera, Track.Source.ScreenShare].forEach((src) => {
      const id = tileId(p.sid, src);
      if (id) removeTile(id);
    });
    if (roomRef.current) setParticipantCount(roomRef.current.numParticipants + 1);
  }, []);

  const updateParticipantCount = useCallback(() => {
    if (roomRef.current) setParticipantCount(roomRef.current.numParticipants + 1);
  }, []);

  /* ---------- Connect lifecycle ---------- */
  useEffect(() => {
    cancelledRef.current = false;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: { simulcast: true },
    });
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, handleRemoteTrack);
    room.on(RoomEvent.TrackUnsubscribed, handleRemoteTrackGone);
    room.on(RoomEvent.LocalTrackPublished, handleLocalPublished);
    room.on(RoomEvent.LocalTrackUnpublished, handleLocalUnpublished);
    room.on(RoomEvent.ParticipantConnected, updateParticipantCount);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantGone);
    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      if (cancelledRef.current) return;
      if (state === ConnectionState.Connected) setStatus('connected');
      else if (state === ConnectionState.Reconnecting) setStatus('connecting');
      else if (state === ConnectionState.Disconnected) setStatus('disconnected');
    });

    const timeout = window.setTimeout(() => {
      if (!cancelledRef.current && room.state !== ConnectionState.Connected) {
        setStatus('error');
        setErrorMsg('Network or video service unreachable. Please retry.');
      }
    }, 12000);

    (async () => {
      try {
        setStatus('connecting');
        setErrorMsg(null);

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.access_token) {
          if (!cancelledRef.current) {
            setStatus('error');
            setErrorMsg('You must be signed in to join the call.');
          }
          return;
        }

        const resp = await supabase.functions.invoke('livekit-token', {
          body: {
            appointmentId: consultation.appointment_id,
            roomId: consultation.room_id,
          },
        });

        if (cancelledRef.current) return;
        if (resp.error || !resp.data?.token) {
          setStatus('error');
          setErrorMsg(resp.error?.message || 'Failed to get video token');
          return;
        }

        await room.connect(resp.data.url, resp.data.token);
        if (cancelledRef.current) {
          await room.disconnect(true).catch(() => {});
          return;
        }

        // Attach any tracks already present
        room.remoteParticipants.forEach((p) => {
          p.trackPublications.forEach((pub) => {
            if (pub.track && pub.isSubscribed) {
              handleRemoteTrack(pub.track as RemoteTrack, pub as RemoteTrackPublication, p);
            }
          });
        });

        setStatus('connected');
        updateParticipantCount();
      } catch (err: any) {
        if (cancelledRef.current) return;
        console.error('LiveKit connect error:', err);
        setStatus('error');
        setErrorMsg(err?.message || 'Could not connect to the video room.');
      }
    })();

    return () => {
      cancelledRef.current = true;
      window.clearTimeout(timeout);
      try {
        room.removeAllListeners();
      } catch {
        /* noop */
      }
      // Detach all tracks first
      trackRegistry.current.forEach((t) => {
        try {
          t.detach().forEach((el) => el.remove());
        } catch {
          /* noop */
        }
      });
      trackRegistry.current.clear();
      nodeRegistry.current.clear();
      if (room.state !== ConnectionState.Disconnected) {
        room.disconnect(true).catch(() => {});
      }
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultation.appointment_id, consultation.room_id, reconnectKey]);

  /* ---------- Media controls ---------- */
  const explainMediaError = (err: any, fallback: string) => {
    const name = err?.name || '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      toast.error('Permission denied. Allow camera, microphone or screen sharing in your browser settings.');
    } else if (name === 'NotFoundError') {
      toast.error('No matching camera or microphone was found on this device.');
    } else if (name === 'NotReadableError') {
      toast.error('The camera or microphone is already in use by another app.');
    } else if (name === 'SecurityError' || name === 'NotSupportedError') {
      toast.error('Media permissions require a secure HTTPS browser context.');
    } else {
      toast.error(err?.message || fallback);
    }
  };

  const requireConnected = () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) {
      toast.error('Still connecting. Try again in a moment.');
      return null;
    }
    return room;
  };

  const startMedia = useCallback(async () => {
    const room = requireConnected();
    if (!room) return;
    setStartingMedia(true);
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      await room.localParticipant.setCameraEnabled(true);
      setMediaStarted(true);
      setIsAudioOn(true);
      setIsVideoOn(true);
    } catch (err: any) {
      explainMediaError(err, 'Failed to start camera and microphone.');
    } finally {
      setStartingMedia(false);
    }
  }, []);

  const toggleAudio = useCallback(async () => {
    const room = requireConnected();
    if (!room) return;
    try {
      const next = !isAudioOn;
      await room.localParticipant.setMicrophoneEnabled(next);
      setIsAudioOn(next);
      if (next) setMediaStarted(true);
    } catch (err: any) {
      explainMediaError(err, 'Could not toggle microphone.');
    }
  }, [isAudioOn]);

  const toggleVideo = useCallback(async () => {
    const room = requireConnected();
    if (!room) return;
    try {
      const next = !isVideoOn;
      await room.localParticipant.setCameraEnabled(next);
      setIsVideoOn(next);
      if (next) setMediaStarted(true);
    } catch (err: any) {
      explainMediaError(err, 'Could not toggle camera.');
    }
  }, [isVideoOn]);

  const toggleScreenShare = useCallback(async () => {
    const room = requireConnected();
    if (!room) return;
    try {
      const next = !isScreenSharing;
      await room.localParticipant.setScreenShareEnabled(next, { audio: true });
      setIsScreenSharing(next);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        toast.error('Screen share was cancelled or not permitted.');
      } else {
        explainMediaError(err, 'Failed to start screen sharing.');
      }
    }
  }, [isScreenSharing]);

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
  const focusedTile = useMemo(
    () => tiles.find((t) => t.id === focusedId) ?? tiles[0] ?? null,
    [tiles, focusedId],
  );
  const sideTiles = useMemo(
    () => tiles.filter((t) => t.id !== focusedTile?.id),
    [tiles, focusedTile],
  );

  const renderTile = (tile: TileMeta, opts: { large: boolean }) => {
    const mirror = tile.isLocal && tile.kind === 'camera';
    return (
      <div
        key={tile.id}
        onClick={() => setFocusedId(tile.id)}
        className={`relative ${opts.large ? 'w-full h-full' : 'w-full aspect-video'} bg-muted rounded-md overflow-hidden border border-border ${opts.large ? '' : 'cursor-pointer hover:border-primary/60 transition-colors'}`}
      >
        <div
          ref={(el) => registerNode(tile.id, el)}
          className="absolute inset-0 [&>video]:w-full [&>video]:h-full"
          style={mirror ? { transform: 'scaleX(-1)' } : undefined}
        />
        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-foreground/90 bg-background/60 backdrop-blur px-2 py-0.5 rounded">
          <span className="truncate">{tile.label}</span>
          {tile.kind === 'screen' && <span className="text-primary">Screen</span>}
        </div>
      </div>
    );
  };

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
      <div className="flex-1 relative bg-black flex">
        {/* Focused tile */}
        <div className="flex-1 relative p-2">
          {focusedTile ? (
            renderTile(focusedTile, { large: true })
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
              Waiting for video…
            </div>
          )}
        </div>

        {/* Side strip */}
        {sideTiles.length > 0 && (
          <div className="hidden md:flex w-44 lg:w-56 flex-col gap-2 p-2 overflow-y-auto bg-card/40">
            {sideTiles.map((t) => renderTile(t, { large: false }))}
          </div>
        )}

        {/* Mobile bottom strip */}
        {sideTiles.length > 0 && (
          <div className="md:hidden absolute bottom-2 left-2 right-2 flex gap-2 overflow-x-auto z-20">
            {sideTiles.map((t) => (
              <div key={t.id} className="w-32 shrink-0">
                {renderTile(t, { large: false })}
              </div>
            ))}
          </div>
        )}

        {/* Hidden audio sink */}
        <div ref={audioContainer} className="hidden" />

        {/* Overlays */}
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
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setReconnectKey((k) => k + 1)} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Retry
                </Button>
                <Button onClick={handleLeave} variant="outline">Leave</Button>
              </div>
            </Card>
          </div>
        )}

        {status === 'disconnected' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 p-4">
            <Card className="p-6 max-w-md text-center space-y-3">
              <h4 className="font-medium">You were disconnected</h4>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setReconnectKey((k) => k + 1)} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Rejoin
                </Button>
                <Button onClick={handleLeave} variant="outline">Leave</Button>
              </div>
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
            disabled={status !== 'connected'}
            className="rounded-full h-12 w-12"
            aria-label={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            variant={!isVideoOn ? 'destructive' : 'secondary'}
            size="lg"
            onClick={toggleVideo}
            disabled={status !== 'connected'}
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
