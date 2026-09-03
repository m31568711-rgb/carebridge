'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { FormField } from '@/src/components/ui/form-field';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import type { Locale } from '@/src/i18n/config';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';
import type { AccountType } from './account-types';

export interface ManagedAccountRow {
  user_id: string;
  email: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  account_status: string;
  role_label: string;
  relationship_name: string | null;
  created_at: string;
}

export interface ProviderOption { value: string; label: string; }

const copy = {
  en: {
    title: { patients: 'Patient accounts', doctors: 'Doctor accounts', provider_staff: 'Provider / hospital staff', laboratory_staff: 'Laboratory staff', radiology_staff: 'Radiology staff' },
    description: 'Create and review application accounts. Passwords are sent securely to Supabase Auth and are never stored in CareBridge tables or audit records.',
    create: 'Create account', fullName: 'Full name', email: 'Email / login account', phone: 'Phone', password: 'Temporary password', passwordHint: 'At least 12 characters. Share it securely with the user.', birth: 'Date of birth', age: 'Calculated age', gender: 'Gender', female: 'Female', male: 'Male', other: 'Other', prefer: 'Prefer not to say', provider: 'Healthcare provider', role: 'Hospital role', coordinator: 'Coordinator', hospitalAdmin: 'Hospital administrator', save: 'Create secure account', saving: 'Creating account…', saved: 'Account created successfully.', failed: 'The account could not be created.', empty: 'No accounts in this category yet.', name: 'Name', relationship: 'Provider / relationship', status: 'Status', accountRole: 'Role', years: 'years', select: 'Select…', requiredName: 'Enter the person’s full name, including at least two names.',
  },
  fr: {
    title: { patients: 'Comptes patients', doctors: 'Comptes médecins', provider_staff: 'Personnel hôpital / prestataire', laboratory_staff: 'Personnel de laboratoire', radiology_staff: 'Personnel de radiologie' },
    description: 'Créez et consultez les comptes. Les mots de passe sont transmis directement à Supabase Auth et ne sont jamais conservés dans les tables ou journaux CareBridge.',
    create: 'Créer un compte', fullName: 'Nom complet', email: 'E-mail / compte de connexion', phone: 'Téléphone', password: 'Mot de passe temporaire', passwordHint: '12 caractères minimum. Transmettez-le de façon sécurisée.', birth: 'Date de naissance', age: 'Âge calculé', gender: 'Genre', female: 'Femme', male: 'Homme', other: 'Autre', prefer: 'Préfère ne pas répondre', provider: 'Prestataire de soins', role: 'Rôle hospitalier', coordinator: 'Coordinateur', hospitalAdmin: 'Administrateur hospitalier', save: 'Créer le compte sécurisé', saving: 'Création du compte…', saved: 'Compte créé avec succès.', failed: 'Impossible de créer le compte.', empty: 'Aucun compte dans cette catégorie.', name: 'Nom', relationship: 'Prestataire / relation', status: 'Statut', accountRole: 'Rôle', years: 'ans', select: 'Sélectionner…', requiredName: 'Saisissez le nom complet de la personne, avec au moins deux noms.',
  },
  ar: {
    title: { patients: 'حسابات المرضى', doctors: 'حسابات الأطباء', provider_staff: 'فريق المستشفى ومقدم الرعاية', laboratory_staff: 'فريق المختبر', radiology_staff: 'فريق مركز الأشعة' },
    description: 'أنشئ حسابات المستخدمين وراجعها بأمان. تُرسل كلمات المرور مباشرةً إلى نظام المصادقة ولا تُحفظ في جداول كيربريدج أو سجل التدقيق.',
    create: 'إنشاء حساب جديد', fullName: 'الاسم الكامل', email: 'البريد الإلكتروني لتسجيل الدخول', phone: 'رقم الهاتف', password: 'كلمة مرور مؤقتة', passwordHint: '12 حرفًا على الأقل، وتُرسل للمستخدم عبر وسيلة آمنة.', birth: 'تاريخ الميلاد', age: 'العمر المحسوب', gender: 'النوع', female: 'أنثى', male: 'ذكر', other: 'آخر', prefer: 'أفضل عدم الإفصاح', provider: 'المنشأة الطبية', role: 'الدور داخل المستشفى', coordinator: 'منسق رعاية', hospitalAdmin: 'مسؤول المستشفى', save: 'إنشاء الحساب بأمان', saving: 'جارٍ إنشاء الحساب…', saved: 'تم إنشاء الحساب بنجاح.', failed: 'تعذر إنشاء الحساب.', empty: 'لا توجد حسابات في هذه الفئة حتى الآن.', name: 'الاسم', relationship: 'المنشأة أو جهة الارتباط', status: 'حالة الحساب', accountRole: 'الدور', years: 'سنة', select: 'اختر…', requiredName: 'أدخل الاسم الكامل للشخص، على أن يتضمن اسمين على الأقل.',
  },
} as const;

function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return null;
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

