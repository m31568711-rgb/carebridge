import { notFound } from 'next/navigation';
import { AdminAccountManagement, isAccountType, type ManagedAccountRow, type ProviderOption } from '@/src/features/admin/admin-account-management';
import { localizedValue } from '@/src/features/admin/format';
import { isLocale } from '@/src/i18n/config';
import { getSupabaseServerClient } from '@/src/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminAccountsPage({ params }: { params: Promise<{ locale: string; accountType: string }> }) {
  const { locale, accountType } = await params;
  if (!isLocale(locale) || !isAccountType(accountType)) notFound();
  const supabase = await getSupabaseServerClient();
  if (!supabase) notFound();

  const accountPromise = supabase.rpc('admin_list_accounts', { requested_type: accountType });
  let providerPromise: PromiseLike<{ data: unknown[] | null }> = Promise.resolve({ data: [] });
  if (accountType === 'provider_staff') providerPromise = supabase.from('hospitals').select('id,legal_name,display_name_i18n').order('legal_name');
  if (accountType === 'laboratory_staff') providerPromise = supabase.from('medical_laboratories').select('id,legal_name,display_name_i18n').order('legal_name');
  if (accountType === 'radiology_staff') providerPromise = supabase.from('radiology_centers').select('id,legal_name,display_name_i18n').order('legal_name');
  const [accountResult, providerResult] = await Promise.all([accountPromise, providerPromise]);
  const options = (providerResult.data ?? []).map((item) => {
    const row = item as { id: string; legal_name: string; display_name_i18n: unknown };
    return { value: row.id, label: localizedValue(row.display_name_i18n, locale) || row.legal_name };
  }) as ProviderOption[];

  return <AdminAccountManagement accountType={accountType} locale={locale} options={options} rows={(accountResult.data ?? []) as ManagedAccountRow[]} />;
}
