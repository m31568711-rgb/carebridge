import type { SupabaseClient } from '@supabase/supabase-js';
import type { Locale } from '@/src/i18n/config';
import { adminModules, type AdminModuleDefinition, type LookupKey } from './config';

export interface LookupOption { value: string; label: string; countryId?: string; hospitalId?: string; providerType?: string; }
export type LookupMap = Partial<Record<LookupKey, LookupOption[]>>;

function translated(value: unknown, locale: Locale) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const record = value as Record<string, unknown>;
  return String(record[locale] ?? record.en ?? record.fr ?? record.ar ?? '');
}

const lookupSelect: Record<Exclude<LookupKey, 'providers'>, { table: string; select: string; order: string }> = {
  countries: { table: 'countries', select: 'id,name_i18n,iso2', order: 'iso2' },
  cities: { table: 'cities', select: 'id,country_id,name_i18n', order: 'created_at' },
  specialties: { table: 'specialties', select: 'id,name_i18n,code', order: 'display_order' },
  treatments: { table: 'treatments', select: 'id,name_i18n,code', order: 'created_at' },
  hospitals: { table: 'hospitals', select: 'id,display_name_i18n,legal_name', order: 'created_at' },
  hospital_branches: { table: 'hospital_branches', select: 'id,hospital_id,name_i18n', order: 'created_at' },
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
  if (definition.key === 'provider_documents' || definition.key === 'provider_accreditations') keys.push('providers');
  const entries = await Promise.all(keys.map(async (key) => {
    if (key === 'providers') {
      const [hospitals, doctors, pharmacies, radiology, laboratories] = await Promise.all([
        supabase.from('hospitals').select('id,display_name_i18n,legal_name').order('legal_name').limit(250),
        supabase.from('doctors').select('id,display_name,first_name,last_name').order('display_name').limit(250),
        supabase.from('pharmacies').select('id,display_name_i18n,legal_name').order('legal_name').limit(250),
        supabase.from('radiology_centers').select('id,display_name_i18n,legal_name').order('legal_name').limit(250),
        supabase.from('medical_laboratories').select('id,display_name_i18n,legal_name').order('legal_name').limit(250),
      ]);
      const named = (rows: unknown[] | null, providerType: string) => (rows ?? []).map((item) => {
        const row = item as Record<string, unknown>;
        return { value: String(row.id), label: translated(row.display_name_i18n, locale) || String(row.display_name ?? row.legal_name ?? [row.first_name, row.last_name].filter(Boolean).join(' ')), providerType };
      });
      return [key, [
        ...named(hospitals.data as unknown[] | null, 'HOSPITAL'), ...named(doctors.data as unknown[] | null, 'DOCTOR'),
        ...named(pharmacies.data as unknown[] | null, 'PHARMACY'), ...named(radiology.data as unknown[] | null, 'RADIOLOGY_CENTER'),
        ...named(laboratories.data as unknown[] | null, 'MEDICAL_LABORATORY'),
      ]] as const;
    }
    const config = lookupSelect[key];
    const { data } = await supabase.from(config.table).select(config.select).order(config.order).limit(250);
    const options = ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
      value: String(key === 'languages' ? row.code : row.id), label: lookupLabel(key, row, locale), countryId: key === 'cities' ? String(row.country_id) : undefined, hospitalId: key === 'hospital_branches' ? String(row.hospital_id) : undefined,
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
  if (!id) return null;
  const parts = id.split('|');
  if (parts.length !== definition.idFields.length) return null;
  let query = supabase.from(definition.table).select('*');
  definition.idFields.forEach((field, index) => { query = field === 'branch_id' && parts[index] === '' ? query.is(field, null) : query.eq(field, parts[index]); });
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return (data as Record<string, unknown> | null) ?? null;
}

export async function loadAdminDashboard(supabase: SupabaseClient) {
  const [hospitals, doctors, pharmacies, radiologyCenters, medicalLaboratories, specialties, countries, hospitalStates, doctorStates, pharmacyStates, radiologyStates, laboratoryStates, journeys] = await Promise.all([
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
    supabase.from('bookings').select('journey_status'),
  ]);
  const stateRows = [hospitalStates, doctorStates, pharmacyStates, radiologyStates, laboratoryStates].flatMap((result) => (result.data ?? []) as { verification_state: string }[]);
  const distribution = stateRows.reduce<Record<string, number>>((counts, row) => {
    counts[row.verification_state] = (counts[row.verification_state] ?? 0) + 1;
    return counts;
  }, {});
  const journeyRows=(journeys.data??[]) as {journey_status:string}[];
  const journeyBreakdown=journeyRows.reduce<Record<string,number>>((counts,row)=>{counts[row.journey_status]=(counts[row.journey_status]??0)+1;return counts;},{});
  const errors = [hospitals, doctors, pharmacies, radiologyCenters, medicalLaboratories, specialties, countries, hospitalStates, doctorStates, pharmacyStates, radiologyStates, laboratoryStates, journeys].some((result) => result.error);
  return {
    counts: { hospitals: hospitals.count ?? 0, doctors: doctors.count ?? 0, pharmacies: pharmacies.count ?? 0, radiologyCenters: radiologyCenters.count ?? 0, medicalLaboratories: medicalLaboratories.count ?? 0, specialties: specialties.count ?? 0, countries: countries.count ?? 0, journeys:journeyRows.length },
    distribution,
    journeyBreakdown,
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
