import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, User, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type AppRole =
  | 'patient'
  | 'doctor'
  | 'staff'
  | 'practice_admin'
  | 'facility_admin'
  | 'super_admin'
  | string;

interface ChatUser {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  highest_role?: AppRole | null;
  roles?: AppRole[] | null;
}

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateDirect: (userId: string) => Promise<any>;
  onCreateGroup: (name: string, userIds: string[]) => Promise<any>;
}

const roleLabel = (role?: string | null) => {
  if (!role) return '';
  return role.replace(/_/g, ' ');
};

const NewChatDialog: React.FC<NewChatDialogProps> = ({
  open,
  onClose,
  onCreateDirect,
  onCreateGroup,
}) => {
  const { user } = useAuth();

  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [query, setQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [doctorPatients, setDoctorPatients] = useState<ChatUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Group state
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const selectedSet = useMemo(() => new Set(selectedUserIds), [selectedUserIds]);

  useEffect(() => {
    if (!open) return;

    // reset state on open
    setTab('direct');
    setQuery('');
    setUsers([]);
    setDoctorPatients([]);
    setError(null);
    setGroupName('');
    setSelectedUserIds([]);
  }, [open]);

  // Fetch doctor's own patients as fallback contacts
  useEffect(() => {
    if (!open || !user?.id) return;

    const fetchDoctorPatients = async () => {
      try {
        // Get doctor profile id
        const { data: doc } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!doc?.id) return;

        // Get doctor_patients with linked user profiles
        const { data: dp } = await supabase
          .from('doctor_patients')
          .select('id, full_name, email, phone, profile_photo_url')
          .eq('doctor_id', doc.id)
          .eq('status', 'active')
          .order('full_name');

        if (!dp?.length) return;

        // These are doctor-added patients; they may not have user_id for messaging
        // Try to find matching profiles by email/phone
        const emails = dp.map((p: any) => p.email).filter(Boolean);
        const phones = dp.map((p: any) => p.phone).filter(Boolean);

        let profileMap = new Map<string, { user_id: string; full_name: string; avatar_url: string | null }>();

        if (emails.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, email')
            .in('email', emails);

          if (profiles) {
            for (const p of profiles) {
              if (p.email) profileMap.set(p.email, p as any);
            }
          }
        }

        const patientUsers: ChatUser[] = [];
        for (const p of dp as any[]) {
          const profile = p.email ? profileMap.get(p.email) : null;
          if (profile && profile.user_id !== user.id) {
            patientUsers.push({
              user_id: profile.user_id,
              full_name: profile.full_name || p.full_name || 'Patient',
              avatar_url: profile.avatar_url || p.profile_photo_url,
              highest_role: 'patient',
              roles: ['patient'],
            });
          }
        }

        setDoctorPatients(patientUsers);
      } catch (e) {
        console.error('Error fetching doctor patients for chat:', e);
      }
    };

    fetchDoctorPatients();
  }, [open, user?.id]);

  useEffect(() => {
    if (!open || !user?.id) return;

    const run = async () => {
      setLoadingUsers(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc(
          'search_chat_users' as any,
          { p_query: query || '' } as any
        );

        if (rpcError) throw rpcError;

        const list = (data || []) as ChatUser[];
        setUsers(list.filter(u => u.user_id !== user.id));
      } catch (e: any) {
        console.error('search_chat_users error:', e);

        // Fallback: try doctor_profiles_view
        try {
          const { data: fallback } = await supabase
            .from('doctor_profiles_view')
            .select('id, full_name, avatar_url')
            .ilike('full_name', `%${query || ''}%`)
            .limit(20);

          if (fallback?.length) {
            setUsers(
              fallback
                .filter((d: any) => d.id !== user.id)
                .map((d: any) => ({
                  user_id: d.id,
                  full_name: d.full_name || 'Doctor',
                  avatar_url: d.avatar_url,
                  highest_role: 'doctor',
                  roles: ['doctor'],
                }))
            );
            setError(null);
          } else {
            setError('Failed to load users.');
            setUsers([]);
          }
        } catch {
          setError('Failed to load users. Check your Supabase RPC + RLS.');
          setUsers([]);
        }
      } finally {
        setLoadingUsers(false);
      }
    };

    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [open, user?.id, query]);

  // Merge users + doctor patients (deduplicate)
  const allUsers = useMemo(() => {
    const seen = new Set(users.map(u => u.user_id));
    const merged = [...users];
    for (const dp of doctorPatients) {
      if (!seen.has(dp.user_id)) {
        // Only include if matches query
        if (!query || dp.full_name.toLowerCase().includes(query.toLowerCase())) {
          merged.push(dp);
          seen.add(dp.user_id);
        }
      }
    }
    return merged;
  }, [users, doctorPatients, query]);

  const handleClose = () => {
    onClose();
  };

  const toggleSelected = (userId: string) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      return [...prev, userId];
    });
  };

  const handleCreateDirect = async (targetUserId: string) => {
    setError(null);
    const conv = await onCreateDirect(targetUserId);
    if (conv) handleClose();
  };

  const handleCreateGroup = async () => {
    setError(null);
    if (!groupName.trim()) {
      setError('Please provide a group name.');
      return;
    }
    if (selectedUserIds.length < 2) {
      setError('Pick at least 2 people for a group.');
      return;
    }

    const conv = await onCreateGroup(groupName.trim(), selectedUserIds);
    if (conv) handleClose();
  };

  const renderUserRow = (u: ChatUser, mode: 'direct' | 'group') => {
    const initials = (u.full_name || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
    const badge = roleLabel(u.highest_role || (u.roles?.[0] as any));

    return (
      <div
        key={u.user_id}
        className="flex items-center justify-between gap-3 py-2 px-2 rounded-md hover:bg-muted/50"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={u.avatar_url || undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-medium truncate">{u.full_name || 'Unknown user'}</div>
              {badge ? (
                <Badge variant="secondary" className="capitalize text-[10px]">
                  {badge}
                </Badge>
              ) : null}
            </div>
            {!!u.roles?.length && (
              <div className="text-xs text-muted-foreground truncate">
                {u.roles.map(r => roleLabel(r)).filter(Boolean).join(' • ')}
              </div>
            )}
          </div>
        </div>

        {mode === 'direct' ? (
          <Button size="sm" onClick={() => handleCreateDirect(u.user_id)}>
            Message
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedSet.has(u.user_id)}
              onCheckedChange={() => toggleSelected(u.user_id)}
              id={`user-${u.user_id}`}
            />
            <Label htmlFor={`user-${u.user_id}`} className="sr-only">
              Select
            </Label>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">
              <User className="h-4 w-4 mr-2" />
              Direct
            </TabsTrigger>
            <TabsTrigger value="group">
              <Users className="h-4 w-4 mr-2" />
              Group
            </TabsTrigger>
          </TabsList>

          <div className="mt-3 space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users..."
                className="pl-9"
              />
            </div>

            {tab === 'group' && (
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name"
              />
            )}

            {error && (
              <div className="text-sm text-destructive">{error}</div>
            )}

            <ScrollArea className="h-72 rounded-md border border-border">
              <div className="p-2">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </div>
                ) : allUsers.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No users found.
                  </div>
                ) : (
                  allUsers.map((u) => renderUserRow(u, tab))
                )}
              </div>
            </ScrollArea>

            {tab === 'group' && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Selected: {selectedUserIds.length}
                </div>
                <Button onClick={handleCreateGroup} disabled={loadingUsers}>
                  Create group
                </Button>
              </div>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default NewChatDialog;
