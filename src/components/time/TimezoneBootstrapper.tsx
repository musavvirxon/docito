// File: src/components/time/TimezoneBootstrapper.tsx

import { useEffect, useRef, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getBrowserTimeZone } from "@/lib/timezone";

const TimezoneBootstrapper = forwardRef<HTMLDivElement>(function TimezoneBootstrapper(_props, _ref) {
  const { user, profile, session, loading, refreshProfile } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    if (loading) return;
    if (!user) return;

    ran.current = true;

    const key = `docito.tzBootstrapped.${user.id}`;
    if (typeof window !== "undefined" && window.localStorage?.getItem(key) === "1") return;

    const currentTz = (profile as any)?.timezone as string | undefined;

    // If we already have a timezone, don't spam updates.
    if (currentTz && String(currentTz).trim()) {
      try {
        window.localStorage?.setItem(key, "1");
      } catch {
        // ignore
      }
      return;
    }

    const bootstrap = async () => {
      const tz = getBrowserTimeZone();
      const token = session?.access_token;

      try {
        const { data, error } = await supabase.functions.invoke("user-timezone", {
          body: {
            timezone: tz,
            source: "signup_browser",
            allow_overwrite: false,
          },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (error) throw error;
        if (data?.ok === false) throw new Error(data?.error || "Failed to set timezone");

        await refreshProfile();

        try {
          window.localStorage?.setItem(key, "1");
        } catch {
          // ignore
        }
      } catch {
        // Silent by design: timezone bootstrap should never block UX.
      }
    };

    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  return null;
});

export default TimezoneBootstrapper;
