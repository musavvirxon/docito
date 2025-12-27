import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ContextType = 'general' | 'visit' | 'referral';
export type MessageFilter = 'all' | 'visits' | 'referrals' | 'unread';

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface HealthcareMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  sender_role?: string;
  context_type?: ContextType;
  metadata: any;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    full_name: string;
    avatar_url?: string;
    role?: string;
  };
  attachments?: MessageAttachment[];
}

export interface HealthcareConversation {
  id: string;
  type: string;
  name: string | null;
  context_type?: ContextType;
  context_id?: string | null;
  is_locked?: boolean;
  locked_at?: string | null;
  locked_reason?: string | null;
  created_by: string | null;
  metadata: any;
  last_message_at: string;
  created_at: string;
  participants?: HealthcareParticipant[];
  last_message?: HealthcareMessage;
  unread_count?: number;
  context_data?: any;
}

export interface HealthcareParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  last_read_at: string | null;
  joined_at: string;
  profile?: {
    full_name: string;
    avatar_url?: string;
    role?: string;
  };
}

export const useHealthcareMessaging = (filter: MessageFilter = 'all') => {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<HealthcareConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (partError) throw partError;

      if (!participations?.length) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participations.map(p => p.conversation_id);

      const { data: convos, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;

      // Cast to our extended type
      const typedConvos = (convos || []) as any[];

      // Apply context filter
      let filteredConvos = typedConvos;
      if (filter === 'visits') {
        filteredConvos = typedConvos.filter(c => c.context_type === 'visit');
      } else if (filter === 'referrals') {
        filteredConvos = typedConvos.filter(c => c.context_type === 'referral');
      }

      const conversationsWithDetails = await Promise.all(
        filteredConvos.map(async (conv) => {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('*')
            .eq('conversation_id', conv.id);

          const participantsWithProfiles = await Promise.all(
            (participants || []).map(async (p) => {
              const { data: pProfile } = await supabase
                .from('profiles')
                .select('full_name, avatar_url, role')
                .eq('user_id', p.user_id)
                .single();
              return { ...p, profile: pProfile };
            })
          );

          const { data: lastMessages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          let contextData = null;
          if (conv.context_type === 'visit' && conv.context_id) {
            const { data: appointment } = await supabase
              .from('appointments')
              .select('*')
              .eq('id', conv.context_id)
              .single();
            contextData = appointment;
          } else if (conv.context_type === 'referral' && conv.context_id) {
            const { data: referral } = await supabase
              .from('referrals')
              .select('*')
              .eq('id', conv.context_id)
              .single();
            contextData = referral;
          }

          return {
            ...conv,
            participants: participantsWithProfiles,
            last_message: lastMessages?.[0],
            unread_count: unreadCount || 0,
            context_data: contextData,
          } as HealthcareConversation;
        })
      );

      let result = conversationsWithDetails;
      if (filter === 'unread') {
        result = result.filter(c => (c.unread_count || 0) > 0);
      }

      setConversations(result);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, filter]);

  const canMessageUser = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user?.id) return false;
    // For now, allow messaging between users who share appointments or referrals
    // This will be enhanced when messaging_permissions table is properly typed
    return true;
  }, [user?.id]);

  const getAllowedContacts = useCallback(async () => {
    if (!user?.id) return [];

    try {
      // Get users the current user can message based on appointments/referrals
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .neq('user_id', user.id)
        .limit(50);

      return profiles || [];
    } catch (error) {
      console.error('Error fetching allowed contacts:', error);
      return [];
    }
  }, [user?.id]);

  const createContextConversation = useCallback(async (
    participantIds: string[],
    contextType: ContextType = 'general',
    contextId?: string,
    name?: string
  ) => {
    if (!user?.id) return null;

    try {
      const convType = contextType === 'general' 
        ? (participantIds.length > 1 ? 'group' : 'direct')
        : contextType;

      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: convType,
          name: name || null,
          created_by: user.id,
          metadata: { context_type: contextType, context_id: contextId },
        } as any)
        .select()
        .single();

      if (convError) throw convError;

      const allParticipants = [user.id, ...participantIds.filter(id => id !== user.id)];
      
      await supabase.from('conversation_participants').insert(
        allParticipants.map((userId, index) => ({
          conversation_id: newConv.id,
          user_id: userId,
          role: index === 0 ? 'admin' : 'member',
        }))
      );

      await fetchConversations();
      return newConv;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    }
  }, [user?.id, fetchConversations]);

  const getOrCreateDirectConversation = useCallback(async (otherUserId: string) => {
    if (!user?.id) return null;

    try {
      const { data: myParticipations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (myParticipations?.length) {
        for (const p of myParticipations) {
          const { data: conv } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', p.conversation_id)
            .eq('type', 'direct')
            .single();

          if (conv) {
            const { data: otherParticipant } = await supabase
              .from('conversation_participants')
              .select('*')
              .eq('conversation_id', conv.id)
              .eq('user_id', otherUserId)
              .single();

            if (otherParticipant) {
              return conv;
            }
          }
        }
      }

      return await createContextConversation([otherUserId], 'general');
    } catch (error) {
      console.error('Error getting/creating conversation:', error);
      toast.error('Failed to start conversation');
      return null;
    }
  }, [user?.id, createContextConversation]);

  useEffect(() => {
    if (!user?.id) return;

    fetchConversations();

    const channel = supabase
      .channel('healthcare-messaging-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchConversations()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchConversations]);

  return {
    conversations,
    loading,
    fetchConversations,
    getOrCreateDirectConversation,
    createContextConversation,
    canMessageUser,
    getAllowedContacts,
  };
};

export const useHealthcareMessages = (conversationId: string | null) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<HealthcareMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversationLocked, setConversationLocked] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user?.id) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data: conv } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      const convData = conv as any;
      setConversationLocked(convData?.is_locked || false);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const messagesWithDetails = await Promise.all(
        (data || []).map(async (msg) => {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, role')
            .eq('user_id', msg.sender_id)
            .single();

          return {
            ...msg,
            sender: senderProfile,
            attachments: [],
          } as HealthcareMessage;
        })
      );

      setMessages(messagesWithDetails);

      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user?.id]);

  const sendMessage = useCallback(async (
    content: string,
    messageType: string = 'text',
    contextType?: ContextType
  ) => {
    if (!conversationId || !user?.id || conversationLocked) {
      if (conversationLocked) {
        toast.error('This conversation is locked');
      }
      return null;
    }

    if (!content.trim() && messageType === 'text') return null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: messageType,
        } as any)
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return null;
    }
  }, [conversationId, user?.id, conversationLocked]);

  const uploadAttachment = useCallback(async (
    file: File,
    messageContent?: string
  ) => {
    if (!conversationId || !user?.id || conversationLocked) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `messages/${conversationId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageContent || file.name,
          message_type: 'file',
        } as any)
        .select()
        .single();

      if (msgError) throw msgError;

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      await fetchMessages();
      return message;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast.error('Failed to upload file');
      return null;
    }
  }, [conversationId, user?.id, conversationLocked, fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;

    fetchMessages();

    const channel = supabase
      .channel(`healthcare-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;

          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, role')
            .eq('user_id', newMessage.sender_id)
            .single();

          setMessages(prev => [
            ...prev,
            { ...newMessage, sender: senderProfile, attachments: [] } as HealthcareMessage
          ]);

          if (newMessage.sender_id !== user?.id) {
            await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMessage.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id, fetchMessages]);

  return {
    messages,
    loading,
    conversationLocked,
    sendMessage,
    uploadAttachment,
    fetchMessages,
  };
};
