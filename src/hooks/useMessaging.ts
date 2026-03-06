import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Message {
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
  };
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface Participant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  last_read_at: string | null;
  user?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface Conversation {
  id: string;
  type: string;
  name: string | null;
  created_by: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  participants?: Participant[];
  last_message?: Message;
  unread_count?: number;
}

export const useMessaging = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner (
            *,
            profiles:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .order('last_message_at', { ascending: false });

      if (conversationError) throw conversationError;

      const { data: lastMessages, error: lastMessageError } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationData?.map(c => c.id) || [])
        .order('created_at', { ascending: false });

      if (lastMessageError) throw lastMessageError;

      // Get sender profiles for last messages
      const senderIds = Array.from(new Set((lastMessages || []).map(m => m.sender_id)));
      const { data: senderProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', senderIds);

      const profileMap = new Map(senderProfiles?.map(p => [p.user_id, p]) || []);

      const conversationsWithLastMessage = conversationData?.map(conv => {
        const convLastMessage = lastMessages?.find(m => m.conversation_id === conv.id);
        const lastMessageWithSender = convLastMessage ? {
          ...convLastMessage,
          sender: profileMap.get(convLastMessage.sender_id)
        } : null;

        return {
          ...conv,
          participants: conv.conversation_participants?.map((p: any) => ({
            ...p,
            user: p.profiles
          })) || [],
          last_message: lastMessageWithSender,
        } as Conversation;
      }) || [];

      setConversations(conversationsWithLastMessage);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchConversations();
    }
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
        console.error('Error creating conversation:', error);
        toast.error('Failed to start conversation');
        return null;
      }
    }, [user?.id, fetchConversations]);

  const createGroupConversation = useCallback(async (name: string, userIds: string[]) => {
      if (!user?.id) return null;

      try {
        const participantIds = Array.from(new Set([user.id, ...userIds]));

        const { data: conversationId, error: rpcError } = await supabase.rpc(
          'create_group_conversation' as any,
          { p_name: name, p_participant_ids: participantIds } as any
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
        console.error('Error creating group conversation:', error);
        toast.error('Failed to create group conversation');
        return null;
      }
    }, [user?.id, fetchConversations]);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!user?.id) return null;

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

      // last_message_at is now updated by DB trigger (no client update)
      await fetchConversations();

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return null;
    }
  }, [user?.id, fetchConversations]);

  return {
    conversations,
    loading,
    fetchConversations,
    getOrCreateDirectConversation,
    createGroupConversation,
    sendMessage,
  };
};

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user?.id) return;

    try {
      setLoading(true);

      // Try messages_with_attachments view, fallback to messages table
      let messageData: any[] = [];
      try {
        const { data, error } = await supabase
          .from('messages_with_attachments' as any)
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        
        if (!error && data) {
          messageData = data;
        } else {
          throw error;
        }
      } catch {
        // Fallback to regular messages table
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        messageData = data || [];
      }

      const senderIds = Array.from(new Set((messageData || []).map((m: any) => m.sender_id)));

      // Try profiles first
      const { data: senderProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', senderIds);

      const allProfiles = [...(senderProfiles || [])];

      // Hydrate missing profiles from doctor_profiles_view
      const foundIds = new Set(allProfiles.map(p => p.user_id));
      const missingIds = senderIds.filter(id => !foundIds.has(id));
      if (missingIds.length > 0) {
        const { data: doctorProfiles } = await supabase
          .from('doctor_profiles_view' as any)
          .select('user_id, full_name, avatar_url')
          .in('user_id', missingIds);
        if (doctorProfiles) allProfiles.push(...(doctorProfiles as any[]));
      }

      const profileMap = new Map(allProfiles.map(p => [p.user_id, p]));

      const messagesWithSenders = (messageData || []).map((msg: any) => {
        const senderProfile = profileMap.get(msg.sender_id);
        return {
          ...(msg as any),
          sender: senderProfile,
          attachments: (msg as any).attachments || [],
        } as Message;
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
    if (conversationId && user?.id) {
      fetchMessages();
    }
  }, [conversationId, user?.id, fetchMessages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !user?.id) return null;

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
  }, [conversationId, user?.id, fetchMessages]);

  return {
    messages,
    loading,
    fetchMessages,
    sendMessage,
  };
};

// Re-export for compatibility
export const useConversationMessages = (conversationId: string | null) => {
  return useMessages(conversationId);
};