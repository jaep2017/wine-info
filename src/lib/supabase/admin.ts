import { createClient } from "@supabase/supabase-js";
import { getServiceRoleKey, getSupabasePublicEnv } from "@/lib/env";

export function createAdminSupabaseClient() {
  const { url } = getSupabasePublicEnv();
  return createClient(url, getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
