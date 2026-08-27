'use client';

import { useActionState } from 'react';
import { Button } from '@/src/components/ui/button';
import type { Locale } from '@/src/i18n/config';
import { createMedicalCaseAction, saveRecommendationAction, updateMedicalCaseAction, uploadCaseDocumentAction, type CaseActionState } from './actions';
import type { MedicalCaseRecord, RecommendationRecord, SelectOption } from './data';
import type { CaseDictionary } from './messages';

const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
const textAreaClass = `${inputClass} min-h-28 py-3`;
const initialCaseActionState: CaseActionState = {};

function Feedback({ state, copy }: { state: { error?: string; success?: string }; copy: CaseDictionary }) {
  if (state.success) return <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{state.success === 'uploaded' ? copy.documents.uploaded : copy.case.saved}</p>;
  if (state.error) return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{state.error === 'invalid' ? copy.case.invalid : copy.common.error}</p>;
  return null;
}

export function CaseForm({ locale, copy, options, record }: { locale: Locale; copy: CaseDictionary; options: { specialties: SelectOption[]; countries: SelectOption[]; cities: SelectOption[] }; record?: MedicalCaseRecord }) {
  const action = record ? updateMedicalCaseAction : createMedicalCaseAction;
  const [state, formAction, pending] = useActionState(action, initialCaseActionState);
  const editable = !record || record.status === 'DRAFT';
  return <form action={formAction} className="grid gap-5">
    <input name="locale" type="hidden" value={locale} />{record ? <input name="case_id" type="hidden" value={record.id} /> : null}
    <Feedback copy={copy} state={state} />
    <label className="grid gap-2 text-sm font-semibold">{copy.case.title}<span className="text-xs font-normal text-slate-500">{copy.common.required}</span><input className={inputClass} defaultValue={record?.title} disabled={!editable} maxLength={180} minLength={3} name="title" required /></label>
    <label className="grid gap-2 text-sm font-semibold">{copy.case.specialty}<select className={inputClass} defaultValue={record?.specialty_id ?? ''} disabled={!editable} name="specialty_id" required><option value="">{copy.case.choose}</option>{options.specialties.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-semibold">{copy.case.description}<textarea className={textAreaClass} defaultValue={record?.description} disabled={!editable} maxLength={8000} minLength={10} name="description" required /></label>
    <label className="grid gap-2 text-sm font-semibold">{copy.case.symptoms}<textarea className={textAreaClass} defaultValue={record?.symptoms_notes ?? ''} disabled={!editable} maxLength={8000} name="symptoms_notes" /></label>
    <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">{copy.case.country}<select className={inputClass} defaultValue={record?.preferred_country_id ?? ''} disabled={!editable} name="preferred_country_id"><option value="">{copy.case.choose}</option>{options.countries.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">{copy.case.city}<select className={inputClass} defaultValue={record?.preferred_city_id ?? ''} disabled={!editable} name="preferred_city_id"><option value="">{copy.case.choose}</option>{options.cities.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label></div>
    <label className="grid gap-2 text-sm font-semibold">{copy.case.location}<input className={inputClass} defaultValue={record?.location_preference ?? ''} disabled={!editable} maxLength={500} name="location_preference" /></label>
    {editable ? <Button disabled={pending} loading={pending} type="submit">{record ? copy.case.save : copy.case.saveDraft}</Button> : <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{copy.case.submitHint}</p>}
  </form>;
}

export function DocumentUploadForm({ locale, caseId, copy }: { locale: Locale; caseId: string; copy: CaseDictionary }) {
  const [state, formAction, pending] = useActionState(uploadCaseDocumentAction, initialCaseActionState);
  return <form action={formAction} className="grid gap-4 rounded-2xl bg-slate-50 p-4" encType="multipart/form-data">
    <input name="locale" type="hidden" value={locale} /><input name="case_id" type="hidden" value={caseId} /><Feedback copy={copy} state={state} />
    <label className="grid gap-2 text-sm font-semibold">{copy.documents.type}<select className={inputClass} name="document_type" required>{Object.entries(copy.documents.types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-semibold">{copy.documents.file}<input accept=".pdf,.jpg,.jpeg,.png,.webp,.dcm,application/dicom" className="block w-full text-sm" name="file" required type="file" /><span className="text-xs font-normal text-slate-500">{copy.documents.max}</span></label>
    <label className="grid gap-2 text-sm font-semibold">{copy.documents.notes}<input className={inputClass} maxLength={1000} name="notes" /></label><Button loading={pending} type="submit">{copy.documents.upload}</Button>
  </form>;
}

export function RecommendationForm({ locale, caseId, copy, treatments, recommendation }: { locale: Locale; caseId: string; copy: CaseDictionary; treatments: SelectOption[]; recommendation: RecommendationRecord | null }) {
  const [state, formAction, pending] = useActionState(saveRecommendationAction, initialCaseActionState);
  return <form action={formAction} className="grid gap-5">
    <input name="locale" type="hidden" value={locale} /><input name="case_id" type="hidden" value={caseId} /><Feedback copy={copy} state={state} />
    <label className="grid gap-2 text-sm font-semibold">{copy.recommendation.treatment}<select className={inputClass} defaultValue={recommendation?.treatment_id ?? ''} name="treatment_id" required><option value="">{copy.case.choose}</option>{treatments.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><span className="text-xs font-normal text-slate-500">{copy.recommendation.specialtyRule}</span></label>
    <label className="grid gap-2 text-sm font-semibold">{copy.recommendation.notes}<textarea className={textAreaClass} defaultValue={recommendation?.recommendation_notes ?? ''} maxLength={8000} minLength={10} name="recommendation_notes" required /></label>
    <label className="grid gap-2 text-sm font-semibold">{copy.recommendation.nextSteps}<textarea className={textAreaClass} defaultValue={recommendation?.next_steps ?? ''} maxLength={4000} name="next_steps" /></label>
    <Button loading={pending} type="submit">{recommendation ? copy.recommendation.update : copy.recommendation.submit}</Button>
  </form>;
}
