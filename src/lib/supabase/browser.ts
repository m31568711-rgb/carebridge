'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from '@/src/lib/env/public';

let client: SupabaseClient | null | undefined;

export function getSupabaseBrowserClient() {
  if (client !== undefined) return client;

  const env = getSupabasePublicEnv();
  client = env ? createBrowserClient(env.url, env.publishableKey) : null;
  return client;
}
