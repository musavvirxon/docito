import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string | null;
  entity_type: string | null;
  entity_id: string | null;
  related_id: string | null;
  related_type: string | null;
  is_read: boolean;
  created_at: string;
};

type UseNotificationsArgs = {
  limit?: number;
  unreadOnly?: boolean;
};

export function useNotifications(args?: UseNotificationsArgs) {
  const { user } = useAuth();
  const limit = args?.limit ?? 50;
  const unreadOnly = args?.unreadOnly ?? false;

  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.is_read).length,
    [items],
  );

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      let q = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (unreadOnly) q = q.eq("is_read", false);

      const { data, error } = await q;

      if (error) throw error;
      setItems((data as unknown as NotificationRow[]) || []);
    } catch (e) {
      console.error("useNotifications.fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [user, limit, unreadOnly]);

  const markRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      setItems((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) {
        console.error("useNotifications.markRead error:", error);
        await fetchNotifications();
      }
    },
    [user, fetchNotifications],
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;

    setItems((prev) =>
      prev.map((n) => ({ ...n, is_read: true })),
    );

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("useNotifications.markAllRead error:", error);
      await fetchNotifications();
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:user:${user.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  return {
    items,
    loading,
    unreadCount,
    refetch: fetchNotifications,
    markRead,
    markAllRead,
  };
}
