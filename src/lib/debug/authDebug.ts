// src/lib/debug/authDebug.ts
import { supabase } from "@/integrations/supabase/client";

/**
 * Logs current session/user to browser console.
 * Use this before inserts to confirm whether preview is anon or authenticated.
 */
export async function logSession(label: string) {
  const { data, error } = await supabase.auth.getSession();

  if (error) console.log(`[${label}] getSession error:`, error);

  const user = data?.session?.user || null;

  console.log(`[${label}] userId:`, user?.id || null);
  console.log(`[${label}] email:`, user?.email || null);
  console.log(`[${label}] role:`, user?.role || null);
  console.log(`[${label}] hasAccessToken:`, !!data?.session?.access_token);

  return user;
}