export function AdminAccountManagement({ accountType, locale, options, rows }: { accountType: AccountType; locale: Locale; options: ProviderOption[]; rows: ManagedAccountRow[] }) {
  const labels = copy[locale];
  const router = useRouter();
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const age = useMemo(() => calculateAge(dateOfBirth), [dateOfBirth]);
  const needsProvider = accountType === 'provider_staff' || accountType === 'laboratory_staff' || accountType === 'radiology_staff';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const form = event.currentTarget;
    const values = new FormData(form);
    const fullName = String(values.get('fullName') ?? '').trim();
    if (fullName.split(/\s+/).length < 2) {
      setMessage({ type: 'error', text: labels.requiredName });
      setPending(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage({ type: 'error', text: labels.failed });
      setPending(false);
      return;
    }
    const { error } = await supabase.functions.invoke('admin-account-management', { body: {
      accountType,
      fullName,
      email: values.get('email'),
      phone: values.get('phone'),
      password: values.get('password'),
      dateOfBirth: values.get('dateOfBirth'),
      gender: values.get('gender'),
      relationshipId: values.get('relationshipId'),
      staffRole: values.get('staffRole'),
      locale,
    } });
    if (error) setMessage({ type: 'error', text: error.message || labels.failed });
    else {
      form.reset();
      setDateOfBirth('');
      setMessage({ type: 'success', text: labels.saved });
      router.refresh();
    }
    setPending(false);
  }

  return (
    <div className="mx-auto max-w-[92rem]">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{labels.create}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">{labels.title[accountType]}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{labels.description}</p>
      </div>
      <Card className="mt-7" variant="form">
        <CardHeader><h2 className="type-h3">{labels.create}</h2></CardHeader>
        <CardContent>
          <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
            <FormField id="fullName" label={labels.fullName} required><Input autoComplete="name" id="fullName" name="fullName" required /></FormField>
            <FormField id="email" label={labels.email} required><Input autoComplete="email" id="email" name="email" required type="email" /></FormField>
            {accountType === 'patients' ? <>
              <FormField id="dateOfBirth" label={labels.birth} required><Input id="dateOfBirth" max={new Date().toISOString().slice(0, 10)} name="dateOfBirth" onChange={(event) => setDateOfBirth(event.target.value)} required type="date" value={dateOfBirth} /></FormField>
              <FormField id="age" label={labels.age}><Input disabled id="age" value={age === null ? '' : `${age} ${labels.years}`} /></FormField>
              <FormField id="gender" label={labels.gender} required><Select defaultValue="" id="gender" name="gender" required><option disabled value="">{labels.select}</option><option value="FEMALE">{labels.female}</option><option value="MALE">{labels.male}</option><option value="OTHER">{labels.other}</option><option value="PREFER_NOT_TO_SAY">{labels.prefer}</option></Select></FormField>
            </> : null}
            <FormField id="phone" label={labels.phone}><Input autoComplete="tel" id="phone" maxLength={40} name="phone" type="tel" /></FormField>
            {needsProvider ? <FormField id="relationshipId" label={labels.provider} required><Select defaultValue="" id="relationshipId" name="relationshipId" required><option disabled value="">{labels.select}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></FormField> : null}
            {accountType === 'provider_staff' ? <FormField id="staffRole" label={labels.role} required><Select defaultValue="HOSPITAL_COORDINATOR" id="staffRole" name="staffRole"><option value="HOSPITAL_COORDINATOR">{labels.coordinator}</option><option value="HOSPITAL_ADMIN">{labels.hospitalAdmin}</option></Select></FormField> : null}
            <FormField className="sm:col-span-2" hint={labels.passwordHint} id="password" label={labels.password} required><Input autoComplete="new-password" id="password" minLength={12} name="password" required type="password" /></FormField>
            <div className="flex items-center gap-4 border-t border-slate-200 pt-5 sm:col-span-2">
              <Button loading={pending} type="submit"><UserPlus className="size-4" />{pending ? labels.saving : labels.save}</Button>
              {message ? <p className={message.type === 'success' ? 'text-sm font-medium text-emerald-700' : 'text-sm font-medium text-rose-700'} role={message.type === 'error' ? 'alert' : 'status'}>{message.text}</p> : null}
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="mt-7">
        <CardContent className="overflow-x-auto p-0">
          {rows.length ? <table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50 text-start text-xs font-semibold text-slate-600"><th className="px-5 py-3 text-start">{labels.name}</th><th className="px-5 py-3 text-start">{labels.email}</th><th className="px-5 py-3 text-start">{labels.phone}</th><th className="px-5 py-3 text-start">{labels.accountRole}</th><th className="px-5 py-3 text-start">{labels.relationship}</th><th className="px-5 py-3 text-start">{labels.status}</th></tr></thead><tbody>{rows.map((row) => <tr className="border-b border-slate-100 last:border-0" key={row.user_id}><td className="px-5 py-4 font-medium text-slate-950">{row.full_name}</td><td className="px-5 py-4 text-slate-600">{row.email}</td><td className="px-5 py-4 text-slate-600">{row.phone || '—'}</td><td className="px-5 py-4 text-slate-600">{row.role_label.replaceAll('_', ' ')}</td><td className="px-5 py-4 text-slate-600">{row.relationship_name || '—'}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{row.account_status}</span></td></tr>)}</tbody></table> : <p className="p-8 text-center text-sm text-slate-500">{labels.empty}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
