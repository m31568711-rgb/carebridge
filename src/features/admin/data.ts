import type { SupabaseClient } from '@supabase/supabase-js';
import type { Locale } from '@/src/i18n/config';
import { adminModules, type AdminModuleDefinition, type LookupKey } from './config';

export interface LookupOption { value: string; label: string; countryId?: string; }
export type LookupMap = Partial<Record<LookupKey, LookupOption[]>>;

function translated(value: unknown, locale: Locale) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const record = value as Record<string, unknown>;
  return String(record[locale] ?? record.en ?? record.fr ?? record.ar ?? '');
}

const lookupSelect: Record<LookupKey, { table: string; select: string; order: string }> = {
  countries: { table: 'countries', select: 'id,name_i18n,iso2', order: 'iso2' },
  cities: { table: 'cities', select: 'id,country_id,name_i18n', order: 'created_at' },
  specialties: { table: 'specialties', select: 'id,name_i18n,code', order: 'display_order' },
  treatments: { table: 'treatments', select: 'id,name_i18n,code', order: 'created_at' },
  hospitals: { table: 'hospitals', select: 'id,display_name_i18n,legal_name', order: 'created_at' },
  hospital_branches: { table: 'hospital_branches', select: 'id,name_i18n', order: 'created_at' },
  doctors: { table: 'doctors', select: 'id,display_name,first_name,last_name', order: 'created_at' },
  pharmacies: { table: 'pharmacies', select: 'id,display_name_i18n,legal_name', order: 'created_at' },
  languages: { table: 'languages', select: 'code,name_i18n', order: 'display_order' },
};

function lookupLabel(key: LookupKey, row: Record<string, unknown>, locale: Locale) {
  if (key === 'doctors') return String(row.display_name || `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim());
  if (key === 'hospitals' || key === 'pharmacies') return translated(row.display_name_i18n, locale) || String(row.legal_name ?? '');
  return translated(row.name_i18n, locale) || String(row.code ?? row.iso2 ?? '');
}

export async function loadLookups(supabase: SupabaseClient, definition: AdminModuleDefinition, locale: Locale): Promise<LookupMap> {
  const keys = [...new Set(definition.fields.flatMap((field) => field.lookup ? [field.lookup] : []))];
  const entries = await Promise.all(keys.map(async (key) => {
    const config = lookupSelect[key];
    const { data } = await supabase.from(config.table).select(config.select).order(config.order).limit(250);
    const options = ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
      value: String(key === 'languages' ? row.code : row.id), label: lookupLabel(key, row, locale), countryId: key === 'cities' ? String(row.country_id) : undefined,
    }));
    return [key, options] as const;
  }));
  return Object.fromEntries(entries) as LookupMap;
}

export interface AdminListInput { page: number; query: string; filter: string; sort: string; direction: 'asc' | 'desc'; }

export async function loadAdminRows(supabase: SupabaseClient, definition: AdminModuleDefinition, input: AdminListInput) {
  const pageSize = 20;
  const safeSort = [...definition.listColumns, definition.defaultSort].includes(input.sort) ? input.sort : definition.defaultSort;
  let query = supabase.from(definition.table).select('*', { count: 'exact' });
  const cleanSearch = input.query.replace(/[%(),]/g, ' ').trim().slice(0, 80);
  if (cleanSearch && definition.searchColumns.length) {
    query = query.or(definition.searchColumns.map((column) => `${column}.ilike.%${cleanSearch}%`).join(','));
  }
  if (input.filter && definition.filterField) query = query.eq(definition.filterField, input.filter);
  const from = (input.page - 1) * pageSize;
  const result = await query.order(safeSort, { ascending: input.direction === 'asc' }).range(from, from + pageSize - 1);
  return {
    rows: (result.data ?? []) as unknown as Record<string, unknown>[],
    count: result.count ?? 0,
    error: result.error ? 'database' : null,
    pageSize,
    sort: safeSort,
  };
}

export async function loadAdminRecord(supabase: SupabaseClient, definition: AdminModuleDefinition, id?: string) {
  if (!id || definition.idFields.length !== 1) return null;
  const { data } = await supabase.from(definition.table).select('*').eq(definition.idFields[0], id).maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

export async function loadAdminDashboard(supabase: SupabaseClient) {
  const [hospitals, doctors, pharmacies, radiologyCenters, medicalLaboratories, specialties, countries, hospitalStates, doctorStates, pharmacyStates, radiologyStates, laboratoryStates] = await Promise.all([
    supabase.from('hospitals').select('*', { count: 'exact', head: true }),
    supabase.from('doctors').select('*', { count: 'exact', head: true }),
    supabase.from('pharmacies').select('*', { count: 'exact', head: true }),
    supabase.from('radiology_centers').select('*', { count: 'exact', head: true }),
    supabase.from('medical_laboratories').select('*', { count: 'exact', head: true }),
    supabase.from('specialties').select('*', { count: 'exact', head: true }),
    supabase.from('countries').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('hospitals').select('verification_state'),
    supabase.from('doctors').select('verification_state'),
    supabase.from('pharmacies').select('verification_state'),
    supabase.from('radiology_centers').select('verification_state'),
    supabase.from('medical_laboratories').select('verification_state'),
  ]);
  const stateRows = [hospitalStates, doctorStates, pharmacyStates, radiologyStates, laboratoryStates].flatMap((result) => (result.data ?? []) as { verification_state: string }[]);
  const distribution = stateRows.reduce<Record<string, number>>((counts, row) => {
    counts[row.verification_state] = (counts[row.verification_state] ?? 0) + 1;
    return counts;
  }, {});
  const errors = [hospitals, doctors, pharmacies, radiologyCenters, medicalLaboratories, specialties, countries, hospitalStates, doctorStates, pharmacyStates, radiologyStates, laboratoryStates].some((result) => result.error);
  return {
    counts: { hospitals: hospitals.count ?? 0, doctors: doctors.count ?? 0, pharmacies: pharmacies.count ?? 0, radiologyCenters: radiologyCenters.count ?? 0, medicalLaboratories: medicalLaboratories.count ?? 0, specialties: specialties.count ?? 0, countries: countries.count ?? 0 },
    distribution,
    verified: distribution.VERIFIED ?? 0,
    awaiting: (distribution.PENDING_REVIEW ?? 0) + (distribution.DRAFT ?? 0),
    error: errors,
  };
}

export function lookupForColumn(column: string): LookupKey | null {
  const map: Record<string, LookupKey> = { country_id: 'countries', city_id: 'cities', specialty_id: 'specialties', treatment_id: 'treatments', hospital_id: 'hospitals', branch_id: 'hospital_branches', doctor_id: 'doctors', pharmacy_id: 'pharmacies', language_code: 'languages' };
  return map[column] ?? null;
}

export function moduleForKey(key: string) { return adminModules[key as keyof typeof adminModules]; }
