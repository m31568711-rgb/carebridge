'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/src/i18n/config';
import { requireRoles } from '@/src/lib/auth/context';
import { getSupabaseServerClient } from '@/src/lib/supabase/server';
import { allowedCaseMimeTypes, caseDocumentSchema, maxCaseFileBytes, medicalCaseSchema, recommendationSchema, safeObjectFilename } from './validation';

export interface CaseActionState { error?: string; success?: string }

function localeFrom(formData: FormData): Locale {
  const value = String(formData.get('locale') ?? 'en');
  return isLocale(value) ? value : 'en';
}

function casePayload(formData: FormData) {
  return medicalCaseSchema.safeParse({
    specialty_id: String(formData.get('specialty_id') ?? ''),
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    symptoms_notes: String(formData.get('symptoms_notes') ?? ''),
    preferred_country_id: String(formData.get('preferred_country_id') ?? ''),
    preferred_city_id: String(formData.get('preferred_city_id') ?? ''),
    location_preference: String(formData.get('location_preference') ?? ''),
  });
}

export async function createMedicalCaseAction(_state: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const locale = localeFrom(formData);
  const context = await requireRoles(locale, ['PATIENT']);
  const parsed = casePayload(formData);
  if (!parsed.success) return { error: 'invalid' };
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: 'unavailable' };
  const { data, error } = await supabase.from('medical_cases').insert({ ...parsed.data, patient_id: context.userId, status: 'DRAFT' }).select('id').single();
  if (error || !data) return { error: 'save' };
  redirect(`/${locale}/patient/cases/${data.id}?saved=1`);
}

export async function updateMedicalCaseAction(_state: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const locale = localeFrom(formData);
  const context = await requireRoles(locale, ['PATIENT']);
  const caseId = String(formData.get('case_id') ?? '');
  const parsed = casePayload(formData);
  if (!parsed.success || !caseId) return { error: 'invalid' };
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: 'unavailable' };
  const { error } = await supabase.from('medical_cases').update(parsed.data).eq('id', caseId).eq('patient_id', context.userId);
  if (error) return { error: 'save' };
  revalidatePath(`/${locale}/patient`);
  revalidatePath(`/${locale}/patient/cases/${caseId}`);
  return { success: 'saved' };
}

export async function submitMedicalCaseAction(formData: FormData) {
  const locale = localeFrom(formData);
  const context = await requireRoles(locale, ['PATIENT']);
  const caseId = String(formData.get('case_id') ?? '');
  const supabase = await getSupabaseServerClient();
  if (!supabase || !caseId) return;
  const { error } = await supabase.from('medical_cases').update({ status: 'SUBMITTED' }).eq('id', caseId).eq('patient_id', context.userId).eq('status', 'DRAFT');
  if (!error) {
    revalidatePath(`/${locale}/patient`);
    revalidatePath(`/${locale}/patient/cases/${caseId}`);
  }
}

export async function setMedicalCaseStatusAction(formData: FormData) {
  const locale = localeFrom(formData);
  const context = await requireRoles(locale, ['PATIENT']);
  const caseId = String(formData.get('case_id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!caseId || !['CANCELLED', 'CLOSED'].includes(status)) return;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return;
  await supabase.from('medical_cases').update({ status }).eq('id', caseId).eq('patient_id', context.userId);
  revalidatePath(`/${locale}/patient`);
  revalidatePath(`/${locale}/patient/cases/${caseId}`);
}

export async function uploadCaseDocumentAction(_state: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const locale = localeFrom(formData);
  const context = await requireRoles(locale, ['PATIENT']);
  const caseId = String(formData.get('case_id') ?? '');
  const file = formData.get('file');
  const parsed = caseDocumentSchema.safeParse({ document_type: String(formData.get('document_type') ?? ''), notes: String(formData.get('notes') ?? '') });
  if (!parsed.success || !caseId || !(file instanceof File) || file.size < 1 || file.size > maxCaseFileBytes || !allowedCaseMimeTypes.includes(file.type as (typeof allowedCaseMimeTypes)[number])) return { error: 'invalid' };
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: 'unavailable' };
  const { data: ownedCase } = await supabase.from('medical_cases').select('id').eq('id', caseId).eq('patient_id', context.userId).maybeSingle();
  if (!ownedCase) return { error: 'unauthorized' };
  const objectPath = `${context.userId}/${caseId}/${crypto.randomUUID()}-${safeObjectFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage.from('patient-medical').upload(objectPath, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: 'upload' };
  const { error: metadataError } = await supabase.from('case_documents').insert({
    case_id: caseId, uploaded_by: context.userId, document_type: parsed.data.document_type, object_path: objectPath,
    original_filename: file.name.slice(0, 240), mime_type: file.type, file_size_bytes: file.size, notes: parsed.data.notes,
  });
  if (metadataError) {
    await supabase.storage.from('patient-medical').remove([objectPath]);
    return { error: 'upload' };
  }
  revalidatePath(`/${locale}/patient/cases/${caseId}`);
  return { success: 'uploaded' };
}

export async function deleteCaseDocumentAction(formData: FormData) {
  const locale = localeFrom(formData);
  const context = await requireRoles(locale, ['PATIENT']);
  const caseId = String(formData.get('case_id') ?? '');
  const documentId = String(formData.get('document_id') ?? '');
  const supabase = await getSupabaseServerClient();
  if (!supabase || !caseId || !documentId) return;
  const { data: document } = await supabase.from('case_documents').select('object_path').eq('id', documentId).eq('case_id', caseId).eq('uploaded_by', context.userId).maybeSingle();
  if (!document) return;
  const { error: storageError } = await supabase.storage.from('patient-medical').remove([document.object_path]);
  if (!storageError) await supabase.from('case_documents').delete().eq('id', documentId).eq('uploaded_by', context.userId);
  revalidatePath(`/${locale}/patient/cases/${caseId}`);
}

export async function saveRecommendationAction(_state: CaseActionState, formData: FormData): Promise<CaseActionState> {
  const locale = localeFrom(formData);
  const context = await requireRoles(locale, ['DOCTOR']);
  const caseId = String(formData.get('case_id') ?? '');
  const parsed = recommendationSchema.safeParse({
    treatment_id: String(formData.get('treatment_id') ?? ''),
    recommendation_notes: String(formData.get('recommendation_notes') ?? ''),
    next_steps: String(formData.get('next_steps') ?? ''),
  });
  if (!caseId || !parsed.success) return { error: 'invalid' };
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { error: 'unavailable' };
  const { data: doctor } = await supabase.from('doctors').select('id').eq('user_id', context.userId).eq('status', 'ACTIVE').eq('verification_state', 'VERIFIED').maybeSingle();
  if (!doctor) return { error: 'unauthorized' };
  const { error } = await supabase.from('treatment_recommendations').upsert({
    case_id: caseId, doctor_id: doctor.id, treatment_id: parsed.data.treatment_id,
    recommendation_notes: parsed.data.recommendation_notes, next_steps: parsed.data.next_steps, status: 'SUBMITTED',
  }, { onConflict: 'case_id,doctor_id' });
  if (error) return { error: 'save' };
  revalidatePath(`/${locale}/doctor`);
  revalidatePath(`/${locale}/doctor/cases/${caseId}`);
  revalidatePath(`/${locale}/patient/cases/${caseId}`);
  return { success: 'saved' };
}
