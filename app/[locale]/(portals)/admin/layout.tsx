import { notFound } from 'next/navigation';
import { AdminShell } from '@/src/features/admin/admin-shell';
import { AdminConfigurationState } from '@/src/features/admin/configuration-state';
import { getAdminDictionary } from '@/src/features/admin/messages';
import { isLocale } from '@/src/i18n/config';
import { getDictionary } from '@/src/i18n/dictionaries';
import { requireRoles } from '@/src/lib/auth/context';
import { getSupabaseServerClient } from '@/src/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) notFound();
  const adminCopy = getAdminDictionary(localeParam);
  const supabase = await getSupabaseServerClient();
  if (!supabase) return <AdminConfigurationState copy={adminCopy} locale={localeParam} />;
  const context = await requireRoles(localeParam, ['SUPER_ADMIN', 'ADMIN']);
  return <AdminShell adminCopy={adminCopy} context={context} dictionary={getDictionary(localeParam)} locale={localeParam}>{children}</AdminShell>;
}
