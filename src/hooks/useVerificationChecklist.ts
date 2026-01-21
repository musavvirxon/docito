import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VerificationChecklistItem = {
  doc_type_code: string;
  required: boolean;
  validity_days: number | null;
  notes_key: string | null;
  requires_source_verification: boolean;
  allowed_alternatives: { anyOf?: string[] } | null;
  doc: {
    label_key: string;
    description_key: string;
    accepted_mime: string[];
    requires_expiry: boolean;
  };
};

export type VerificationChecklist = {
  country_iso2: string;
  role: string;
  rule_sets: string[];
  items: VerificationChecklistItem[];
  overrides: any;
  optional_docs: string[];
  conditional_docs: Record<string, string[]>;
};

type HookState = {
  data: VerificationChecklist | null;
  loading: boolean;
  error: string | null;
};

export function useVerificationChecklist(countryIso2: string | null, role: string = "doctor"): HookState {
  const [data, setData] = useState<VerificationChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(() => `${countryIso2 ?? ""}:${role}`, [countryIso2, role]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!countryIso2) {
        setData(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      // Option A: call RPC directly
      const { data: rpcData, error: rpcErr } = await supabase.rpc("get_verification_checklist", {
        country_iso2: countryIso2,
        p_role: role,
      });

      if (cancelled) return;

      if (rpcErr) {
        setError(rpcErr.message);
        setData(null);
      } else {
        setData(rpcData as VerificationChecklist);
      }

      setLoading(false);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [key, countryIso2, role]);

  return { data, loading, error };
}
