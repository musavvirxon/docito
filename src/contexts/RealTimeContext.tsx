import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface RealTimeNotification {
  id: string;
  recipient_user_id: string;
  sender_user_id?: string;
  notification_type: string;
  title: string;
  message: string;
  data: any;
  read_at?: string;
  expires_at?: string;
  created_at: string;
}

interface RealTimeContextType {
  notifications: RealTimeNotification[];
  sendNotification: (notification: Omit<RealTimeNotification, 'id' | 'created_at' | 'sender_user_id'>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  clearNotifications: () => void;
  isConnected: boolean;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

export const useRealTime = () => {
  const context = useContext(RealTimeContext);
  if (context === undefined) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
};

export const RealTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  // Fetch existing notifications
  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('real_time_notifications')
        .select('*')
        .eq('recipient_user_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching real-time notifications:', error);
        throw error;
      }
      setNotifications(data || []);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setIsConnected(false);
      return;
    }

    // Initial fetch
    fetchNotifications();

    // Set up real-time subscription for new notifications - user-specific channel
    const notificationChannel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'real_time_notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as RealTimeNotification;
          // Only add if it's truly for this user
          if (newNotification.recipient_user_id === user.id) {
            setNotifications(prev => [newNotification, ...prev]);
            
            // Show toast notification
            toast.info(newNotification.title, {
              description: newNotification.message,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'real_time_notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as RealTimeNotification;
          // Only update if it's truly for this user
          if (updatedNotification.recipient_user_id === user.id) {
            setNotifications(prev =>
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.error('Real-time notification channel error:', status);
        }
      });

    return () => {
      notificationChannel.unsubscribe();
    };
  }, [user]);

  const sendNotification = async (notification: Omit<RealTimeNotification, 'id' | 'created_at' | 'sender_user_id'>) => {
    if (!user?.id) {
      console.error('Cannot send notification: No user logged in');
      return;
    }

    // Validate that recipient_user_id is provided
    if (!notification.recipient_user_id) {
      console.error('Cannot send notification: No recipient specified');
      return;
    }

    try {
      const { error } = await supabase
        .from('real_time_notifications')
        .insert({
          ...notification,
          sender_user_id: user.id,
        });

      if (error) {
        console.error('Error sending notification:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('real_time_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('recipient_user_id', user.id); // Ensure user can only mark their own notifications

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }

      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const value = {
    notifications,
    sendNotification,
    markAsRead,
    clearNotifications,
    isConnected,
  };

  return <RealTimeContext.Provider value={value}>{children}</RealTimeContext.Provider>;
};