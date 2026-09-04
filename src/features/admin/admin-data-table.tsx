import Link from '@/src/react-app/compat/link';
import { ArrowDownUp, Pencil, Power, Search } from 'lucide-react';
import { Badge, type BadgeProps } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import type { Locale } from '@/src/i18n/config';
import { deleteAdminRecord, setAdminRecordActive } from './actions';
import { AdminDeleteButton } from './admin-delete-button';
import type { AdminModuleDefinition } from './config';
import type { LookupMap } from './data';
import { formatCell, formatEnum, localizedValue } from './format';
import type { AdminDictionary } from './messages';
import { ReportToolbar } from '@/src/features/reports/report-toolbar';

interface Props {
  copy: AdminDictionary;
  count: number;
  definition: AdminModuleDefinition;
  direction: 'asc' | 'desc';
  filter: string;
  locale: Locale;
  lookups: LookupMap;
  page: number;
  pageSize: number;
  query: string;
  rows: Record<string, unknown>[];
  sort: string;
}

const columnLabels: Record<string, keyof AdminDictionary['fields']> = {
  name_i18n:'nameEn',display_name_i18n:'displayName',display_name:'displayName',iso2:'iso2',iso3:'iso3',phone_code:'phoneCode',currency_code:'currency',
  country_id:'country',city_id:'city',code:'code',slug:'slug',icon_identifier:'icon',display_order:'displayOrder',specialty_id:'specialty',hospital_id:'hospital',branch_id:'branch',
  treatment_id:'treatment',starting_price:'startingPrice',currency:'currency',estimated_stay_days:'stayDays',doctor_id:'displayName',language_code:'language',proficiency:'proficiency',
  professional_title:'professionalTitle',years_experience:'experience',license_number:'licenseNumber',title:'titleAtHospital',document_type:'documentType',provider_type:'providerType',
  original_filename:'originalFilename',expires_at:'expiryDate',accreditation_name:'accreditationName',issuing_organization:'issuingBody',credential_number:'certificateNumber',
  is_active:'active',is_main:'mainBranch',is_primary:'primary',consultation_available:'consultationAvailable',international_patient_services:'internationalServices',status:'active',verification_state:'verification',created_at:'issueDate',
};

function statusBadge(value: unknown): BadgeProps['variant'] {
  const text = String(value);
  if (text === 'VERIFIED' || text === 'APPROVED' || text === 'ACTIVE' || value === true) return 'green';
  if (text === 'REJECTED' || text === 'SUSPENDED' || text === 'EXPIRED') return 'rose';
  if (text.includes('PENDING') || text === 'UNDER_REVIEW') return 'amber';
  return 'slate';
}

function rowTitle(row: Record<string, unknown>, locale: Locale) {
  return localizedValue(row.name_i18n ?? row.display_name_i18n, locale) || String(row.display_name ?? row.legal_name ?? row.accreditation_name ?? row.document_type ?? 'Record');
}

