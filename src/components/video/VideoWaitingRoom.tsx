import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const videoPreviewRef = React.useRef<HTMLVideoElement>(null);

  const isOtherPartyWaiting = userRole === 'doctor' 
    ? !!consultation.patient_joined_at 
    : !!consultation.doctor_joined_at;

  useEffect(() => {
    const initMediaDevices = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setMediaStream(stream);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        setDeviceError('Unable to access camera/microphone. Please check permissions.');
      }
    };

    initMediaDevices();

    return () => {
      mediaStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const toggleAudio = () => {
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleVideo = () => {
    if (mediaStream) {
      mediaStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const handleJoin = () => {
    mediaStream?.getTracks().forEach(track => track.stop());
    onJoin();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Video Consultation</CardTitle>
          <p className="text-muted-foreground">
            {userRole === 'doctor' ? 'Patient' : 'Doctor'}: {otherPartyName}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scheduled Time */}
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

          {/* Video Preview */}
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

            {/* Preview Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <Button
                variant={isAudioEnabled ? 'secondary' : 'destructive'}
                size="icon"
                onClick={toggleAudio}
                className="rounded-full"
              >
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              <Button
                variant={isVideoEnabled ? 'secondary' : 'destructive'}
                size="icon"
                onClick={toggleVideo}
                className="rounded-full"
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-center gap-2">
            {isOtherPartyWaiting ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {userRole === 'doctor' ? 'Patient' : 'Doctor'} is waiting
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Waiting for {userRole === 'doctor' ? 'patient' : 'doctor'}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleJoin} className="gap-2">
              <Video className="h-4 w-4" />
              Join Consultation
            </Button>
          </div>

          {/* Tips */}
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>Tips for a smooth consultation:</p>
            <ul className="text-xs space-y-1">
              <li>• Ensure stable internet connection</li>
              <li>• Use headphones for better audio</li>
              <li>• Find a quiet, well-lit space</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoWaitingRoom;
