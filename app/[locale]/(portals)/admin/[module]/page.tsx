import Link from '@/src/react-app/compat/link';
import { Plus } from 'lucide-react';
import { notFound } from '@/src/react-app/compat/navigation';
import { AdminDataTable } from '@/src/features/admin/admin-data-table';
import { AdminRecordForm } from '@/src/features/admin/admin-record-form';
import { adminModules, isAdminModuleKey } from '@/src/features/admin/config';
import { loadAdminRecord, loadAdminRows, loadLookups } from '@/src/features/admin/data';
import { getAdminDictionary } from '@/src/features/admin/messages';
import { isLocale } from '@/src/i18n/config';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';
import { PageHeader } from '@/src/components/ui/page-header';

export const dynamic = 'force-dynamic';

type Params = { locale: string; module: string };
type Query = { q?: string; filter?: string; page?: string; sort?: string; dir?: string; create?: string; edit?: string };

export default async function AdminModulePage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Query> }) {
  const [{ locale, module }, queryParams] = await Promise.all([params, searchParams]);
  if (!isLocale(locale) || !isAdminModuleKey(module)) notFound();
  const copy = getAdminDictionary(locale);
  const definition = adminModules[module];
  const supabase = await getSupabaseBrowserClient();
  if (!supabase) return null;
  const page = Math.max(1, Math.min(100000, Number.parseInt(queryParams.page ?? '1', 10) || 1));
  const direction = queryParams.dir === 'asc' ? 'asc' : 'desc';
  const input = { page, query: (queryParams.q ?? '').slice(0,80), filter: (queryParams.filter ?? '').slice(0,80), sort: queryParams.sort ?? definition.defaultSort, direction } as const;
  const [list, lookups, record] = await Promise.all([
    loadAdminRows(supabase, definition, input),
    loadLookups(supabase, definition, locale),
    loadAdminRecord(supabase, definition, queryParams.edit),
  ]);
  const showForm = queryParams.create === '1' || Boolean(queryParams.edit);
  return <div className="mx-auto max-w-[92rem]"><PageHeader actions={<Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-[0_12px_28px_-16px_rgba(22,75,122,.8)] hover:bg-[var(--primary-hover)]" href={`/${locale}/admin/${module}?create=1`}><Plus className="size-4" />{copy.common.add}</Link>} description={copy.modules[module][1]} eyebrow={copy.title} title={copy.modules[module][0]} />
    <div className="mt-7">{showForm ? <AdminRecordForm copy={copy} definition={definition} locale={locale} lookups={lookups} record={record} /> : null}<AdminDataTable copy={copy} count={list.count} definition={definition} direction={direction} filter={input.filter} locale={locale} lookups={lookups} page={page} pageSize={list.pageSize} query={input.query} rows={list.rows} sort={list.sort} /></div>
  </div>;
}
