import type { SupabaseClient } from '@supabase/supabase-js';
import type { Locale } from '@/src/i18n/config';

export type MedicalCaseStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'RECOMMENDATION_AVAILABLE' | 'CLOSED' | 'CANCELLED';

export interface SelectOption { id: string; label: string; countryId?: string }
export interface MedicalCaseRecord {
  id: string; patient_id: string; specialty_id: string; title: string; description: string; symptoms_notes: string | null;
  chronic_conditions: string | null; current_medications: string | null; allergies: string | null;
  preferred_country_id: string | null; preferred_city_id: string | null; location_preference: string | null;
  preferred_latitude: number | null; preferred_longitude: number | null;
  status: MedicalCaseStatus; created_at: string; updated_at: string; submitted_at: string | null; closed_at: string | null;
  specialty?: { name_i18n: Record<string, string> } | null;
  country?: { name_i18n: Record<string, string> } | null;
  city?: { name_i18n: Record<string, string> } | null;
}

export interface PatientProfileRecord { first_name: string | null; last_name: string | null; date_of_birth: string | null; gender: string | null; country_id: string | null; city_id: string | null; address_text: string | null; location_details: string | null; google_place_id: string | null; latitude: number | null; longitude: number | null }

export interface CaseDocumentRecord {
  id: string; case_id: string; document_type: 'MEDICAL_REPORT' | 'LAB_RESULT' | 'RADIOLOGY' | 'PRESCRIPTION' | 'OTHER';
  object_path: string; original_filename: string; mime_type: string; file_size_bytes: number; notes: string | null; created_at: string; signedUrl?: string | null;
}

export interface RecommendationRecord {
  id: string; case_id: string; doctor_id: string; treatment_id: string; recommendation_notes: string; next_steps: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'WITHDRAWN'; submitted_at: string | null; updated_at: string;
  treatment?: { name_i18n: Record<string, string> } | null;
  doctor?: { display_name: string | null; first_name: string; last_name: string } | null;
}

export interface ProviderSearchRecord {
  provider_type: 'HOSPITAL' | 'DOCTOR' | 'PHARMACY' | 'RADIOLOGY_CENTER' | 'MEDICAL_LABORATORY';
  provider_id: string; location_id: string | null; name_i18n: Record<string, string>; description_i18n: Record<string, string>;
  country_id: string | null; city_id: string | null; specialty_ids: string[]; latitude: number | null; longitude: number | null;
  public_phone: string | null; public_email: string | null; website_url: string | null; distance_km: number | null; total_count: number;
}

export function localized(value: Record<string, string> | null | undefined, locale: Locale) {
  return value?.[locale] || value?.en || Object.values(value ?? {})[0] || '';
}

export async function loadCaseOptions(supabase: SupabaseClient, locale: Locale) {
  const [specialties, countries, cities] = await Promise.all([
    supabase.from('specialties').select('id,name_i18n').eq('status', 'ACTIVE').order('display_order'),
    supabase.from('countries').select('id,name_i18n').eq('is_active', true).order('iso2'),
    supabase.from('cities').select('id,country_id,name_i18n').eq('is_active', true).order('created_at'),
  ]);
  return {
    specialties: ((specialties.data ?? []) as Array<{ id: string; name_i18n: Record<string, string> }>).map((row) => ({ id: row.id, label: localized(row.name_i18n, locale) })),
    countries: ((countries.data ?? []) as Array<{ id: string; name_i18n: Record<string, string> }>).map((row) => ({ id: row.id, label: localized(row.name_i18n, locale) })),
    cities: ((cities.data ?? []) as Array<{ id: string; country_id: string; name_i18n: Record<string, string> }>).map((row) => ({ id: row.id, countryId: row.country_id, label: localized(row.name_i18n, locale) })),
  };
}

export async function loadPatientCases(supabase: SupabaseClient, patientId: string) {
  const { data } = await supabase.from('medical_cases')
    .select('id,patient_id,specialty_id,title,description,symptoms_notes,preferred_country_id,preferred_city_id,location_preference,status,created_at,updated_at,submitted_at,closed_at,specialty:specialties(name_i18n)')
    .eq('patient_id', patientId).order('updated_at', { ascending: false }).limit(50);
  return (data ?? []) as unknown as MedicalCaseRecord[];
}

export async function loadPatientProfile(supabase: SupabaseClient, patientId: string) {
  const { data } = await supabase.from('profiles').select('first_name,last_name,date_of_birth,gender,country_id,city_id,address_text,location_details,google_place_id,latitude,longitude').eq('id', patientId).maybeSingle();
  return data as PatientProfileRecord | null;
}

