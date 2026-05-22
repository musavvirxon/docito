// File: src/lib/doctorSlug.ts
// Resolve a public doctor identifier (username, custom_profile_link, or UUID)
// to the canonical doctors.id UUID. Uses sequential .eq() lookups so slugs
// containing dots or other PostgREST operator characters do not break filters.
import { supabase } from "@/integrations/supabase/client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: string | null | undefined): boolean =>
  !!v && UUID_RE.test(v);

/**
 * Look up a doctor id from a slug. Returns the doctors.id UUID, or null
 * if no matching doctor is found.
 */
export async function resolveDoctorIdFromSlug(
  slug: string | null | undefined,
): Promise<string | null> {
  if (!slug) return null;
  const s = String(slug).trim();
  if (!s) return null;

  // Already a UUID — nothing to resolve.
  if (isUuid(s)) return s;

  const lookups: Array<{ column: string; value: string }> = [
    { column: "custom_profile_link", value: s },
    { column: "username", value: s },
  ];

  for (const { column, value } of lookups) {
    const { data, error } = await (supabase as any)
      .from("doctor_public_profile_view")
      .select("id")
      .eq(column, value)
      .limit(1)
      .maybeSingle();
    if (!error && data?.id) return String(data.id);
  }

  // Fallback to doctor_profiles_view for authenticated/unlisted profiles
  for (const { column, value } of lookups) {
    const { data, error } = await (supabase as any)
      .from("doctor_profiles_view")
      .select("id")
      .eq(column, value)
      .limit(1)
      .maybeSingle();
    if (!error && data?.id) return String(data.id);
  }

  return null;
}
