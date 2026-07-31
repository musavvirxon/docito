import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isDentalSpecialty } from "@/lib/clinicalSpecialties";

/**
 * Resolves whether the current user (or a given doctor) is a dental provider.
 * The specialty lives on `doctors`, not on `profiles`, so we look it up.
 */
export function useIsDentist(doctorUserId?: string | null) {
  const { user, profile } = useAuth();
  const targetId = doctorUserId ?? user?.id ?? null;

  const [isDentist, setIsDentist] = useState<boolean>(() =>
    isDentalSpecialty((profile as any)?.specialty)
  );
  const [loading, setLoading] = useState<boolean>(!!targetId);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (isDentalSpecialty((profile as any)?.specialty)) {
        if (!cancelled) {
          setIsDentist(true);
          setLoading(false);
        }
        return;
      }

      if (!targetId) {
        if (!cancelled) {
          setIsDentist(false);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const { data } = await supabase
          .from("doctors")
          .select("specialty")
          .eq("user_id", targetId)
          .maybeSingle();

        if (!cancelled) setIsDentist(isDentalSpecialty((data as any)?.specialty));
      } catch {
        if (!cancelled) setIsDentist(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [targetId, (profile as any)?.specialty]);

  return { isDentist, loading };
}

export default useIsDentist;
