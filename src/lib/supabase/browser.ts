'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from '@/src/lib/env/public';

let client: SupabaseClient | null | undefined;

// The publishable client never carries elevated credentials. PostgreSQL RLS
// remains the authorization boundary for every application data operation.
export function getSupabaseBrowserClient() {
  if (client !== undefined) return client;

  const env = getSupabasePublicEnv();
  client = env ? createClient(env.url, env.publishableKey, {
    auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
  }) : null;
  return client;
}
