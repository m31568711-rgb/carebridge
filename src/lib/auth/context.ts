import { redirect } from '@/src/react-app/compat/navigation';
import type { AppRole } from '@/src/config/roles';
import { hasAllowedRole } from '@/src/config/roles';
import type { Locale } from '@/src/i18n/config';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';
import type { AuthContext, UserProfile } from '@/src/types/domain';

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  preferred_language: Locale;
  avatar_path: string | null;
  account_status: UserProfile['accountStatus'];
}

interface RoleRow {
  role: AppRole;
}

function mapProfile(row: ProfileRow | null): UserProfile | null {
  if (!row) return null;

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    preferredLanguage: row.preferred_language,
    avatarPath: row.avatar_path,
    accountStatus: row.account_status,
  };
}

let cachedContext: { userId: string; value: AuthContext } | null = null;

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await getSupabaseBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (error || !user) { cachedContext = null; return null; }
  if (cachedContext?.userId === user.id) return cachedContext.value;
  const [profileResult, roleResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, display_name, preferred_language, avatar_path, account_status')
      .eq('id', user.id)
      .maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
  ]);

  const value = {
    userId: user.id,
    email: user.email ?? null,
    profile: mapProfile((profileResult.data as ProfileRow | null) ?? null),
    roles: ((roleResult.data ?? []) as RoleRow[]).map(({ role }) => role),
  };
  cachedContext = { userId: user.id, value };
  return value;
}

export function clearAuthContextCache() { cachedContext = null; }

export async function requireAuth(locale: Locale) {
  const context = await getAuthContext();
  if (!context) redirect(`/${locale}/login`);
  return context;
}

export async function requireRoles(locale: Locale, allowedRoles: readonly AppRole[]) {
  const context = await requireAuth(locale);

  if (!hasAllowedRole(context.roles, allowedRoles)) {
    redirect(`/${locale}/portal`);
  }

  return context;
}
