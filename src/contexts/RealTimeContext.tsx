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
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('real_time_notifications')
        .select('*')
        .eq('recipient_user_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchNotifications();

    // Set up real-time subscription for new notifications
    const notificationChannel = supabase
      .channel('notifications')
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
          setNotifications(prev => [newNotification, ...prev]);
          
          // Show toast notification
          toast.info(newNotification.title, {
            description: newNotification.message,
          });
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
          setNotifications(prev =>
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Set up appointment_procedures subscription for procedure prescriptions
    const appointmentProceduresChannel = supabase
      .channel('appointment_procedures')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointment_procedures',
        },
        (payload) => {
          // Broadcast appointment procedure changes to all connected clients
          console.log('Appointment procedure updated:', payload);
        }
      )
      .subscribe();

    return () => {
      notificationChannel.unsubscribe();
      appointmentProceduresChannel.unsubscribe();
    };
  }, [user]);

  const sendNotification = async (notification: Omit<RealTimeNotification, 'id' | 'created_at' | 'sender_user_id'>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('real_time_notifications')
        .insert({
          ...notification,
          sender_user_id: user.id,
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('real_time_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

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