export async function loadMedicalCase(supabase: SupabaseClient, caseId: string) {
  const [caseResult, documentsResult, recommendationResult] = await Promise.all([
    supabase.from('medical_cases').select('*,specialty:specialties(name_i18n),country:countries(name_i18n),city:cities(name_i18n)').eq('id', caseId).maybeSingle(),
    supabase.from('case_documents').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
    supabase.from('treatment_recommendations').select('*,treatment:treatments(name_i18n),doctor:doctors(display_name,first_name,last_name)').eq('case_id', caseId).eq('status', 'SUBMITTED').order('updated_at', { ascending: false }),
  ]);
  const documents = (documentsResult.data ?? []) as CaseDocumentRecord[];
  const signedDocuments = await Promise.all(documents.map(async (document) => {
    const { data } = await supabase.storage.from('patient-medical').createSignedUrl(document.object_path, 600);
    return { ...document, signedUrl: data?.signedUrl ?? null };
  }));
  return {
    record: (caseResult.data as unknown as MedicalCaseRecord | null) ?? null,
    documents: signedDocuments,
    recommendations: (recommendationResult.data ?? []) as unknown as RecommendationRecord[],
  };
}

export async function loadDoctorCases(supabase: SupabaseClient, userId: string) {
  const { data: doctor } = await supabase.from('doctors').select('id,display_name,first_name,last_name').eq('user_id', userId).maybeSingle();
  if (!doctor) return { doctor: null, cases: [] as MedicalCaseRecord[] };
  const { data } = await supabase.from('case_doctor_assignments')
    .select('assigned_at,medical_case:medical_cases!inner(id,patient_id,specialty_id,title,description,symptoms_notes,preferred_country_id,preferred_city_id,location_preference,status,created_at,updated_at,submitted_at,closed_at,specialty:specialties(name_i18n))')
    .eq('doctor_id', doctor.id).eq('status', 'ACTIVE').order('assigned_at', { ascending: false });
  const cases = (data ?? []).flatMap((row) => {
    const value = (row as unknown as { medical_case: MedicalCaseRecord | MedicalCaseRecord[] }).medical_case;
    return Array.isArray(value) ? value : value ? [value] : [];
  });
  return { doctor: doctor as { id: string; display_name: string | null; first_name: string; last_name: string }, cases };
}

export async function loadDoctorCase(supabase: SupabaseClient, userId: string, caseId: string, locale: Locale) {
  const { data: doctor } = await supabase.from('doctors').select('id,display_name,first_name,last_name').eq('user_id', userId).maybeSingle();
  if (!doctor) return { doctor: null, record: null, documents: [] as CaseDocumentRecord[], recommendation: null, treatments: [] as SelectOption[] };
  const detail = await loadMedicalCase(supabase, caseId);
  if (!detail.record) return { doctor, record: null, documents: [], recommendation: null, treatments: [] as SelectOption[] };
  const [{ data: treatmentRows }, { data: recommendation }] = await Promise.all([
    supabase.from('treatments').select('id,name_i18n').eq('specialty_id', detail.record.specialty_id).eq('status', 'ACTIVE').order('created_at'),
    supabase.from('treatment_recommendations').select('*').eq('case_id', caseId).eq('doctor_id', doctor.id).maybeSingle(),
  ]);
  return {
    doctor,
    record: detail.record,
    documents: detail.documents,
    recommendation: (recommendation as RecommendationRecord | null) ?? null,
    treatments: ((treatmentRows ?? []) as Array<{ id: string; name_i18n: Record<string, string> }>).map((row) => ({ id: row.id, label: localized(row.name_i18n, locale) })),
  };
}

export async function searchProviders(supabase: SupabaseClient, input: {
  query?: string; providerType?: string; countryId?: string; cityId?: string; specialtyId?: string;
  latitude?: number; longitude?: number; page?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const { data, error } = await supabase.rpc('search_providers', {
    p_query: input.query || null,
    p_provider_type: input.providerType || null,
    p_country_id: input.countryId || null,
    p_city_id: input.cityId || null,
    p_specialty_id: input.specialtyId || null,
    p_latitude: Number.isFinite(input.latitude) ? input.latitude : null,
    p_longitude: Number.isFinite(input.longitude) ? input.longitude : null,
    p_limit: 24,
    p_offset: (page - 1) * 24,
  });
  return { rows: (data ?? []) as ProviderSearchRecord[], error: Boolean(error), page };
}
