import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

// createBrowserSupabaseClient reads NEXT_PUBLIC_* envs and syncs cookies for server helpers
export const supabaseBrowser = createBrowserSupabaseClient() as SupabaseClient;
