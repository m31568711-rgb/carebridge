import type { User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import type { AppRole } from '@/src/config/roles';
import { hasAllowedRole } from '@/src/config/roles';
import type { Locale } from '@/src/i18n/config';
import { getSupabaseServerClient } from '@/src/lib/supabase/server';
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

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const user: User = data.user;
  const [profileResult, roleResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, display_name, preferred_language, avatar_path, account_status')
      .eq('id', user.id)
      .maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: mapProfile((profileResult.data as ProfileRow | null) ?? null),
    roles: ((roleResult.data ?? []) as RoleRow[]).map(({ role }) => role),
  };
}

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
