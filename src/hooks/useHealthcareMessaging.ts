import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ContextType = 'general' | 'visit' | 'referral' | 'appointment';

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
  metadata: any;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  sender?: {
    full_name: string;
    avatar_url?: string;
    role?: string;
  };
  sender_role?: string;
  attachments?: MessageAttachment[];
}

export interface HealthcareConversation {
  id: string;
  type: string;
  name: string | null;
  created_by: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  is_locked?: boolean;
  context_type?: string | null;
  context_id?: string | null;
  participants?: any[];
  last_message?: HealthcareMessage | null;
  unread_count?: number;
  context_data?: any;
}

export const useHealthcareMessaging = (filter: 'all' | 'unread' = 'all') => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<HealthcareConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data: convs, error: convErr } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner (
            *,
            profiles:user_id (
              full_name,
              avatar_url,
              role
            )
          )
        `)
        .order('last_message_at', { ascending: false });

      if (convErr) throw convErr;

      const { data: lastMessages, error: lastMsgErr } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            full_name,
            avatar_url,
            role
          )
        `)
        .in('conversation_id', (convs || []).map((c: any) => c.id))
        .order('created_at', { ascending: false });

      if (lastMsgErr) throw lastMsgErr;

      const conversationsWithDetails = (convs || []).map((conv: any) => {
        const participantsWithProfiles = (conv.conversation_participants || []).map((p: any) => ({
          ...p,
          user: p.profiles
        }));

        const convLastMessage = (lastMessages || []).find((m: any) => m.conversation_id === conv.id);

        const unreadCount = 0; // phase 2

        const contextData = null;

        return {
          ...conv,
          participants: participantsWithProfiles,
          last_message: convLastMessage || null,
          unread_count: unreadCount,
          context_data: contextData,
        } as HealthcareConversation;
      });

      let result = conversationsWithDetails;
      if (filter === 'unread') {
        result = result.filter(c => (c.unread_count || 0) > 0);
      }

      setConversations(result);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user?.id, filter]);

  useEffect(() => {
    if (user?.id) fetchConversations();
  }, [user?.id, fetchConversations]);

  const getOrCreateDirectConversation = useCallback(async (otherUserId: string) => {
      if (!user?.id) return null;

      try {
        const { data: conversationId, error: rpcError } = await supabase.rpc(
          'create_direct_conversation' as any,
          { target_user_id: otherUserId } as any
        );

        if (rpcError) throw rpcError;

        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId as any)
          .single();

        if (convError) throw convError;

        await fetchConversations();
        return conv as any;
      } catch (error) {
        console.error('Error getting/creating conversation:', error);
        toast.error('Failed to start conversation');
        return null;
      }
    }, [user?.id, fetchConversations]);

  const createContextConversation = useCallback(async (
      participantIds: string[],
      contextType: ContextType = 'general',
      contextId?: string,
      name?: string
    ) => {
      if (!user?.id) return null;

      // For now, only "general" conversations are created client-side via RPC.
      // Visit/referral chats are created automatically by DB triggers.
      if (contextType !== 'general') {
        toast.error('This conversation type is created automatically.');
        return null;
      }

      try {
        const uniqueIds = Array.from(new Set(participantIds.filter(Boolean)));
        if (uniqueIds.length === 0) return null;

        if (uniqueIds.length === 1) {
          // Direct
          const { data: conversationId, error: rpcError } = await supabase.rpc(
            'create_direct_conversation' as any,
            { target_user_id: uniqueIds[0] } as any
          );
          if (rpcError) throw rpcError;

          const { data: conv, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', conversationId as any)
            .single();

          if (convError) throw convError;

          await fetchConversations();
          return conv as any;
        }

        // Group (non-patient callers only; enforced in DB)
        const allParticipants = Array.from(new Set([user.id, ...uniqueIds]));

        const { data: conversationId, error: rpcError } = await supabase.rpc(
          'create_group_conversation' as any,
          { p_name: name || 'New group', p_participant_ids: allParticipants } as any
        );
        if (rpcError) throw rpcError;

        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId as any)
          .single();

        if (convError) throw convError;

        await fetchConversations();
        return conv as any;
      } catch (error) {
        console.error('Error creating conversation:', error);
        toast.error('Failed to create conversation');
        return null;
      }
    }, [user?.id, fetchConversations]);

  const canMessageUser = useCallback(async (_targetUserId: string) => {
    // DB enforces patient→patient and conversation participant rules
    return true;
  }, []);

  const getAllowedContacts = useCallback(async () => {
    // Optional: keep as-is if you already have messaging_permissions-based logic elsewhere.
    // For the "New chat" UI we now use the RPC search_chat_users().
    return [];
  }, []);

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
  const { user } = useAuth();
  const [messages, setMessages] = useState<HealthcareMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversationLocked, setConversationLocked] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user?.id) return;

    try {
      setLoading(true);

      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .select('is_locked')
        .eq('id', conversationId)
        .single();

      if (convErr) throw convErr;
      setConversationLocked(!!conv?.is_locked);

      const { data: messageData, error: messageError } = await supabase
        .from('messages_with_attachments' as any)
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messageError) throw messageError;

      const senderIds = Array.from(new Set((messageData || []).map((m: any) => m.sender_id)));

      const { data: senderProfiles, error: senderError } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .in('user_id', senderIds);

      if (senderError) throw senderError;

      const profileMap = new Map(senderProfiles?.map(p => [p.user_id, p]) || []);

      const messagesWithSenders = (messageData || []).map((msg: any) => {
        const senderProfile = profileMap.get(msg.sender_id);
        return {
          ...(msg as any),
          sender: senderProfile,
          sender_role: senderProfile?.role,
          attachments: (msg as any).attachments || [],
        } as HealthcareMessage;
      });

      setMessages(messagesWithSenders);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId, user?.id]);

  useEffect(() => {
    if (conversationId && user?.id) fetchMessages();
  }, [conversationId, user?.id, fetchMessages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !user?.id || conversationLocked) return null;

    try {
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          message_type: 'text',
        } as any)
        .select()
        .single();

      if (messageError) throw messageError;

      await fetchMessages();
      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return null;
    }
  }, [conversationId, user?.id, conversationLocked, fetchMessages]);

  const uploadAttachment = useCallback(async (
      file: File,
      messageContent?: string
    ) => {
      if (!conversationId || !user?.id || conversationLocked) return null;

      try {
        // 1) Create the message (we need message_id for storage path)
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
        if (!message?.id) throw new Error('Failed to create message');

        // 2) Upload to PRIVATE bucket using canonical path
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const objectPath = `attachments/${conversationId}/${message.id}/${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(objectPath, file, { contentType: file.type, upsert: false });

        if (uploadError) throw uploadError;

        // 3) Create attachment row
        const { error: attError } = await supabase
          .from('message_attachments' as any)
          .insert({
            message_id: message.id,
            file_name: file.name,
            file_path: objectPath,
            file_type: file.type || 'application/octet-stream',
            file_size: file.size,
          } as any);

        if (attError) throw attError;

        await fetchMessages();
        return message as any;
      } catch (error) {
        console.error('Error uploading attachment:', error);
        toast.error('Failed to upload file');
        return null;
      }
    }, [conversationId, user?.id, conversationLocked, fetchMessages]);

  return {
    messages,
    loading,
    conversationLocked,
    sendMessage,
    uploadAttachment,
    fetchMessages,
  };
};
