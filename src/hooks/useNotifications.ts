// Path: src/hooks/useNotifications.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppNotification = {
  id: string;
  user_id: string;
  entity_type: string | null;
  entity_id: string | null;
  role_scope: string | null;
  level: "info" | "success" | "warning" | "error";
  title: string;
  body: string | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export function useNotifications(options?: { limit?: number; unreadOnly?: boolean; autoRefreshMs?: number }) {
  const limit = options?.limit ?? 25;
  const unreadOnly = options?.unreadOnly ?? false;
  const autoRefreshMs = options?.autoRefreshMs ?? 0;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("notifications", {
        body: { action: "list", limit, unreadOnly },
      });
      if (fnErr) throw fnErr;
      if (!data?.ok) throw new Error(data?.error || "Failed to load notifications");

      setItems((data.notifications || []) as AppNotification[]);
      setUnreadCount(Number(data.unreadCount || 0));
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications");
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [limit, unreadOnly]);

  const markRead = useCallback(async (id: string) => {
    const { data, error: fnErr } = await supabase.functions.invoke("notifications", {
      body: { action: "mark_read", id },
    });
    if (fnErr) throw fnErr;
    if (!data?.ok) throw new Error(data?.error || "Failed to mark read");

    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    const { data, error: fnErr } = await supabase.functions.invoke("notifications", {
      body: { action: "mark_all_read" },
    });
    if (fnErr) throw fnErr;
    if (!data?.ok) throw new Error(data?.error || "Failed to mark all read");

    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs < 5000) return;
    const t = window.setInterval(() => fetchNotifications(), autoRefreshMs);
    return () => window.clearInterval(t);
  }, [autoRefreshMs, fetchNotifications]);

  const unread = useMemo(() => items.filter((n) => !n.read_at), [items]);

  return {
    loading,
    items,
    unread,
    unreadCount,
    error,
    refetch: fetchNotifications,
    markRead,
    markAllRead,
  };
}
