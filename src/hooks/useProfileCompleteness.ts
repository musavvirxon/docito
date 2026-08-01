import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { validatePhone } from "@/lib/phone/phone";

export type PatientProfileFields = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  profession: string | null;
};

/** Fields required before a patient may book an appointment. */
export const BOOKING_REQUIRED_FIELDS = ["phone"] as const;

/** Extra fields needed to fill the 043/u medical card without blanks. */
export const FORM_043_FIELDS = [
  "full_name",
  "phone",
  "date_of_birth",
  "gender",
  "address",
  "profession",
] as const;

export type ProfileFieldKey = keyof PatientProfileFields;

const EMPTY: PatientProfileFields = {
  full_name: null,
  email: null,
  phone: null,
  date_of_birth: null,
  gender: null,
  address: null,
  profession: null,
};

const isFilled = (key: ProfileFieldKey, value: string | null | undefined): boolean => {
  const v = (value ?? "").toString().trim();
  if (!v) return false;
  if (key === "phone") return validatePhone(v).ok;
  return true;
};

export function useProfileCompleteness() {
  const { user } = useAuth();
  const [fields, setFields] = useState<PatientProfileFields>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setFields(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, email, phone, date_of_birth, gender, address, profession")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) console.error("useProfileCompleteness:", error);
    setFields({ ...EMPTY, ...(data as Partial<PatientProfileFields> | null) });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh().catch(console.error);
  }, [refresh]);

  const missingRequired = BOOKING_REQUIRED_FIELDS.filter((k) => !isFilled(k, fields[k]));
  const missing043 = FORM_043_FIELDS.filter((k) => !isFilled(k, fields[k]));
  const filled043Count = FORM_043_FIELDS.length - missing043.length;

  return {
    loading,
    fields,
    refresh,
    missingRequired: missingRequired as ProfileFieldKey[],
    missing043: missing043 as ProfileFieldKey[],
    filled043Count,
    total043: FORM_043_FIELDS.length,
    canBook: missingRequired.length === 0,
    isComplete: missing043.length === 0,
  };
}
