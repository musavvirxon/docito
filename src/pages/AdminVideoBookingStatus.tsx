import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ModernNavbar from '@/components/home/ModernNavbar';
import ModernFooter from '@/components/home/ModernFooter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Clock, XCircle, Video, Loader2, ExternalLink } from 'lucide-react';

type Booking = {
  id: string;
  status: string;
  topic: string;
  preferred_at: string;
  alternate_at: string | null;
  meeting_link: string | null;
  admin_notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'confirmed':
      return { variant: 'default' as const, icon: CheckCircle2 };
    case 'completed':
      return { variant: 'secondary' as const, icon: CheckCircle2 };
    case 'cancelled':
      return { variant: 'destructive' as const, icon: XCircle };
    default:
      return { variant: 'outline' as const, icon: Clock };
  }
};

export default function AdminVideoBookingStatus() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation(['support', 'common']);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_admin_video_booking_status', { _token: token });
      if (cancelled) return;
      if (error || !data || data.length === 0) {
        setNotFound(true);
      } else {
        setBooking(data[0] as Booking);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const statusKey = booking?.status ?? 'pending';
  const meta = statusBadge(statusKey);
  const StatusIcon = meta.icon;
  const fmt = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleString(i18n.language) : '—';

  return (
    <div className="min-h-screen bg-background">
      <ModernNavbar />
      <div className="container mx-auto px-4 py-16 pt-32 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Video className="w-7 h-7 text-primary" />
          {t('support:videoStatus.title', { defaultValue: 'Video Call Booking Status' })}
        </h1>
        <p className="text-muted-foreground mb-8">
          {t('support:videoStatus.subtitle', { defaultValue: 'Track the status of your booking with the admin team.' })}
        </p>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /> {t('common:loading', { defaultValue: 'Loading…' })}</div>
        )}

        {notFound && !loading && (
          <Card>
            <CardContent className="p-6 text-center space-y-4">
              <p className="text-foreground">{t('support:videoStatus.notFound', { defaultValue: 'Booking not found. Please check your link.' })}</p>
              <Button asChild variant="outline"><Link to={`/${i18n.language}/support`}>{t('support:videoStatus.back', { defaultValue: 'Back to Support' })}</Link></Button>
            </CardContent>
          </Card>
        )}

        {booking && !loading && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>{booking.topic}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('support:videoStatus.requestedOn', { defaultValue: 'Requested' })}: {fmt(booking.created_at)}
                </p>
              </div>
              <Badge variant={meta.variant} className="flex items-center gap-1">
                <StatusIcon className="w-3.5 h-3.5" />
                {t(`support:videoStatus.statuses.${statusKey}`, { defaultValue: statusKey })}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('support:videoStatus.preferredTime', { defaultValue: 'Preferred time' })}</p>
                  <p className="font-medium text-foreground">{fmt(booking.preferred_at)}</p>
                </div>
                {booking.alternate_at && (
                  <div>
                    <p className="text-muted-foreground">{t('support:videoStatus.alternateTime', { defaultValue: 'Alternate time' })}</p>
                    <p className="font-medium text-foreground">{fmt(booking.alternate_at)}</p>
                  </div>
                )}
                {booking.confirmed_at && (
                  <div>
                    <p className="text-muted-foreground">{t('support:videoStatus.confirmedAt', { defaultValue: 'Confirmed at' })}</p>
                    <p className="font-medium text-foreground">{fmt(booking.confirmed_at)}</p>
                  </div>
                )}
                {booking.completed_at && (
                  <div>
                    <p className="text-muted-foreground">{t('support:videoStatus.completedAt', { defaultValue: 'Completed at' })}</p>
                    <p className="font-medium text-foreground">{fmt(booking.completed_at)}</p>
                  </div>
                )}
                {booking.cancelled_at && (
                  <div>
                    <p className="text-muted-foreground">{t('support:videoStatus.cancelledAt', { defaultValue: 'Cancelled at' })}</p>
                    <p className="font-medium text-foreground">{fmt(booking.cancelled_at)}</p>
                  </div>
                )}
              </div>

              {booking.meeting_link && (
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                  <p className="text-sm text-muted-foreground mb-2">{t('support:videoStatus.meetingLink', { defaultValue: 'Meeting link' })}</p>
                  <Button asChild>
                    <a href={booking.meeting_link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t('support:videoStatus.joinMeeting', { defaultValue: 'Join meeting' })}
                    </a>
                  </Button>
                </div>
              )}

              {booking.admin_notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('support:videoStatus.adminNotes', { defaultValue: 'Notes from our team' })}</p>
                  <p className="text-foreground whitespace-pre-wrap">{booking.admin_notes}</p>
                </div>
              )}

              <Button asChild variant="outline" className="w-full">
                <Link to={`/${i18n.language}/support`}>{t('support:videoStatus.back', { defaultValue: 'Back to Support' })}</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <ModernFooter />
    </div>
  );
}
