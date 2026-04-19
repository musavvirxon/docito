import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Mail, Video, RefreshCcw, ExternalLink, Inbox } from 'lucide-react';

type SupportMsg = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  category: string;
  subject: string;
  message: string;
  page_path: string | null;
  language: string | null;
  status: string;
  admin_notes: string | null;
};

type VideoBooking = {
  id: string;
  public_token: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  topic: string;
  notes: string | null;
  preferred_at: string;
  alternate_at: string | null;
  timezone: string | null;
  language: string | null;
  status: string;
  meeting_link: string | null;
  admin_notes: string | null;
};

const MSG_STATUSES = ['new', 'working', 'done'] as const;
const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const;

export default function SupportInbox() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<SupportMsg[]>([]);
  const [bookings, setBookings] = useState<VideoBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<VideoBooking | null>(null);
  const [editLink, setEditLink] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [m, b] = await Promise.all([
        supabase.from('support_messages').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('admin_video_bookings').select('*').order('created_at', { ascending: false }).limit(500),
      ]);
      if (m.error) throw m.error;
      if (b.error) throw b.error;
      setMessages((m.data ?? []) as SupportMsg[]);
      setBookings((b.data ?? []) as VideoBooking[]);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Load failed', description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const setMsgStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('support_messages').update({ status }).eq('id', id);
    if (error) return toast({ variant: 'destructive', title: 'Update failed', description: error.message });
    toast({ title: 'Updated' });
    await load();
  };

  const setBookingStatus = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === 'confirmed') patch.confirmed_at = new Date().toISOString();
    if (status === 'completed') patch.completed_at = new Date().toISOString();
    if (status === 'cancelled') patch.cancelled_at = new Date().toISOString();
    const { error } = await supabase.from('admin_video_bookings').update(patch).eq('id', id);
    if (error) return toast({ variant: 'destructive', title: 'Update failed', description: error.message });
    toast({ title: 'Updated' });
    await load();
  };

  const saveBookingMeta = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from('admin_video_bookings')
      .update({ meeting_link: editLink || null, admin_notes: editNotes || null })
      .eq('id', editing.id);
    if (error) return toast({ variant: 'destructive', title: 'Save failed', description: error.message });
    toast({ title: 'Saved' });
    setEditing(null);
    await load();
  };

  const msgCounts = useMemo(() => {
    const c: Record<string, number> = { new: 0, working: 0, done: 0 };
    messages.forEach((m) => { c[m.status] = (c[m.status] || 0) + 1; });
    return c;
  }, [messages]);

  const bookingCounts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    bookings.forEach((b) => { c[b.status] = (c[b.status] || 0) + 1; });
    return c;
  }, [bookings]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Inbox className="w-6 h-6" /> Support Inbox</h2>
          <p className="text-muted-foreground text-sm">Contact messages and admin video booking requests from the platform.</p>
        </div>
        <Button variant="outline" onClick={load}><RefreshCcw className="w-4 h-4 mr-2" /> Refresh</Button>
      </div>

      <Tabs defaultValue="messages" className="w-full">
        <TabsList>
          <TabsTrigger value="messages"><Mail className="w-4 h-4 mr-2" /> Messages ({messages.length})</TabsTrigger>
          <TabsTrigger value="bookings"><Video className="w-4 h-4 mr-2" /> Video Bookings ({bookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          {MSG_STATUSES.map((status) => (
            <Card key={status}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="capitalize">{status}</CardTitle>
                <Badge variant="outline">{msgCounts[status] || 0}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : messages.filter((m) => m.status === status).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages.</p>
                ) : messages.filter((m) => m.status === status).map((m) => (
                  <div key={m.id} className="rounded-xl border border-border/60 p-4 bg-card">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="outline">{m.category}</Badge>
                      {m.language && <Badge variant="outline">{m.language}</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <div className="font-semibold text-foreground">{m.subject}</div>
                    <div className="text-sm text-muted-foreground mt-1">From: {m.name} &lt;{m.email}&gt; {m.phone && `· ${m.phone}`}</div>
                    <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{m.message}</p>
                    {m.page_path && <p className="text-xs text-muted-foreground mt-1">Page: <span className="font-mono">{m.page_path}</span></p>}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button asChild size="sm" variant="outline"><a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}><Mail className="w-3.5 h-3.5 mr-1" /> Reply</a></Button>
                      {MSG_STATUSES.filter((s) => s !== status).map((s) => (
                        <Button key={s} size="sm" variant={s === 'done' ? 'secondary' : 'default'} onClick={() => setMsgStatus(m.id, s)}>Mark {s}</Button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          {BOOKING_STATUSES.map((status) => (
            <Card key={status}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="capitalize">{status}</CardTitle>
                <Badge variant="outline">{bookingCounts[status] || 0}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : bookings.filter((b) => b.status === status).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bookings.</p>
                ) : bookings.filter((b) => b.status === status).map((b) => (
                  <div key={b.id} className="rounded-xl border border-border/60 p-4 bg-card">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {b.language && <Badge variant="outline">{b.language}</Badge>}
                      {b.timezone && <Badge variant="outline">{b.timezone}</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(b.created_at).toLocaleString()}</span>
                    </div>
                    <div className="font-semibold text-foreground">{b.topic}</div>
                    <div className="text-sm text-muted-foreground mt-1">From: {b.name} &lt;{b.email}&gt; {b.phone && `· ${b.phone}`}</div>
                    <div className="grid sm:grid-cols-2 gap-2 mt-2 text-sm">
                      <div><span className="text-muted-foreground">Preferred:</span> {new Date(b.preferred_at).toLocaleString()}</div>
                      {b.alternate_at && <div><span className="text-muted-foreground">Alternate:</span> {new Date(b.alternate_at).toLocaleString()}</div>}
                    </div>
                    {b.notes && <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{b.notes}</p>}
                    {b.meeting_link && (
                      <p className="text-sm mt-2"><a className="text-primary inline-flex items-center gap-1" href={b.meeting_link} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /> {b.meeting_link}</a></p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(b); setEditLink(b.meeting_link ?? ''); setEditNotes(b.admin_notes ?? ''); }}>Edit link & notes</Button>
                      <Button asChild size="sm" variant="ghost"><a href={`/${b.language || 'en'}/admin-video-status/${b.public_token}`} target="_blank" rel="noopener noreferrer">Public status</a></Button>
                      {BOOKING_STATUSES.filter((s) => s !== status).map((s) => (
                        <Button key={s} size="sm" variant={s === 'cancelled' ? 'destructive' : 'default'} onClick={() => setBookingStatus(b.id, s)}>Mark {s}</Button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit booking details</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Meeting link</Label>
              <Input value={editLink} onChange={(e) => setEditLink(e.target.value)} placeholder="https://meet.google.com/…" />
            </div>
            <div>
              <Label>Admin notes (visible to requester)</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={4} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveBookingMeta}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
