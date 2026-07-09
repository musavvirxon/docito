import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Clock,
  User,
  Calendar,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  PlayCircle,
} from 'lucide-react';
import { VideoConsultation } from '@/hooks/useVideoConsultation';
import { format } from 'date-fns';
import {
  isInIframe,
  isSecureMediaContext,
  featurePolicyBlocks,
  openCallInNewTab,
} from '@/lib/mediaEnv';

interface VideoWaitingRoomProps {
  consultation: VideoConsultation;
  userRole: 'doctor' | 'patient';
  otherPartyName: string;
  onJoin: () => void;
  onCancel: () => void;
}

const VideoWaitingRoom: React.FC<VideoWaitingRoomProps> = ({
  consultation,
  userRole,
  otherPartyName,
  onJoin,
  onCancel,
}) => {
  const { t } = useTranslation('dashboard');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [hasStream, setHasStream] = useState(false);
  const [starting, setStarting] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [showIframeBanner, setShowIframeBanner] = useState(false);
  const [showBrowserBlockedBanner, setShowBrowserBlockedBanner] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const framed = isInIframe();
  const secure = isSecureMediaContext();

  const isOtherPartyWaiting = userRole === 'doctor'
    ? !!consultation.patient_joined_at
    : !!consultation.doctor_joined_at;

  const otherPartyLabel = userRole === 'doctor'
    ? t('videoConsultation.patient')
    : t('videoConsultation.doctor');

  const stopStream = useCallback(() => {
    const s = mediaStreamRef.current;
    if (s) {
      s.getTracks().forEach((tr) => {
        try { tr.stop(); } catch { /* noop */ }
      });
      mediaStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      try { videoPreviewRef.current.srcObject = null; } catch { /* noop */ }
    }
  }, []);

  // Pre-check whether the browser has already denied camera/mic so we can
  // surface an actionable message instead of a silent failure.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.permissions?.query) return;
        const [cam, mic] = await Promise.all([
          navigator.permissions.query({ name: 'camera' as PermissionName }).catch(() => null),
          navigator.permissions.query({ name: 'microphone' as PermissionName }).catch(() => null),
        ]);
        if (cancelled) return;
        if (cam?.state === 'denied' || mic?.state === 'denied') {
          setShowBrowserBlockedBanner(true);
        }
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  // MUST be called directly from a user gesture (button click) — no `await`
  // before the getUserMedia call, so the browser preserves gesture provenance
  // and iframe permissions policies can actually grant access.
  const startMedia = useCallback(async () => {
    setDeviceError(null);
    setShowIframeBanner(false);
    setStarting(true);

    if (!secure) {
      setDeviceError(t('videoConsultation.secureContextRequired'));
      setStarting(false);
      return;
    }

    if (framed && featurePolicyBlocks('camera')) {
      setShowIframeBanner(true);
      setStarting(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
      setHasStream(true);
      setIsAudioEnabled(true);
      setIsVideoEnabled(true);
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        if (framed) {
          setShowIframeBanner(true);
        } else {
          setShowBrowserBlockedBanner(true);
          setDeviceError(t('videoConsultation.permissionDenied'));
        }
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setDeviceError(t('videoConsultation.noDeviceFound'));
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setDeviceError(t('videoConsultation.deviceInUse'));
      } else if (name === 'SecurityError' || name === 'NotSupportedError') {
        setDeviceError(t('videoConsultation.secureContextRequired'));
      } else {
        console.error('getUserMedia error', err);
        setDeviceError(err?.message || t('videoConsultation.noDeviceFound'));
      }
    } finally {
      setStarting(false);
    }
  }, [framed, secure, t]);

  const toggleAudio = () => {
    try {
      const s = mediaStreamRef.current;
      if (!s) return;
      s.getAudioTracks().forEach((tr) => { tr.enabled = !isAudioEnabled; });
      setIsAudioEnabled((v) => !v);
    } catch (e) { console.warn(e); }
  };

  const toggleVideo = () => {
    try {
      const s = mediaStreamRef.current;
      if (!s) return;
      s.getVideoTracks().forEach((tr) => { tr.enabled = !isVideoEnabled; });
      setIsVideoEnabled((v) => !v);
    } catch (e) { console.warn(e); }
  };

  const handleJoin = () => {
    // Release the preview stream so LiveKit can acquire the devices cleanly.
    stopStream();
    onJoin();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('videoConsultation.waitingRoom.title')}</CardTitle>
          <p className="text-muted-foreground">
            {t('videoConsultation.waitingRoom.otherParty', { role: otherPartyLabel, name: otherPartyName })}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(consultation.scheduled_start), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {format(new Date(consultation.scheduled_start), 'h:mm a')} -
              {format(new Date(consultation.scheduled_end), 'h:mm a')}
            </div>
          </div>

          {showIframeBanner && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">
                  {t('videoConsultation.iframeBlockedTitle', 'Camera & microphone are blocked in this preview')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'videoConsultation.iframeBlockedBody',
                    'The video call needs to run in its own browser tab so it can request camera, microphone, and screen-share permissions.'
                  )}
                </p>
                <Button size="sm" onClick={openCallInNewTab} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  {t('videoConsultation.openInNewTab', 'Open call in a new tab')}
                </Button>
              </div>
            </div>
          )}

          {showBrowserBlockedBanner && !showIframeBanner && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm">
                {t(
                  'videoConsultation.browserBlockedHint',
                  'Camera or microphone is blocked in your browser. Click the lock icon in the address bar to allow them, then click Start again.'
                )}
              </p>
            </div>
          )}

          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {!hasStream ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
                <Video className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground max-w-sm">
                  {t(
                    'videoConsultation.startPreviewHint',
                    'Click Start to preview your camera and microphone before joining.'
                  )}
                </p>
                <Button onClick={startMedia} disabled={starting} className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  {starting
                    ? t('videoConsultation.startingMedia', 'Starting…')
                    : t('videoConsultation.startCameraMic', 'Start camera & microphone')}
                </Button>
                {deviceError && (
                  <p className="text-xs text-destructive mt-1">{deviceError}</p>
                )}
              </div>
            ) : (
              <>
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <Avatar className="h-24 w-24">
                      <AvatarFallback className="text-3xl">
                        <User className="h-12 w-12" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  <Button
                    variant={isAudioEnabled ? 'secondary' : 'destructive'}
                    size="icon"
                    onClick={toggleAudio}
                    className="rounded-full"
                    aria-label={isAudioEnabled
                      ? t('videoConsultation.waitingRoom.muteMic')
                      : t('videoConsultation.waitingRoom.unmuteMic')}
                  >
                    {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant={isVideoEnabled ? 'secondary' : 'destructive'}
                    size="icon"
                    onClick={toggleVideo}
                    className="rounded-full"
                    aria-label={isVideoEnabled
                      ? t('videoConsultation.waitingRoom.turnOffCam')
                      : t('videoConsultation.waitingRoom.turnOnCam')}
                  >
                    {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-2">
            {isOtherPartyWaiting ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {t('videoConsultation.waitingRoom.otherWaiting', { role: otherPartyLabel })}
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {t('videoConsultation.waitingRoom.waitingFor', { role: otherPartyLabel.toLowerCase() })}
              </Badge>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onCancel}>
              {t('videoConsultation.waitingRoom.cancel')}
            </Button>
            <Button onClick={handleJoin} className="gap-2">
              <Video className="h-4 w-4" />
              {t('videoConsultation.waitingRoom.join')}
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>{t('videoConsultation.waitingRoom.tipsTitle')}</p>
            <ul className="text-xs space-y-1">
              <li>• {t('videoConsultation.waitingRoom.tipInternet')}</li>
              <li>• {t('videoConsultation.waitingRoom.tipHeadphones')}</li>
              <li>• {t('videoConsultation.waitingRoom.tipQuiet')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoWaitingRoom;
