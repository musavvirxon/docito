import React, { useState, useEffect, memo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, User, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import RoleBadge from './RoleBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UserProfile {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
}

interface HealthcareNewChatDialogProps {
  open: boolean;
  onClose: () => void;
  canMessageUser: (userId: string) => Promise<boolean>;
}

const HealthcareNewChatDialog: React.FC<HealthcareNewChatDialogProps> = memo(({
  open,
  onClose,
  canMessageUser,
}) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(false);

  const fetchAllowedUsers = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setCheckingPermissions(true);
    
    try {
      // Fetch all users first
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .neq('user_id', user.id)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);

      // Check permissions for each user
      const allowed = new Set<string>();
      await Promise.all(
        (data || []).map(async (u) => {
          const canMessage = await canMessageUser(u.user_id);
          if (canMessage) {
            allowed.add(u.user_id);
          }
        })
      );
      setAllowedUsers(allowed);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setCheckingPermissions(false);
    }
  }, [user?.id, canMessageUser]);

  useEffect(() => {
    if (open) {
      fetchAllowedUsers();
    }
  }, [open, fetchAllowedUsers]);

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) &&
    allowedUsers.has(u.user_id)
  );

  const handleClose = useCallback(() => {
    onClose();
    setSearch('');
  }, [onClose]);

  const getRoleBadgeVariant = (role: string): 'doctor' | 'patient' | 'clinic' | 'lab' | 'pharmacy' | 'admin' => {
    if (role === 'doctor') return 'doctor';
    if (role === 'patient') return 'patient';
    if (role === 'practice_admin' || role === 'clinic_admin') return 'clinic';
    if (role === 'lab_admin' || role === 'lab_staff') return 'lab';
    if (role === 'pharmacy_admin' || role === 'pharmacy_staff') return 'pharmacy';
    if (role === 'super_admin') return 'admin';
    return 'patient';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        <Alert variant="default" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            You can only message healthcare providers you have an appointment or referral with.
          </AlertDescription>
        </Alert>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[300px]">
          {loading || checkingPermissions ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {checkingPermissions ? 'Checking permissions...' : 'Loading contacts...'}
                </p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No contacts available</p>
              <p className="text-xs mt-1">
                Book an appointment to start messaging
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((u) => (
                <button
                  key={u.user_id}
                  className="w-full p-3 flex items-center gap-3 hover:bg-accent rounded-lg transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback className="text-sm">
                      {u.full_name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left flex-1">
                    <p className="font-medium text-sm">{u.full_name}</p>
                    <RoleBadge role={getRoleBadgeVariant(u.role)} size="sm" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

HealthcareNewChatDialog.displayName = 'HealthcareNewChatDialog';

export default HealthcareNewChatDialog;
