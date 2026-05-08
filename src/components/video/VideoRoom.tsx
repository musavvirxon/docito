import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  type RemoteTrack,
  type RemoteTrackPublication,
  type LocalTrackPublication,
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
  User,
  Stethoscope,
  MonitorPlay,
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

type SlotId = 'doctor-camera' | 'doctor-screen' | 'patient-camera';

interface SlotInfo {
  id: SlotId;
  label: string;
  icon: React.ReactNode;
  emptyHint: string;
  mirror: boolean; // mirror local camera preview
  isLocal: boolean;
  hasTrack: boolean;
}

const parseRole = (identity: string): 'doctor' | 'patient' | 'staff' | 'guest' => {
  const [r] = (identity || '').split('::');
  if (r === 'doctor' || r === 'patient' || r === 'staff') return r;
  return 'guest';
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

  // Stable DOM refs for each slot (always mounted — never unmounted on toggle)
  const slotNodeRefs = useRef<Record<SlotId, HTMLDivElement | null>>({
    'doctor-camera': null,
    'doctor-screen': null,
    'patient-camera': null,
  });
  // Track currently attached per slot (for re-attach / cleanup)
  const slotTrackRefs = useRef<Record<SlotId, Track | null>>({
    'doctor-camera': null,
    'doctor-screen': null,
    'patient-camera': null,
  });

  const [slotHasTrack, setSlotHasTrack] = useState<Record<SlotId, boolean>>({
    'doctor-camera': false,
    'doctor-screen': false,
    'patient-camera': false,
  });

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [mediaStarted, setMediaStarted] = useState(false);
  const [startingMedia, setStartingMedia] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const isAudioOnRef = useRef(false);
  const isVideoOnRef = useRef(false);
  const isScreenSharingRef = useRef(false);
  useEffect(() => { isAudioOnRef.current = isAudioOn; }, [isAudioOn]);
  useEffect(() => { isVideoOnRef.current = isVideoOn; }, [isVideoOn]);
  useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);

  const [focusedSlot, setFocusedSlot] = useState<SlotId>(
    userRole === 'doctor' ? 'patient-camera' : 'doctor-camera',
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(consultation.notes || '');
  const [participantCount, setParticipantCount] = useState(1);
  const [reconnectKey, setReconnectKey] = useState(0);

  /* ---------- Slot mapping ---------- */
  const sourceToSlot = useCallback(
    (
      source: Track.Source,
      isLocal: boolean,
      remoteRole?: 'doctor' | 'patient' | 'staff' | 'guest',
    ): SlotId | null => {
      const role = isLocal ? userRole : remoteRole;
      if (role === 'doctor') {
        if (source === Track.Source.Camera) return 'doctor-camera';
        if (source === Track.Source.ScreenShare) return 'doctor-screen';
      } else if (role === 'patient') {
        if (source === Track.Source.Camera) return 'patient-camera';
      }
      // staff/guest screen share also lands on doctor-screen for visibility
      if (source === Track.Source.ScreenShare) return 'doctor-screen';
      return null;
    },
    [userRole],
  );

  /* ---------- attach helpers ---------- */
  const attachToSlot = (slot: SlotId, track: Track, isLocal: boolean) => {
    const node = slotNodeRefs.current[slot];
    if (!node) return; // node always mounted, but guard anyway
    // Detach previous track on this slot if different
    const prev = slotTrackRefs.current[slot];
    if (prev && prev !== track) {
      try { prev.detach().forEach((el) => el.remove()); } catch { /* noop */ }
    }
    // Clear stale media elements
    Array.from(node.querySelectorAll('video,audio')).forEach((el) => el.remove());

    const el = track.attach();
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.objectFit = track.source === Track.Source.ScreenShare ? 'contain' : 'cover';
    (el as HTMLMediaElement).autoplay = true;
    el.setAttribute('playsinline', 'true');
    if (isLocal) {
      try { (el as HTMLMediaElement).muted = true; } catch { /* noop */ }
    }
    node.appendChild(el);
    slotTrackRefs.current[slot] = track;
    setSlotHasTrack((s) => (s[slot] ? s : { ...s, [slot]: true }));
  };

  const clearSlot = (slot: SlotId) => {
    const prev = slotTrackRefs.current[slot];
    if (prev) {
      try { prev.detach().forEach((el) => el.remove()); } catch { /* noop */ }
    }
    slotTrackRefs.current[slot] = null;
    const node = slotNodeRefs.current[slot];
    if (node) Array.from(node.querySelectorAll('video,audio')).forEach((el) => el.remove());
    setSlotHasTrack((s) => (s[slot] ? { ...s, [slot]: false } : s));
  };

  const registerSlotNode = useCallback(
    (slot: SlotId) => (el: HTMLDivElement | null) => {
      slotNodeRefs.current[slot] = el;
      // Re-attach any track that was queued before mount
      const tr = slotTrackRefs.current[slot];
      if (el && tr) {
        // Re-attach (idempotent)
        try {
          Array.from(el.querySelectorAll('video,audio')).forEach((m) => m.remove());
          const m = tr.attach();
          m.style.width = '100%';
          m.style.height = '100%';
          m.style.objectFit = tr.source === Track.Source.ScreenShare ? 'contain' : 'cover';
          (m as HTMLMediaElement).autoplay = true;
          m.setAttribute('playsinline', 'true');
          el.appendChild(m);
        } catch { /* noop */ }
      }
    },
    [],
  );

  /* ---------- LiveKit handlers ---------- */
  const handleRemoteTrack = useCallback(
    (track: RemoteTrack, _pub: RemoteTrackPublication, p: RemoteParticipant) => {
      if (track.kind === Track.Kind.Audio) {
        if (audioContainer.current) {
          Array.from(audioContainer.current.querySelectorAll('audio')).forEach((a) => a.remove());
          const el = track.attach();
          (el as HTMLMediaElement).autoplay = true;
          audioContainer.current.appendChild(el);
        }
        return;
      }
      const role = parseRole(p.identity);
      const slot = sourceToSlot(track.source, false, role);
      if (slot) attachToSlot(slot, track, false);
    },
    [sourceToSlot],
  );

  const handleRemoteTrackGone = useCallback(
    (track: RemoteTrack, _pub: RemoteTrackPublication, p: RemoteParticipant) => {
      const role = parseRole(p.identity);
      const slot = sourceToSlot(track.source, false, role);
      if (slot && slotTrackRefs.current[slot] === track) clearSlot(slot);
    },
    [sourceToSlot],
  );

  const handleLocalPublished = useCallback((pub: LocalTrackPublication) => {
    const track = pub.track;
    if (!track) return;
    setMediaStarted(true);
    if (track.kind === Track.Kind.Audio) {
      setIsAudioOn(true);
      return;
    }
    if (track.source === Track.Source.Camera) setIsVideoOn(true);
    if (track.source === Track.Source.ScreenShare) setIsScreenSharing(true);
    const slot = sourceToSlot(track.source, true);
    if (slot) attachToSlot(slot, track, true);
  }, [sourceToSlot]);

  const handleLocalUnpublished = useCallback((pub: LocalTrackPublication) => {
    const track = pub.track;
    if (!track) return;
    if (track.kind === Track.Kind.Audio) {
      setIsAudioOn(false);
      return;
    }
    if (track.source === Track.Source.Camera) setIsVideoOn(false);
    if (track.source === Track.Source.ScreenShare) setIsScreenSharing(false);
    const slot = sourceToSlot(track.source, true);
    if (slot && slotTrackRefs.current[slot] === track) clearSlot(slot);
  }, [sourceToSlot]);

  const handleParticipantGone = useCallback((p: Participant) => {
    const role = parseRole(p.identity);
    [Track.Source.Camera, Track.Source.ScreenShare].forEach((src) => {
      const slot = sourceToSlot(src, false, role);
      if (slot) {
        // only clear if the current track belongs to this participant
        const tr = slotTrackRefs.current[slot] as any;
        if (tr && tr.sid && p.trackPublications) {
          const owns = Array.from(p.trackPublications.values()).some(
            (pub: any) => pub.trackSid === tr.sid,
          );
          if (owns) clearSlot(slot);
        }
      }
    });
    if (roomRef.current) setParticipantCount(roomRef.current.numParticipants + 1);
  }, [sourceToSlot]);

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
      reconnectPolicy: {
        nextRetryDelayInMs: (ctx) => Math.min(30000, 1000 * Math.pow(2, ctx.retryCount)),
      } as any,
    });
    roomRef.current = room;

    const reattachAll = () => {
      room.remoteParticipants.forEach((p) => {
        p.trackPublications.forEach((pub) => {
          if (pub.track && pub.isSubscribed) {
            handleRemoteTrack(pub.track as RemoteTrack, pub as RemoteTrackPublication, p);
          }
        });
      });
    };

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
    room.on(RoomEvent.Reconnected, () => {
      if (cancelledRef.current) return;
      setStatus('connected');
      reattachAll();
    });
    room.on(RoomEvent.Reconnecting, () => {
      if (cancelledRef.current) return;
      setStatus('connecting');
    });
    room.on(RoomEvent.MediaDevicesError, (err: Error) => {
      explainMediaError(err, 'Media device error.');
      setIsAudioOn(false);
      setIsVideoOn(false);
      setIsScreenSharing(false);
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
      try { room.removeAllListeners(); } catch { /* noop */ }
      (['doctor-camera', 'doctor-screen', 'patient-camera'] as SlotId[]).forEach((s) => {
        const t = slotTrackRefs.current[s];
        if (t) {
          try { t.detach().forEach((el) => el.remove()); } catch { /* noop */ }
          slotTrackRefs.current[s] = null;
        }
      });
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
    let micOk = false;
    let camOk = false;
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      micOk = true;
      setIsAudioOn(true);
    } catch (err: any) {
      explainMediaError(err, 'Failed to start microphone.');
    }
    try {
      await room.localParticipant.setCameraEnabled(true);
      camOk = true;
      setIsVideoOn(true);
    } catch (err: any) {
      explainMediaError(err, 'Failed to start camera.');
    }
    if (micOk || camOk) setMediaStarted(true);
    setStartingMedia(false);
  }, []);

  const toggleAudio = useCallback(async () => {
    const room = requireConnected();
    if (!room) return;
    try {
      const next = !isAudioOnRef.current;
      await room.localParticipant.setMicrophoneEnabled(next);
      isAudioOnRef.current = next;
      setIsAudioOn(next);
      if (next) setMediaStarted(true);
    } catch (err: any) {
      explainMediaError(err, 'Could not toggle microphone.');
    }
  }, []);

  const toggleVideo = useCallback(async () => {
    const room = requireConnected();
    if (!room) return;
    try {
      const next = !isVideoOnRef.current;
      await room.localParticipant.setCameraEnabled(next);
      isVideoOnRef.current = next;
      setIsVideoOn(next);
      if (next) setMediaStarted(true);
    } catch (err: any) {
      explainMediaError(err, 'Could not toggle camera.');
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const room = requireConnected();
    if (!room) return;
    try {
      const next = !isScreenSharingRef.current;
      await room.localParticipant.setScreenShareEnabled(next, { audio: true });
      isScreenSharingRef.current = next;
      setIsScreenSharing(next);
      if (next) {
        const pub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
        const t = pub?.track;
        if (t) {
          const onEnded = () => {
            isScreenSharingRef.current = false;
            setIsScreenSharing(false);
            try { t.off('ended' as any, onEnded); } catch { /* noop */ }
          };
          try { t.on('ended' as any, onEnded); } catch { /* noop */ }
          const mst = (t as any).mediaStreamTrack as MediaStreamTrack | undefined;
          if (mst) mst.addEventListener('ended', onEnded, { once: true });
        }
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        toast.error('Screen share was cancelled or not permitted.');
      } else {
        explainMediaError(err, 'Failed to start screen sharing.');
      }
    }
  }, []);

  useEffect(() => {
    const onVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      const room = roomRef.current;
      if (!room || room.state !== ConnectionState.Connected) return;
      try {
        if (isAudioOnRef.current && !room.localParticipant.isMicrophoneEnabled) {
          await room.localParticipant.setMicrophoneEnabled(true);
        }
        if (isVideoOnRef.current && !room.localParticipant.isCameraEnabled) {
          await room.localParticipant.setCameraEnabled(true);
        }
      } catch (err: any) {
        explainMediaError(err, 'Could not resume media after returning to the tab.');
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
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
    try { roomRef.current?.disconnect(true); } catch { /* noop */ }
    onEnd(notes);
  }, [notes, onEnd]);

  const handleLeave = useCallback(() => {
    try { roomRef.current?.disconnect(true); } catch { /* noop */ }
    onLeave();
  }, [onLeave]);

  /* ---------- Render ---------- */
  const slots: SlotInfo[] = useMemo(
    () => [
      {
        id: 'doctor-camera',
        label: userRole === 'doctor' ? 'You (Doctor)' : 'Doctor',
        icon: <Stethoscope className="h-8 w-8" />,
        emptyHint: userRole === 'doctor'
          ? 'Your camera is off'
          : 'Waiting for the doctor’s camera…',
        mirror: userRole === 'doctor',
        isLocal: userRole === 'doctor',
        hasTrack: slotHasTrack['doctor-camera'],
      },
      {
        id: 'patient-camera',
        label: userRole === 'patient' ? 'You (Patient)' : 'Patient',
        icon: <User className="h-8 w-8" />,
        emptyHint: userRole === 'patient'
          ? 'Your camera is off'
          : 'Waiting for the patient’s camera…',
        mirror: userRole === 'patient',
        isLocal: userRole === 'patient',
        hasTrack: slotHasTrack['patient-camera'],
      },
      {
        id: 'doctor-screen',
        label: 'Doctor · Screen',
        icon: <MonitorPlay className="h-8 w-8" />,
        emptyHint: userRole === 'doctor'
          ? 'Click the screen icon to share'
          : 'Doctor is not sharing their screen',
        mirror: false,
        isLocal: userRole === 'doctor',
        hasTrack: slotHasTrack['doctor-screen'],
      },
    ],
    [slotHasTrack, userRole],
  );

  const focusedInfo = slots.find((s) => s.id === focusedSlot)!;
  const sideInfos = slots.filter((s) => s.id !== focusedSlot);

  // All 3 slots are siblings in ONE container so React never unmounts them
  // when focus changes — only their CSS classes update. This is what stops
  // the live stream from being "disturbed" on every UI action.
  const slotPositionClass = (id: SlotId): string => {
    const isFocused = id === focusedSlot;
    if (isFocused) {
      return 'absolute inset-2 md:right-[12rem] lg:right-[15rem] z-10';
    }
    // Side strip (desktop): stacked top-right
    const sideIndex = sideInfos.findIndex((s) => s.id === id);
    return [
      // Mobile: bottom row
      `absolute md:hidden bottom-2 ${sideIndex === 0 ? 'left-2' : 'left-[9rem]'} w-32 aspect-video z-20 cursor-pointer`,
      // Desktop side strip
      `md:absolute md:bottom-auto md:left-auto md:w-40 lg:w-52 md:aspect-video md:right-2 md:cursor-pointer md:z-10`,
      sideIndex === 0 ? 'md:top-2' : 'md:top-[calc(2rem+8rem)] lg:top-[calc(2rem+10rem)]',
    ].join(' ');
  };

  const renderSlot = (info: SlotInfo) => {
    const isFocused = info.id === focusedSlot;
    return (
      <div
        key={info.id}
        onClick={() => !isFocused && setFocusedSlot(info.id)}
        className={`${slotPositionClass(info.id)} bg-muted rounded-md overflow-hidden border border-border transition-all hover:border-primary/60`}
      >
        <div
          ref={registerSlotNode(info.id)}
          className="absolute inset-0 [&>video]:w-full [&>video]:h-full bg-black"
          style={info.mirror && info.hasTrack ? { transform: 'scaleX(-1)' } : undefined}
        />
        {!info.hasTrack && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/80 p-2">
            <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-background/80 flex items-center justify-center">
              {info.icon}
            </div>
            <span className="text-[10px] md:text-xs text-center">{info.emptyHint}</span>
          </div>
        )}
        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-foreground/90 bg-background/60 backdrop-blur px-2 py-0.5 rounded">
          <span className="truncate">{info.label}</span>
          {info.id === 'doctor-screen' && info.hasTrack && (
            <span className="text-primary">Live</span>
          )}
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
        <div className="flex-1 relative p-2">
          {renderSlot(focusedInfo, true)}
        </div>

        <div className="hidden md:flex w-44 lg:w-56 flex-col gap-2 p-2 overflow-y-auto bg-card/40">
          {sideInfos.map((s) => renderSlot(s, false))}
        </div>

        {/* Mobile bottom strip */}
        <div className="md:hidden absolute bottom-2 left-2 right-2 flex gap-2 overflow-x-auto z-20">
          {sideInfos.map((s) => (
            <div key={s.id} className="w-32 shrink-0">
              {renderSlot(s, false)}
            </div>
          ))}
        </div>

        <div ref={audioContainer} className="hidden" />

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

          {userRole === 'doctor' && (
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
          )}

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
