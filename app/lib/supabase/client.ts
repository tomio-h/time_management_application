import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Database = {
  public: {
    Tables: {
      activity_tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          sort_order: number;
          is_active: boolean;
          legacy_local_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color: string;
          sort_order?: number;
          is_active?: boolean;
          legacy_local_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string;
          sort_order?: number;
          is_active?: boolean;
          legacy_local_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

let supabaseBrowserClient: SupabaseClient<Database> | null = null;

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

export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  const config = getSupabaseBrowserConfig();

  if (!config) {
    return null;
  }

  if (!supabaseBrowserClient) {
    supabaseBrowserClient = createClient<Database>(
      config.supabaseUrl,
      config.supabaseAnonKey,
    );
  }

  return supabaseBrowserClient;
}
