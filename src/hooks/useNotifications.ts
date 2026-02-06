// File: src/hooks/useNotifications.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  action_url: string | null;
  read_at: string | null;
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
    () => items.filter((n) => !n.read_at).length,
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

      if (unreadOnly) q = q.is("read_at", null);

      const { data, error } = await q;

      if (error) throw error;
      setItems((data as NotificationRow[]) || []);
    } catch (e) {
      console.error("useNotifications.fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [user, limit, unreadOnly]);

  const markRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      // Optimistic update
      setItems((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n,
        ),
      );

      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) {
        console.error("useNotifications.markRead error:", error);
        // best-effort rollback
        await fetchNotifications();
      }
    },
    [user, fetchNotifications],
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
    );

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);

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
      .channel(`notifications:user:${user.id}`)
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
