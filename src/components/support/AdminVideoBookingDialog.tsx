import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Video } from 'lucide-react';

const bookingSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  topic: z.string().trim().min(3).max(200),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  preferred_at: z.string().min(1),
  alternate_at: z.string().optional().or(z.literal('')),
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AdminVideoBookingDialog({ open, onOpenChange }: Props) {
  const { t, i18n } = useTranslation(['support', 'common']);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    topic: '',
    notes: '',
    preferred_at: '',
    alternate_at: '',
  });

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const reset = () => setForm({ name: '', email: '', phone: '', topic: '', notes: '', preferred_at: '', alternate_at: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = bookingSchema.safeParse(form);
    if (!parsed.success) {
      toast({ variant: 'destructive', title: t('support:videoBookingDialog.invalidInput', { defaultValue: 'Please complete all required fields' }) });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('admin_video_bookings')
        .insert({
          user_id: user?.id ?? null,
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone || null,
          topic: parsed.data.topic,
          notes: parsed.data.notes || null,
          preferred_at: new Date(parsed.data.preferred_at).toISOString(),
          alternate_at: parsed.data.alternate_at ? new Date(parsed.data.alternate_at).toISOString() : null,
          timezone: tz,
          language: i18n.language,
        })
        .select('public_token')
        .single();

      if (error) throw error;

      toast({
        title: t('support:videoBookingDialog.successTitle', { defaultValue: 'Request submitted' }),
        description: t('support:videoBookingDialog.successDescription', { defaultValue: 'Track your booking on the status page.' }),
      });
      reset();
      onOpenChange(false);
      if (data?.public_token) {
        navigate(`/${i18n.language}/admin-video-status/${data.public_token}`);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('common:error', { defaultValue: 'Error' }), description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            {t('support:videoBookingDialog.title', { defaultValue: 'Book a video call with our team' })}
          </DialogTitle>
          <DialogDescription>
            {t('support:videoBookingDialog.description', { defaultValue: 'Pick a preferred time and we\'ll confirm via email with a meeting link.' })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('support:videoBookingDialog.name', { defaultValue: 'Full name' })} *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} required />
            </div>
            <div>
              <Label>{t('support:videoBookingDialog.email', { defaultValue: 'Email' })} *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} required />
            </div>
          </div>
          <div>
            <Label>{t('support:videoBookingDialog.phone', { defaultValue: 'Phone (optional)' })}</Label>
            <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={40} />
          </div>
          <div>
            <Label>{t('support:videoBookingDialog.topic', { defaultValue: 'Topic' })} *</Label>
            <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} maxLength={200} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('support:videoBookingDialog.preferredAt', { defaultValue: 'Preferred time' })} *</Label>
              <Input type="datetime-local" value={form.preferred_at} onChange={(e) => setForm({ ...form, preferred_at: e.target.value })} required />
            </div>
            <div>
              <Label>{t('support:videoBookingDialog.alternateAt', { defaultValue: 'Alternate time' })}</Label>
              <Input type="datetime-local" value={form.alternate_at} onChange={(e) => setForm({ ...form, alternate_at: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>{t('support:videoBookingDialog.notes', { defaultValue: 'Notes' })}</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={2000} rows={3} />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('support:videoBookingDialog.timezoneNotice', { defaultValue: 'Times will be interpreted in your local timezone:' })} <span className="font-mono">{tz}</span>
          </p>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Video className="w-4 h-4 mr-2" />}
            {t('support:videoBookingDialog.submit', { defaultValue: 'Request booking' })}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
