import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supabaseBrowserClient: SupabaseClient | null = null;

function getSupabaseBrowserConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

export function hasSupabaseBrowserConfig() {
  return getSupabaseBrowserConfig() !== null;
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const config = getSupabaseBrowserConfig();

  if (!config) {
    return null;
  }

  if (!supabaseBrowserClient) {
    supabaseBrowserClient = createClient(
      config.supabaseUrl,
      config.supabaseAnonKey,
    );
  }

  return supabaseBrowserClient;
}
