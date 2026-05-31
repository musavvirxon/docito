import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { VideoConsultation } from '@/hooks/useVideoConsultation';
import { format } from 'date-fns';

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
  const [, setHasStream] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const isOtherPartyWaiting = userRole === 'doctor'
    ? !!consultation.patient_joined_at
    : !!consultation.doctor_joined_at;

  const otherPartyLabel = userRole === 'doctor'
    ? t('videoConsultation.patient')
    : t('videoConsultation.doctor');

  const stopStream = () => {
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
  };

  useEffect(() => {
    let cancelled = false;

    const acquire = async (isRetry = false): Promise<void> => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        mediaStreamRef.current = stream;
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
        setHasStream(true);
        setDeviceError(null);
      } catch (error: unknown) {
        if (cancelled) return;
        const err = error as { name?: string; message?: string };
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setDeviceError(t('videoConsultation.permissionDenied'));
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setDeviceError(t('videoConsultation.noDeviceFound'));
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          if (!isRetry) {
            setDeviceError(t('videoConsultation.deviceInUse'));
            setTimeout(() => {
              if (!cancelled) {
                acquire(true).catch(() => { /* swallow */ });
              }
            }, 2000);
            return;
          }
          setDeviceError(t('videoConsultation.deviceInUse'));
        } else if (name === 'SecurityError' || name === 'NotSupportedError') {
          setDeviceError(t('videoConsultation.secureContextRequired'));
        } else {
          console.error('getUserMedia error', err);
          setDeviceError(t('videoConsultation.noDeviceFound'));
        }
      }
    };

    acquire().catch(() => { /* never escape */ });

    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {deviceError ? (
              <div className="absolute inset-0 flex items-center justify-center text-center p-4">
                <p className="text-destructive">{deviceError}</p>
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
              </>
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
