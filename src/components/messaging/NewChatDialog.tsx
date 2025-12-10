import React, { useState, useEffect } from 'react';
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
import { Search, User, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
}

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateDirect: (userId: string) => Promise<any>;
  onCreateGroup: (name: string, userIds: string[]) => Promise<any>;
}

const NewChatDialog: React.FC<NewChatDialogProps> = ({
  open,
  onClose,
  onCreateDirect,
  onCreateGroup,
}) => {
  const { user } = useAuth();
  const [tab, setTab] = useState('direct');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .neq('user_id', user?.id)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectUser = async (userId: string) => {
    if (tab === 'direct') {
      setCreating(true);
      try {
        await onCreateDirect(userId);
        onClose();
      } finally {
        setCreating(false);
      }
    } else {
      setSelectedUsers(prev =>
        prev.includes(userId)
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    
    setCreating(true);
    try {
      await onCreateGroup(groupName, selectedUsers);
      onClose();
      setGroupName('');
      setSelectedUsers([]);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSearch('');
    setSelectedUsers([]);
    setGroupName('');
    setTab('direct');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
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

          <div className="mt-4">
            {tab === 'group' && (
              <div className="mb-4">
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  placeholder="Enter group name..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <TabsContent value="direct" className="mt-0">
              <ScrollArea className="h-[300px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No users found
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.user_id}
                        onClick={() => handleSelectUser(u.user_id)}
                        disabled={creating}
                        className="w-full p-3 flex items-center gap-3 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback>
                            {u.full_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="font-medium">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {u.role}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="group" className="mt-0">
              <ScrollArea className="h-[250px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No users found
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredUsers.map((u) => (
                      <label
                        key={u.user_id}
                        className="w-full p-3 flex items-center gap-3 hover:bg-accent rounded-lg transition-colors cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedUsers.includes(u.user_id)}
                          onCheckedChange={() => handleSelectUser(u.user_id)}
                        />
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback>
                            {u.full_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="font-medium">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {u.role}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {selectedUsers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    {selectedUsers.length} member{selectedUsers.length > 1 ? 's' : ''} selected
                  </p>
                  <Button
                    onClick={handleCreateGroup}
                    disabled={!groupName.trim() || creating}
                    className="w-full"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Group'
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default NewChatDialog;
