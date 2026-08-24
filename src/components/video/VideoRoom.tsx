import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  ConnectionQuality,
  VideoQuality,
  VideoPresets,
  ScreenSharePresets,
  type LocalVideoTrack,
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
  X,
  ExternalLink,
  Eye,
  EyeOff,
  SignalHigh,
  SignalMedium,
  SignalLow,
} from 'lucide-react';
import { VideoConsultation } from '@/hooks/useVideoConsultation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isInIframe, openCallInNewTab } from '@/lib/mediaEnv';

interface VideoRoomProps {
  consultation: VideoConsultation;
  userName: string;
  userRole: 'doctor' | 'patient' | 'guest';
  /** Omit for participants (e.g. patients) who may only leave, not end, the call. */
  onEnd?: (notes?: string) => void;
  onLeave: () => void;
  guestToken?: string;
}

const SESSION_MAX_SECONDS = 3600; // 1 hour auto-close
const WARN_AT_SECONDS = 300; // 5-minute warning

/* Picture-in-picture tile sizing (px, width; height follows 16:9) */
const DEFAULT_TILE_WIDTH = 208;
const MIN_TILE_WIDTH = 110;
const MAX_TILE_WIDTH = 520;
const TILE_PREFS_KEY = 'docito.videoRoom.tilePrefs';


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

/** Prefer the role carried in the token metadata; fall back to the identity prefix. */
const participantRole = (p: { identity: string; metadata?: string }):
  'doctor' | 'patient' | 'staff' | 'guest' => {
  try {
    if (p.metadata) {
      const m = JSON.parse(p.metadata);
      if (m?.role === 'doctor' || m?.role === 'patient' || m?.role === 'staff') return m.role;
    }
  } catch { /* fall through */ }
  return parseRole(p.identity);
};