export function AdminDataTable({ copy, count, definition, direction, filter, locale, lookups, page, pageSize, query, rows, sort }: Props) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const basePath = `/${locale}/admin/${definition.key}`;
  const filterField = definition.fields.find((field) => field.name === definition.filterField);
  const filterOptions = definition.filterLookup ? lookups[definition.filterLookup] ?? [] : filterField?.options?.map((value) => ({ value, label: formatEnum(value, locale) })) ?? [];
  const paramsFor = (updates: Record<string, string>) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (filter) params.set('filter', filter);
    if (sort) params.set('sort', sort);
    if (direction) params.set('dir', direction);
    Object.entries(updates).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] bg-white p-4 sm:flex-row sm:items-center"><p className="text-xs text-[#667c8d]">{count} {copy.common.records}</p><ReportToolbar columns={definition.listColumns.map(column=>({key:column,label:copy.fields[columnLabels[column]??'displayName']}))} filters={[query,filter].filter(Boolean)} locale={locale} reportName={copy.modules[definition.titleKey][0]} rows={rows.map(row=>Object.fromEntries(definition.listColumns.map(column=>[column,formatCell(column,row[column],locale,lookups)])))}/></div>
      <form className="grid gap-3 border-b border-[var(--border)] bg-[#fbfdfe] p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto]" method="get">
        <label className="relative"><span className="sr-only">{copy.common.search}</span><Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-[#7890a2]" /><Input className="ps-10" defaultValue={query} name="q" placeholder={copy.common.search} /></label>
        {definition.filterField ? <Select defaultValue={filter} name="filter"><option value="">{copy.common.all}</option>{filterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select> : <span />}
        <Button type="submit" variant="outline">{copy.common.filter}</Button>
      </form>

      {rows.length ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[800px] border-collapse text-start text-sm">
              <caption className="sr-only">{copy.modules[definition.titleKey][0]}</caption>
              <thead className="bg-[#f4f8fb] text-[0.7rem] font-semibold uppercase tracking-[0.075em] text-[#667c8d]">
                <tr>{definition.listColumns.map((column) => <th className="px-4 py-3.5 text-start" key={column}><Link className="inline-flex items-center gap-1.5 hover:text-[var(--primary)]" href={paramsFor({ sort: column, dir: sort === column && direction === 'asc' ? 'desc' : 'asc', page: '1' })}>{copy.fields[columnLabels[column] ?? 'displayName']}<ArrowDownUp className="size-3" /></Link></th>)}<th className="px-4 py-3.5 text-end">{copy.common.actions}</th></tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[#40576a]">
                {rows.map((row, rowIndex) => {
                  const id = definition.idFields.length === 1 ? String(row[definition.idFields[0]] ?? '') : '';
                  return <tr className="transition hover:bg-[#f8fbfd]" key={id || rowIndex}>{definition.listColumns.map((column) => {
                    const value = row[column]; const statusLike = column === 'status' || column === 'verification_state' || column === 'is_active';
                    return <td className="max-w-64 px-4 py-4" key={column}>{statusLike ? <Badge variant={statusBadge(value)}>{typeof value === 'boolean' ? value ? copy.common.active : copy.common.inactive : formatEnum(String(value), locale)}</Badge> : <span className="line-clamp-2">{formatCell(column, value, locale, lookups)}</span>}</td>;
                  })}<td className="px-4 py-4"><div className="flex justify-end gap-1">
                    {id ? <Link aria-label={copy.common.edit} className="grid size-9 place-items-center rounded-lg text-[#53697b] transition hover:bg-[#eaf3f9] hover:text-[var(--primary)]" href={`${basePath}?edit=${id}`}><Pencil className="size-4" /></Link> : null}
                    {id && definition.statusField ? <form action={setAdminRecordActive}><input name="module" type="hidden" value={definition.key} /><input name="locale" type="hidden" value={locale} /><input name="id" type="hidden" value={id} /><input name="active" type="hidden" value={String(!(row[definition.statusField] === true || row[definition.statusField] === 'ACTIVE'))} /><button aria-label={copy.common.activate} className="grid size-9 place-items-center rounded-lg text-[#53697b] transition hover:bg-[#eaf3f9] hover:text-[var(--primary)]" type="submit"><Power className="size-4" /></button></form> : null}
                    {definition.allowHardDelete ? <form action={deleteAdminRecord}>{definition.idFields.map((key) => <input key={key} name={key} type="hidden" value={String(row[key] ?? '')} />)}<input name="module" type="hidden" value={definition.key} /><input name="locale" type="hidden" value={locale} /><AdminDeleteButton confirmLabel={copy.common.deleteConfirm} label={copy.common.delete} /></form> : null}
                  </div></td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-[var(--border)] md:hidden">{rows.map((row, index) => <article className="p-4" key={String(row.id ?? index)}><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-[var(--foreground)]">{rowTitle(row, locale)}</h3>{row.verification_state ? <Badge variant={statusBadge(row.verification_state)}>{formatEnum(String(row.verification_state), locale)}</Badge> : null}</div><dl className="mt-3 grid gap-2 text-xs">{definition.listColumns.slice(1,4).map((column) => <div className="flex justify-between gap-4" key={column}><dt className="text-[#708496]">{copy.fields[columnLabels[column] ?? 'displayName']}</dt><dd className="text-end text-[#40576a]">{formatCell(column,row[column],locale,lookups)}</dd></div>)}</dl>{row.id ? <Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]" href={`${basePath}?edit=${String(row.id)}`}><Pencil className="size-4" />{copy.common.edit}</Link> : null}</article>)}</div>
        </>
      ) : <div className="p-8"><EmptyState description={copy.common.noResultsDescription} title={copy.common.noResults} /></div>}

      <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[#fbfdfe] px-4 py-3 text-xs text-[#667c8d] sm:flex-row sm:items-center sm:justify-between">
        <p>{count} {copy.common.records} · {copy.common.page} {page} {copy.common.of} {totalPages}</p>
        <div className="flex gap-2"><Link aria-disabled={page <= 1} className={`rounded-lg border border-[var(--border)] bg-white px-3 py-2 font-semibold ${page <= 1 ? 'pointer-events-none opacity-40' : 'hover:border-[#9bbdce]'}`} href={paramsFor({ page: String(page - 1) })}>{copy.common.previous}</Link><Link aria-disabled={page >= totalPages} className={`rounded-lg border border-[var(--border)] bg-white px-3 py-2 font-semibold ${page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:border-[#9bbdce]'}`} href={paramsFor({ page: String(page + 1) })}>{copy.common.next}</Link></div>
      </div>
    </div>
  );
}
