const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function getSupabasePublicEnv() {
  if (!supabaseUrl || !supabasePublishableKey) return null;

  return {
    url: supabaseUrl,
    publishableKey: supabasePublishableKey,
  };
}

export function getApplicationUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  try {
    return new URL(value);
  } catch {
    return new URL('http://localhost:3000');
  }
}
