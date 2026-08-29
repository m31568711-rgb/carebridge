'use client';

import { useActionState, useState } from 'react';
import { AddressLocationPicker } from '@/src/components/location/address-location-picker';
import { Button } from '@/src/components/ui/button';
import type { Locale } from '@/src/i18n/config';
import { createMedicalCaseAction, saveRecommendationAction, updateMedicalCaseAction, uploadCaseDocumentAction, type CaseActionState } from './actions';
import type { MedicalCaseRecord, PatientProfileRecord, RecommendationRecord, SelectOption } from './data';
import type { CaseDictionary } from './messages';

const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';
const textAreaClass = `${inputClass} min-h-28 py-3`;
const initialCaseActionState: CaseActionState = {};

function Feedback({ state, copy }: { state: { error?: string; success?: string }; copy: CaseDictionary }) {
  if (state.success) return <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{state.success === 'uploaded' ? copy.documents.uploaded : copy.case.saved}</p>;
  if (state.error) return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{state.error === 'invalid' ? copy.case.invalid : copy.common.error}</p>;
  return null;
}

export function CaseForm({ locale, copy, options, profile = null, record }: { locale: Locale; copy: CaseDictionary; options: { specialties: SelectOption[]; countries: SelectOption[]; cities: SelectOption[] }; profile?: PatientProfileRecord | null; record?: MedicalCaseRecord }) {
  const action = record ? updateMedicalCaseAction : createMedicalCaseAction;
  const [state, formAction, pending] = useActionState(action, initialCaseActionState);
  const editable = !record || record.status === 'DRAFT';
  const [countryId, setCountryId] = useState(profile?.country_id ?? record?.preferred_country_id ?? '');
  const [cityId, setCityId] = useState(profile?.city_id ?? record?.preferred_city_id ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth ?? '');
  const cities = options.cities.filter((city) => !countryId || city.countryId === countryId);
  const born = dateOfBirth ? new Date(`${dateOfBirth}T00:00:00`) : null; const now = new Date(); let age = born ? now.getFullYear() - born.getFullYear() : -1; if (born && now < new Date(now.getFullYear(), born.getMonth(), born.getDate())) age -= 1;
  const labels = locale === 'ar' ? { personal:'بيانات المريض',first:'الاسم الأول',last:'اسم العائلة',birth:'تاريخ الميلاد',age:'العمر',gender:'الجنس',female:'أنثى',male:'ذكر',other:'آخر',prefer:'أفضل عدم الإفصاح',chronic:'الأمراض المزمنة والحالات السابقة',medications:'الأدوية الحالية',allergies:'الحساسية',address:'الموقع أو العنوان',directions:'المبنى أو الطابق أو علامة مميزة (اختياري)' } : locale === 'fr' ? { personal:'Informations du patient',first:'Prénom',last:'Nom',birth:'Date de naissance',age:'Âge',gender:'Genre',female:'Femme',male:'Homme',other:'Autre',prefer:'Préfère ne pas répondre',chronic:'Maladies chroniques et antécédents',medications:'Traitements actuels',allergies:'Allergies',address:'Adresse ou lieu',directions:'Bâtiment, étage ou indication (facultatif)' } : { personal:'Patient details',first:'First name',last:'Last name',birth:'Date of birth',age:'Age',gender:'Gender',female:'Female',male:'Male',other:'Other',prefer:'Prefer not to say',chronic:'Chronic conditions and medical history',medications:'Current medications',allergies:'Allergies',address:'Address or location',directions:'Building, floor, landmark, or directions (optional)' };
  return <form action={formAction} className="grid gap-5">
    <input name="locale" type="hidden" value={locale} />{record ? <input name="case_id" type="hidden" value={record.id} /> : null}
    <Feedback copy={copy} state={state} />
    {!record ? <fieldset className="grid gap-5 rounded-2xl border border-slate-200 p-5 sm:grid-cols-2"><legend className="px-2 text-sm font-semibold text-blue-800">{labels.personal}</legend>
      <label className="grid gap-2 text-sm font-semibold">{labels.first}<input className={inputClass} defaultValue={profile?.first_name ?? ''} disabled={!editable} maxLength={120} name="first_name" required /></label>
      <label className="grid gap-2 text-sm font-semibold">{labels.last}<input className={inputClass} defaultValue={profile?.last_name ?? ''} disabled={!editable} maxLength={120} name="last_name" required /></label>
      <label className="grid gap-2 text-sm font-semibold">{labels.birth}<input className={inputClass} disabled={!editable} max={new Date().toISOString().slice(0,10)} name="date_of_birth" onChange={(event)=>setDateOfBirth(event.target.value)} type="date" value={dateOfBirth} /></label>
      <label className="grid gap-2 text-sm font-semibold">{labels.age}<input className={inputClass} disabled readOnly value={age >= 0 ? age : ''} /></label>
      <label className="grid gap-2 text-sm font-semibold">{labels.gender}<select className={inputClass} defaultValue={profile?.gender ?? ''} disabled={!editable} name="gender"><option value="">{copy.case.choose}</option><option value="FEMALE">{labels.female}</option><option value="MALE">{labels.male}</option><option value="OTHER">{labels.other}</option><option value="PREFER_NOT_TO_SAY">{labels.prefer}</option></select></label>
    </fieldset> : null}
    <label className="grid gap-2 text-sm font-semibold">{copy.case.title}<span className="text-xs font-normal text-slate-500">{copy.common.required}</span><input className={inputClass} defaultValue={record?.title} disabled={!editable} maxLength={180} minLength={3} name="title" required /></label>
    <label className="grid gap-2 text-sm font-semibold">{copy.case.specialty}<select className={inputClass} defaultValue={record?.specialty_id ?? ''} disabled={!editable} name="specialty_id" required><option value="">{copy.case.choose}</option>{options.specialties.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-semibold">{copy.case.description}<textarea className={textAreaClass} defaultValue={record?.description} disabled={!editable} maxLength={8000} minLength={10} name="description" required /></label>
    <label className="grid gap-2 text-sm font-semibold">{copy.case.symptoms}<textarea className={textAreaClass} defaultValue={record?.symptoms_notes ?? ''} disabled={!editable} maxLength={8000} name="symptoms_notes" /></label>
    <label className="grid gap-2 text-sm font-semibold">{labels.chronic}<textarea className={textAreaClass} defaultValue={record?.chronic_conditions ?? ''} disabled={!editable} maxLength={4000} name="chronic_conditions" /></label>
    <label className="grid gap-2 text-sm font-semibold">{labels.medications}<textarea className={textAreaClass} defaultValue={record?.current_medications ?? ''} disabled={!editable} maxLength={4000} name="current_medications" /></label>
    <label className="grid gap-2 text-sm font-semibold">{labels.allergies}<textarea className={textAreaClass} defaultValue={record?.allergies ?? ''} disabled={!editable} maxLength={4000} name="allergies" /></label>
    <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">{copy.case.country}<select className={inputClass} disabled={!editable} name="preferred_country_id" onChange={(event) => { setCountryId(event.target.value); setCityId(''); }} value={countryId}><option value="">{copy.case.choose}</option>{options.countries.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><input name="country_id" type="hidden" value={countryId} /></label><label className="grid gap-2 text-sm font-semibold">{copy.case.city}<select className={inputClass} disabled={!editable || !countryId} name="preferred_city_id" onChange={(event) => setCityId(event.target.value)} value={cityId}><option value="">{copy.case.choose}</option>{cities.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><input name="city_id" type="hidden" value={cityId} /></label></div>
    <AddressLocationPicker address={profile?.address_text ?? record?.location_preference} addressLabel={labels.address} addressName="location_preference" details={profile?.location_details} detailsLabel={labels.directions} detailsName="location_details" disabled={!editable} latitude={profile?.latitude ?? record?.preferred_latitude} latitudeName="latitude" longitude={profile?.longitude ?? record?.preferred_longitude} longitudeName="longitude" placeId={profile?.google_place_id} />
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
