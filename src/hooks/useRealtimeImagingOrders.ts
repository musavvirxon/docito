// Path: src/hooks/useRealtimeImagingOrders.ts
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeImagingOrders(params: { enabled: boolean; imagingCenterId: string | null; onChange: () => void }) {
  const { enabled, imagingCenterId, onChange } = params;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled || !imagingCenterId) return;

    const channel = supabase
      .channel(`rt-imaging-orders-${imagingCenterId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "imaging_order_state",
          filter: `imaging_center_id=eq.${imagingCenterId}`,
        },
        () => onChangeRef.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, imagingCenterId]);
}
