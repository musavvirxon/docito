import { supabase } from "@/integrations/supabase/client";

export async function logSession(label: string) {
  const { data, error } = await supabase.auth.getSession();
  console.log(`[${label}] session error:`, error || null);
  console.log(`[${label}] user:`, data?.session?.user?.id || null, data?.session?.user?.email || null);
  return data?.session?.user || null;
}
