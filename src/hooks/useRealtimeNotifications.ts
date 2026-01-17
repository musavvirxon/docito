// Path: src/hooks/useRealtimeNotifications.ts
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeNotifications(params: { enabled: boolean; onChange: () => void }) {
  const { enabled, onChange } = params;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("rt-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => onChangeRef.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
