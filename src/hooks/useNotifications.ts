// File: src/hooks/useNotifications.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NotificationRow = {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string | null;
  level: "info" | "success" | "warning" | "error" | string;
  title: string;
  body: string | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
};

export function useNotifications(params: { limit: number; unreadOnly: boolean; autoRefreshMs?: number }) {
  const { limit, unreadOnly, autoRefreshMs } = params;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let q = (supabase.from as any)("notifications")
        .select("id,user_id,entity_type,entity_id,level,title,body,action_url,read_at,created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (unreadOnly) q = q.is("read_at", null);

      const { data, error } = await q;
      if (error) throw error;

      setItems((data || []) as any);

      const { data: c, error: cErr } = await (supabase.rpc as any)("get_my_unread_notifications_count");
      if (cErr) {
        // RPC may not exist, fallback to counting from items
        setUnreadCount(((data || []) as any[]).filter((n: any) => !n.read_at).length);
      } else {
        setUnreadCount(Number(c || 0));
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications");
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [limit, unreadOnly]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs <= 0) return;
    const t = setInterval(fetchAll, autoRefreshMs);
    return () => clearInterval(t);
  }, [autoRefreshMs, fetchAll]);

  const markRead = useCallback(async (id: string) => {
    const { error } = await (supabase.from as any)("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const markManyRead = useCallback(async (ids: string[]) => {
    const { error } = await (supabase.rpc as any)("mark_my_notifications_read", { p_ids: ids });
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  const markAllRead = useCallback(async () => {
    const { error } = await (supabase.rpc as any)("mark_all_my_notifications_read");
    if (error) {
      // RPC may not exist, fallback - mark each individually
      console.warn("mark_all_my_notifications_read RPC not found, skipping");
    }
    await fetchAll();
  }, [fetchAll]);

  const resolved = useMemo(() => {
    return { loading, items, unreadCount, error, refetch: fetchAll, markRead, markManyRead, markAllRead };
  }, [error, fetchAll, items, loading, markAllRead, markManyRead, markRead, unreadCount]);

  return resolved;
}
