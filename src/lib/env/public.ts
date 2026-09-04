const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export function getSupabasePublicEnv() {
  if (!supabaseUrl || !supabasePublishableKey) return null;

  return {
    url: supabaseUrl,
    publishableKey: supabasePublishableKey,
  };
}

export function getApplicationUrl() {
  const value = (import.meta.env.NEXT_PUBLIC_APP_URL as string | undefined) ?? window.location.origin;

  try {
    return new URL(value);
  } catch {
    return new URL('http://localhost:3000');
  }
}