const VideoRoom: React.FC<VideoRoomProps> = ({
  consultation,
  userRole,
  onEnd,
  onLeave,
  guestToken,
  userName,
}) => {
  const { t } = useTranslation('dashboard');
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContainer = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const cancelledRef = useRef(false);
  const heartbeatRef = useRef<number | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const mediaErrorRetryRef = useRef(0);
  // Raw MediaStream preview so the local user sees themselves immediately,
  // even if LiveKit's publish is still in flight or fails silently.
  const previewStreamRef = useRef<MediaStream | null>(null);
  const previewScreenStreamRef = useRef<MediaStream | null>(null);



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
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [showSessionEndingBanner, setShowSessionEndingBanner] = useState(false);
  const [sessionEndingDismissed, setSessionEndingDismissed] = useState(false);
  const [iframeBlocked, setIframeBlocked] = useState(false);

  /* ---------- Network adaptation ---------- */
  const [netQuality, setNetQuality] = useState<'unknown' | 'excellent' | 'good' | 'poor'>('unknown');
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const lowBandwidthRef = useRef(false);
  const poorSinceRef = useRef<number | null>(null);

  /** True when the browser reports a slow link or data-saver mode. */
  const prefersLowData = useCallback((): boolean => {
    try {
      const c = (navigator as any).connection;
      if (!c) return false;
      if (c.saveData) return true;
      return ['slow-2g', '2g', '3g'].includes(c.effectiveType);
    } catch {
      return false;
    }
  }, []);

  /** Swap the local camera capture profile between normal and low bandwidth. */
  const applyVideoProfile = useCallback(async (low: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    const track = pub?.track as LocalVideoTrack | undefined;
    if (!track || typeof (track as any).restartTrack !== 'function') return;
    try {
      await track.restartTrack({
        resolution: low ? VideoPresets.h180.resolution : VideoPresets.h360.resolution,
      });
    } catch (e) {
      console.warn('camera profile switch failed', e);
    }
  }, []);



  /* ---------- Tile sizing + self-view preferences (persisted) ---------- */
  const stageRef = useRef<HTMLDivElement>(null);
  const readTilePrefs = (): { widths?: Record<string, number>; hideSelf?: boolean } => {
    try {
      return JSON.parse(localStorage.getItem(TILE_PREFS_KEY) || '{}') || {};
    } catch {
      return {};
    }
  };
  const [tileWidths, setTileWidths] = useState<Record<string, number>>(
    () => readTilePrefs().widths || {},
  );
  const [hideSelfView, setHideSelfView] = useState<boolean>(() => Boolean(readTilePrefs().hideSelf));

  useEffect(() => {
    try {
      localStorage.setItem(
        TILE_PREFS_KEY,
        JSON.stringify({ widths: tileWidths, hideSelf: hideSelfView }),
      );
    } catch {
      /* noop */
    }
  }, [tileWidths, hideSelfView]);


  /* ---------- Slot mapping ---------- */
  /** Role to use for a remote participant. If a stale token reports the same
   * role as the local user, treat the remote as the counterpart so its camera
   * never overwrites the local slot. */
  const remoteRoleFor = useCallback(
    (p: { identity: string; metadata?: string }): 'doctor' | 'patient' | 'staff' | 'guest' => {
      const role = participantRole(p);
      if (role === userRole && (role === 'doctor' || role === 'patient')) {
        return role === 'doctor' ? 'patient' : 'doctor';
      }
      return role;
    },
    [userRole],
  );

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

  /** Attach a raw MediaStream to a slot (used for the local preview before
   * LiveKit has published a track). Marked with data-preview so we can find
   * and swap it out once the real track is published. */
  const attachPreviewStream = (slot: SlotId, stream: MediaStream) => {
    const node = slotNodeRefs.current[slot];
    if (!node) return;
    Array.from(node.querySelectorAll('video,audio')).forEach((el) => el.remove());
    const v = document.createElement('video');
    v.srcObject = stream;
    v.autoplay = true;
    v.muted = true;
    v.playsInline = true;
    v.setAttribute('data-preview', '1');
    v.style.width = '100%';
    v.style.height = '100%';
    v.style.objectFit = 'cover';
    node.appendChild(v);
    setSlotHasTrack((s) => (s[slot] ? s : { ...s, [slot]: true }));
  };

  const stopPreviewStream = (which: 'camera' | 'screen') => {
    const ref = which === 'camera' ? previewStreamRef : previewScreenStreamRef;
    const stream = ref.current;
    if (stream) {
      try { stream.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
      ref.current = null;
    }
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
      const role = remoteRoleFor(p);
      const slot = sourceToSlot(track.source, false, role);
      if (slot) attachToSlot(slot, track, false);
    },
    [sourceToSlot, remoteRoleFor],
  );

  const handleRemoteTrackGone = useCallback(
    (track: RemoteTrack, _pub: RemoteTrackPublication, p: RemoteParticipant) => {
      const role = remoteRoleFor(p);
      const slot = sourceToSlot(track.source, false, role);
      if (slot && slotTrackRefs.current[slot] === track) clearSlot(slot);
    },
    [sourceToSlot, remoteRoleFor],
  );

  const handleLocalPublished = useCallback((pub: LocalTrackPublication) => {
    const track = pub.track;
    if (!track) return;
    setMediaStarted(true);
    if (track.kind === Track.Kind.Audio) {
      setIsAudioOn(true);
      return;
    }
    if (track.source === Track.Source.Camera) {
      setIsVideoOn(true);
      stopPreviewStream('camera');
    }
    if (track.source === Track.Source.ScreenShare) {
      setIsScreenSharing(true);
      stopPreviewStream('screen');
    }
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
    const role = remoteRoleFor(p);
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
  }, [sourceToSlot, remoteRoleFor]);

  const updateParticipantCount = useCallback(() => {
    if (roomRef.current) setParticipantCount(roomRef.current.numParticipants + 1);
  }, []);

  /** React to the locally measured connection quality. */
  const onLocalQuality = useCallback((q: ConnectionQuality) => {
    if (q === ConnectionQuality.Poor) {
      setNetQuality('poor');
      if (!lowBandwidthRef.current) {
        lowBandwidthRef.current = true;
        setLowBandwidth(true);
        void applyVideoProfile(true);
        toast.message(
          t('videoConsultation.lowBandwidth', 'Weak connection — video quality reduced to keep audio clear.'),
        );
      }
      if (poorSinceRef.current == null) {
        poorSinceRef.current = Date.now();
      } else if (Date.now() - poorSinceRef.current > 15000 && isVideoOnRef.current) {
        poorSinceRef.current = Date.now();
        const room = roomRef.current;
        if (room) {
          room.localParticipant.setCameraEnabled(false).catch(() => { /* noop */ });
          isVideoOnRef.current = false;
          setIsVideoOn(false);
          toast.message(
            t('videoConsultation.switchedAudioOnly', 'Switched to audio-only to keep the call stable. You can turn the camera back on anytime.'),
          );
        }
      }
    } else if (q === ConnectionQuality.Excellent || q === ConnectionQuality.Good) {
      setNetQuality(q === ConnectionQuality.Excellent ? 'excellent' : 'good');
      poorSinceRef.current = null;
      if (lowBandwidthRef.current) {
        lowBandwidthRef.current = false;
        setLowBandwidth(false);
        void applyVideoProfile(false);
      }
    }
  }, [applyVideoProfile, t]);

  /* ---------- Connect lifecycle ---------- */
  useEffect(() => {
    cancelledRef.current = false;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      // Bandwidth-friendly capture defaults — 360p is plenty for a
      // consultation and keeps the uplink usable on slow connections.
      videoCaptureDefaults: {
        resolution: { ...VideoPresets.h360.resolution, frameRate: 24 },
      },
      publishDefaults: {
        simulcast: true,
        videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
        videoEncoding: { maxBitrate: 500_000, maxFramerate: 24 },
        screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,
        // Opus mono with DTX (silence costs nothing) and RED (loss recovery).
        audioPreset: { maxBitrate: 24_000 },
        dtx: true,
        red: true,
        stopMicTrackOnMute: false,
        degradationPreference: 'maintain-framerate',
      },
      reconnectPolicy: {
        // Fast first retries so a brief drop recovers in well under a second.
        nextRetryDelayInMs: (ctx: { retryCount: number }) =>
          Math.min(8000, 200 * Math.pow(2, ctx.retryCount)),
        maxRetries: 50,

      } as any,
    });
    roomRef.current = room;

    const reattachAll = () => {
      try {
        room.remoteParticipants.forEach((p) => {
          p.trackPublications.forEach((pub) => {
            if (pub.track && pub.isSubscribed) {
              handleRemoteTrack(pub.track as RemoteTrack, pub as RemoteTrackPublication, p);
            }
          });
        });
      } catch (e) { console.warn('reattachAll failed', e); }
    };

    const safeEnableMic = async () => {
      try {
        if (isAudioOnRef.current && !room.localParticipant.isMicrophoneEnabled) {
          await room.localParticipant.setMicrophoneEnabled(true);
        }
      } catch (e) { console.warn('mic re-enable failed', e); }
    };
    const safeEnableCam = async () => {
      try {
        if (isVideoOnRef.current && !room.localParticipant.isCameraEnabled) {
          await room.localParticipant.setCameraEnabled(true);
        }
      } catch (e) { console.warn('cam re-enable failed', e); }
    };

    room.on(RoomEvent.TrackSubscribed, handleRemoteTrack);
    room.on(RoomEvent.TrackUnsubscribed, handleRemoteTrackGone);
    room.on(RoomEvent.LocalTrackPublished, handleLocalPublished);
    room.on(RoomEvent.LocalTrackUnpublished, handleLocalUnpublished);
    room.on(RoomEvent.ParticipantConnected, updateParticipantCount);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantGone);
    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      if (cancelledRef.current) return;
      try {
        if (state === ConnectionState.Connected) setStatus('connected');
        else if (state === ConnectionState.Reconnecting) setStatus('connecting');
        else if (state === ConnectionState.Disconnected) setStatus('disconnected');
      } catch (e) { console.warn(e); }
    });
    room.on(RoomEvent.Reconnected, () => {
      if (cancelledRef.current) return;
      setStatus('connected');
      (async () => {
        try {
          reattachAll();
          await safeEnableMic();
          await safeEnableCam();
        } catch (e) { console.warn('reconnect handler failed', e); }
      })().catch(() => { /* swallow */ });
    });
    room.on(RoomEvent.Reconnecting, () => {
      if (cancelledRef.current) return;
      setStatus('connecting');
    });
    room.on(RoomEvent.MediaDevicesError, (err: Error) => {
      try {
        mediaErrorRetryRef.current += 1;
        if (mediaErrorRetryRef.current <= 3) {
          window.setTimeout(() => {
            (async () => {
              try {
                await safeEnableMic();
                await safeEnableCam();
              } catch { /* noop */ }
            })().catch(() => { /* swallow */ });
          }, 3000);
          return;
        }
        explainMediaError(err, t('videoConsultation.deviceInUse'));
        setIsAudioOn(false);
        setIsVideoOn(false);
        setIsScreenSharing(false);
      } catch (e) { console.warn(e); }
    });

    // Heartbeat — every 30s ensure expected local tracks are still published.
    heartbeatRef.current = window.setInterval(() => {
      if (cancelledRef.current) return;
      if (room.state !== ConnectionState.Connected) return;
      (async () => {
        try {
          await safeEnableMic();
          await safeEnableCam();
        } catch { /* noop */ }
      })().catch(() => { /* swallow */ });
    }, 30000) as unknown as number;

    const timeout = window.setTimeout(() => {
      if (!cancelledRef.current && room.state !== ConnectionState.Connected) {
        setStatus('error');
        setErrorMsg(t('videoConsultation.couldNotJoin'));
      }
    }, 20000);


    (async () => {
      try {
        setStatus('connecting');
        setErrorMsg(null);

        if (!guestToken) {
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData?.session?.access_token) {
            if (!cancelledRef.current) {
              setStatus('error');
              setErrorMsg(t('videoConsultation.couldNotJoin'));
            }
            return;
          }
        }

        const resp = await supabase.functions.invoke('livekit-token', {
          body: guestToken
            ? { guestToken, displayName: userName, roomId: consultation.room_id }
            : { appointmentId: consultation.appointment_id, roomId: consultation.room_id },
        });

        if (cancelledRef.current) return;
        if (resp.error || !resp.data?.token) {
          setStatus('error');
          setErrorMsg(resp.error?.message || t('videoConsultation.couldNotJoin'));
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
        setErrorMsg(err?.message || t('videoConsultation.couldNotJoin'));
      }
    })();

    return () => {
      cancelledRef.current = true;
      window.clearTimeout(timeout);
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      try { room.removeAllListeners(); } catch { /* noop */ }
      (['doctor-camera', 'doctor-screen', 'patient-camera'] as SlotId[]).forEach((s) => {
        const tr = slotTrackRefs.current[s];
        if (tr) {
          try { tr.detach().forEach((el) => el.remove()); } catch { /* noop */ }
          slotTrackRefs.current[s] = null;
        }
      });
      try { stopPreviewStream('camera'); } catch { /* noop */ }
      try { stopPreviewStream('screen'); } catch { /* noop */ }

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
      if (isInIframe()) {
        setIframeBlocked(true);
        toast.error(t('videoConsultation.iframeBlockedTitle', 'Camera & microphone are blocked in this preview'));
      } else {
        toast.error(t('videoConsultation.permissionDenied'));
      }
    } else if (name === 'NotFoundError') {
      toast.error(t('videoConsultation.noDeviceFound'));
    } else if (name === 'NotReadableError') {
      toast.error(t('videoConsultation.deviceInUse'));
    } else if (name === 'SecurityError' || name === 'NotSupportedError') {
      toast.error(t('videoConsultation.secureContextRequired'));
    } else {
      toast.error(err?.message || fallback);
    }
  };


  const requireConnected = () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) {
      toast.error(t('videoConsultation.stillConnecting'));
      return null;
    }
    return room;
  };


  const startMedia = useCallback(async () => {
    const room = requireConnected();
    if (!room) return;
    setStartingMedia(true);
    setIframeBlocked(false);

    // Microphone is mandatory: probe it first and abort the join if it fails.
    let micStream: MediaStream | null = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      explainMediaError(err, t('videoConsultation.micRequired', 'A microphone is required to join the consultation. Allow microphone access and try again.'));
      setStartingMedia(false);
      return;
    }
    // The probe stream is only used to confirm/prompt permission; LiveKit
    // publishes its own track below.
    try { micStream.getTracks().forEach((tr) => tr.stop()); } catch { /* noop */ }

    // Camera is optional: a missing or denied camera must not block the call.
    let camStream: MediaStream | null = null;
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch {
      camStream = null;
    }

    const localCamSlot: SlotId = userRole === 'patient' ? 'patient-camera' : 'doctor-camera';
    if (camStream) {
      // Attach preview to local camera slot right away so the user sees
      // themselves even if the LiveKit publish is still in flight.
      previewStreamRef.current = camStream;
      try { attachPreviewStream(localCamSlot, camStream); } catch { /* noop */ }
    }
    setMediaStarted(true);

    let micOk = false;
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      micOk = true;
      setIsAudioOn(true);
    } catch (err: any) {
      explainMediaError(err, t('videoConsultation.micRequired', 'A microphone is required to join the consultation. Allow microphone access and try again.'));
    }

    if (camStream) {
      try {
        await room.localParticipant.setCameraEnabled(true);
        setIsVideoOn(true);
      } catch {
        // Keep the raw preview visible; audio-only participation continues.
        setIsVideoOn(false);
        toast.message(t('videoConsultation.joinedWithoutCamera', 'Joined without a camera. You can turn it on later.'));
      }
    } else {
      setIsVideoOn(false);
      toast.message(t('videoConsultation.joinedWithoutCamera', 'Joined without a camera. You can turn it on later.'));
    }

    if (!micOk) setIsAudioOn(false);
    setStartingMedia(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, t]);


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
      if (next) {
        // Block if a remote participant already has an active screen-share publication.
        let someoneElseSharing = false;
        room.remoteParticipants.forEach((p) => {
          p.trackPublications.forEach((pub) => {
            if (pub.source === Track.Source.ScreenShare && (pub.track || pub.isSubscribed)) {
              someoneElseSharing = true;
            }
          });
        });
        if (someoneElseSharing) {
          toast.error(t('videoConsultation.screenShareBlocked'));
          return;
        }
      }
      await room.localParticipant.setScreenShareEnabled(next, { audio: true });
      isScreenSharingRef.current = next;
      setIsScreenSharing(next);
      if (next) {
        // Auto-focus the shared screen so the sharer sees their own share
        // full-size (previously the sharer only saw a small side thumbnail).
        setFocusedSlot('doctor-screen');
      }

      if (next) {
        const pub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
        const tr = pub?.track;
        if (tr) {
          const onEnded = () => {
            isScreenSharingRef.current = false;
            setIsScreenSharing(false);
            try { tr.off('ended' as any, onEnded); } catch { /* noop */ }
          };
          try { tr.on('ended' as any, onEnded); } catch { /* noop */ }
          const mst = (tr as any).mediaStreamTrack as MediaStreamTrack | undefined;
          if (mst) mst.addEventListener('ended', onEnded, { once: true });
        }
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        toast.error(t('videoConsultation.screenShareCancelled'));
      } else {
        explainMediaError(err, 'Failed to start screen sharing.');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (onEnd) onEnd(notes);
    else onLeave();
  }, [notes, onEnd, onLeave]);

  const handleLeave = useCallback(() => {
    try { roomRef.current?.disconnect(true); } catch { /* noop */ }
    onLeave();
  }, [onLeave]);

  /* ---------- Session timer (1h auto-close) ---------- */
  useEffect(() => {
    if (status !== 'connected' || !mediaStarted) return;
    if (sessionStartRef.current == null) sessionStartRef.current = Date.now();

    const tick = () => {
      if (sessionStartRef.current == null) return;
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      const remaining = Math.max(0, SESSION_MAX_SECONDS - elapsed);
      setRemainingSeconds(remaining);
      if (remaining <= WARN_AT_SECONDS && !sessionEndingDismissed) {
        setShowSessionEndingBanner(true);
      }
      if (remaining <= 0) {
        if (timerIntervalRef.current) {
          window.clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        try { handleEndCall(); } catch (e) { console.warn(e); }
      }
    };
    tick();
    timerIntervalRef.current = window.setInterval(tick, 1000) as unknown as number;
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [status, mediaStarted, sessionEndingDismissed, handleEndCall]);

  const formatRemaining = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };


  /* ---------- Render ---------- */
  const slots: SlotInfo[] = useMemo(
    () => [
      {
        id: 'doctor-camera',
        label: userRole === 'doctor' ? t('videoConsultation.youDoctor') : t('videoConsultation.doctor'),
        icon: <Stethoscope className="h-8 w-8" />,
        emptyHint: userRole === 'doctor'
          ? t('videoConsultation.yourCameraOff')
          : t('videoConsultation.waitingDoctorCamera'),
        mirror: userRole === 'doctor',
        isLocal: userRole === 'doctor',
        hasTrack: slotHasTrack['doctor-camera'],
      },
      {
        id: 'patient-camera',
        label: userRole === 'patient' ? t('videoConsultation.youPatient') : t('videoConsultation.patient'),
        icon: <User className="h-8 w-8" />,
        emptyHint: userRole === 'patient'
          ? t('videoConsultation.yourCameraOff')
          : t('videoConsultation.waitingPatientCamera'),
        mirror: userRole === 'patient',
        isLocal: userRole === 'patient',
        hasTrack: slotHasTrack['patient-camera'],
      },
      {
        id: 'doctor-screen',
        label: t('videoConsultation.doctorScreen'),
        icon: <MonitorPlay className="h-8 w-8" />,
        emptyHint: userRole === 'doctor'
          ? t('videoConsultation.clickToShare')
          : t('videoConsultation.doctorNotSharing'),
        mirror: false,
        isLocal: userRole === 'doctor',
        hasTrack: slotHasTrack['doctor-screen'],
      },
    ],
    [slotHasTrack, userRole, t],
  );


  
  const localCameraSlot: SlotId = userRole === 'doctor' ? 'doctor-camera' : 'patient-camera';

  // Side tiles: everything not focused, minus the local self-view when hidden.
  const sideInfos = slots.filter(
    (s) => s.id !== focusedSlot && !(hideSelfView && s.id === localCameraSlot),
  );

  const sideWidth = (id: SlotId) => tileWidths[id] ?? DEFAULT_TILE_WIDTH;
  const sideHeight = (id: SlotId) => Math.round(sideWidth(id) * 0.5625);

  const maxSideWidth = sideInfos.length
    ? Math.max(...sideInfos.map((s) => sideWidth(s.id)))
    : 0;

  const sideTop = (id: SlotId) => {
    let top = 8;
    for (const s of sideInfos) {
      if (s.id === id) break;
      top += sideHeight(s.id) + 8;
    }
    return top;
  };

  const startResize = (id: SlotId) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = sideWidth(id);
    const stageW = stageRef.current?.clientWidth ?? 800;
    const maxW = Math.max(MIN_TILE_WIDTH, Math.min(MAX_TILE_WIDTH, stageW - 160));
    const move = (ev: PointerEvent) => {
      // handle sits on the LEFT edge of the tile → dragging left grows it
      const next = Math.round(Math.min(maxW, Math.max(MIN_TILE_WIDTH, startW + (startX - ev.clientX))));
      setTileWidths((prev) => ({ ...prev, [id]: next }));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // All 3 slots are siblings in ONE container so React never unmounts them
  // when focus changes — only their CSS/inline styles update. This is what
  // stops the live stream from being "disturbed" on every UI action.
  const renderSlot = (info: SlotInfo) => {
    const isFocused = info.id === focusedSlot;
    const isHiddenSelf = hideSelfView && info.id === localCameraSlot && !isFocused;

    const style: React.CSSProperties = isFocused
      ? {
          position: 'absolute',
          top: 8,
          bottom: 8,
          left: 8,
          right: maxSideWidth ? maxSideWidth + 16 : 8,
          zIndex: 10,
        }
      : {
          position: 'absolute',
          right: 8,
          top: sideTop(info.id),
          width: sideWidth(info.id),
          height: sideHeight(info.id),
          zIndex: 20,
          cursor: 'pointer',
          visibility: isHiddenSelf ? 'hidden' : 'visible',
          pointerEvents: isHiddenSelf ? 'none' : 'auto',
        };

    return (
      <div
        key={info.id}
        onClick={() => !isFocused && setFocusedSlot(info.id)}
        onDoubleClick={() =>
          !isFocused && setTileWidths((prev) => ({ ...prev, [info.id]: DEFAULT_TILE_WIDTH }))
        }
        style={style}
        className="bg-muted rounded-md overflow-hidden border border-border hover:border-primary/60"
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
        {!isFocused && !isHiddenSelf && (
          <div
            role="separator"
            aria-label={t('videoConsultation.resizeTile', 'Resize tile')}
            title={t('videoConsultation.resizeTile', 'Resize tile')}
            onPointerDown={startResize(info.id)}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-0 bottom-0 z-30 w-3 cursor-ew-resize bg-gradient-to-r from-background/70 to-transparent flex items-center justify-center"
          >
            <span className="h-8 w-0.5 rounded-full bg-foreground/50" />
          </div>
        )}
        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-foreground/90 bg-background/60 backdrop-blur px-2 py-0.5 rounded">
          <span className="truncate">{info.label}</span>
          {info.id === 'doctor-screen' && info.hasTrack && (
            <span className="text-primary">{t('videoConsultation.live')}</span>
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
      <div className="flex items-center justify-between p-3 border-b border-border bg-card gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge variant={status === 'connected' ? 'default' : 'secondary'}>
            {status === 'connected'
              ? t('videoConsultation.live')
              : status === 'connecting'
                ? t('videoConsultation.connecting')
                : status === 'error'
                  ? t('videoConsultation.error')
                  : status === 'disconnected'
                    ? t('videoConsultation.disconnected')
                    : t('videoConsultation.idle')}
          </Badge>
          <span className="text-xs text-muted-foreground truncate max-w-[40ch]">
            {t('videoConsultation.room')}: {consultation.room_id}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {remainingSeconds != null && status === 'connected' && (
            <Badge
              variant={remainingSeconds <= WARN_AT_SECONDS ? 'destructive' : 'outline'}
              className="font-mono tabular-nums"
            >
              {t('videoConsultation.sessionRemainingTime', { time: formatRemaining(remainingSeconds) })}
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {participantCount}
          </Badge>
        </div>
      </div>

      {/* 5-minute warning banner */}
      {showSessionEndingBanner && !sessionEndingDismissed && status === 'connected' && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-destructive/10 border-b border-destructive/30 text-sm text-destructive-foreground">
          <span className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t('videoConsultation.sessionEnding')}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            aria-label={t('videoConsultation.sessionEndingDismiss')}
            onClick={() => setSessionEndingDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Stage — all 3 slots are positioned siblings, never re-mounted */}
      <div ref={stageRef} className="flex-1 relative bg-black overflow-hidden">
        {slots.map((s) => renderSlot(s))}

        <div ref={audioContainer} className="hidden" />

        {status === 'connecting' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('videoConsultation.connectingToRoom')}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 p-4">
            <Card className="p-6 max-w-md text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
              <h4 className="font-medium">{t('videoConsultation.couldNotJoin')}</h4>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setReconnectKey((k) => k + 1)} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> {t('videoConsultation.retryButton')}
                </Button>
                <Button onClick={handleLeave} variant="outline">{t('videoConsultation.leaveButton')}</Button>
              </div>
            </Card>
          </div>
        )}

        {status === 'disconnected' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/90 p-4">
            <Card className="p-6 max-w-md text-center space-y-3">
              <h4 className="font-medium">{t('videoConsultation.youWereDisconnected')}</h4>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setReconnectKey((k) => k + 1)} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> {t('videoConsultation.rejoinButton')}
                </Button>
                <Button onClick={handleLeave} variant="outline">{t('videoConsultation.leaveButton')}</Button>
              </div>
            </Card>
          </div>
        )}


        {status === 'connected' && !mediaStarted && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/85 p-4">
            <Card className="p-6 max-w-md text-center space-y-4">
              <PlayCircle className="h-10 w-10 text-primary mx-auto" />
              <div>
                <h4 className="font-medium">{t('videoConsultation.readyToJoin')}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('videoConsultation.browserWillAsk')}
                </p>
              </div>

              {iframeBlocked && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-left space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      {t(
                        'videoConsultation.iframeBlockedBody',
                        'The video call needs to run in its own browser tab so it can request camera, microphone, and screen-share permissions.'
                      )}
                    </p>
                  </div>
                  <Button size="sm" onClick={openCallInNewTab} className="w-full gap-2">
                    <ExternalLink className="h-4 w-4" />
                    {t('videoConsultation.openInNewTab', 'Open call in a new tab')}
                  </Button>
                </div>
              )}

              <Button onClick={startMedia} disabled={startingMedia} className="gap-2">
                {startingMedia ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
                {t('videoConsultation.startCameraAndMic')}
              </Button>
            </Card>
          </div>
        )}

        {showNotes && userRole === 'doctor' && (
          <div className="absolute right-3 top-3 w-72 z-20">
            <Card className="p-3 bg-card/95 backdrop-blur">
              <h4 className="font-medium mb-2 text-sm">{t('videoConsultation.consultationNotes')}</h4>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('videoConsultation.notesPlaceholder')}
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
            variant={hideSelfView ? 'secondary' : 'default'}
            size="lg"
            onClick={() => setHideSelfView((v) => !v)}
            className="rounded-full h-12 w-12"
            aria-label={
              hideSelfView
                ? t('videoConsultation.showSelfView', 'Show my camera')
                : t('videoConsultation.hideSelfView', 'Hide my camera')
            }
            title={
              hideSelfView
                ? t('videoConsultation.showSelfView', 'Show my camera')
                : t('videoConsultation.hideSelfView', 'Hide my camera')
            }
          >
            {hideSelfView ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>

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
