'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from '@/src/react-app/compat/navigation';
import { Pencil, Power, UserPlus } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { FormField } from '@/src/components/ui/form-field';
import { Input } from '@/src/components/ui/input';
import { Select } from '@/src/components/ui/select';
import { ConfirmationDialog } from '@/src/components/ui/confirmation-dialog';
import { Dialog } from '@/src/components/ui/dialog';
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
    create: 'Create account', fullName: 'Full name', email: 'Email / login account', phone: 'Phone', password: 'Temporary password', passwordHint: 'At least 12 characters. Share it securely with the user.', birth: 'Date of birth', age: 'Calculated age', gender: 'Gender', female: 'Female', male: 'Male', other: 'Other', prefer: 'Prefer not to say', provider: 'Healthcare provider', role: 'Hospital role', coordinator: 'Coordinator', hospitalAdmin: 'Hospital administrator', save: 'Create secure account', saving: 'Saving…', saved: 'Account created successfully.', updated: 'Account updated successfully.', failed: 'The account could not be updated.', empty: 'No accounts in this category yet.', name: 'Name', relationship: 'Provider / relationship', status: 'Status', accountRole: 'Role', actions: 'Actions', edit: 'Edit account', saveChanges: 'Save changes', activate: 'Activate', suspend: 'Suspend', close: 'Close', years: 'years', select: 'Select…', requiredName: 'Enter the person’s full name, including at least two names.',
  },
  fr: {
    title: { patients: 'Comptes patients', doctors: 'Comptes médecins', provider_staff: 'Personnel hôpital / prestataire', laboratory_staff: 'Personnel de laboratoire', radiology_staff: 'Personnel de radiologie' },
    description: 'Créez et consultez les comptes. Les mots de passe sont transmis directement à Supabase Auth et ne sont jamais conservés dans les tables ou journaux CareBridge.',
    create: 'Créer un compte', fullName: 'Nom complet', email: 'E-mail / compte de connexion', phone: 'Téléphone', password: 'Mot de passe temporaire', passwordHint: '12 caractères minimum. Transmettez-le de façon sécurisée.', birth: 'Date de naissance', age: 'Âge calculé', gender: 'Genre', female: 'Femme', male: 'Homme', other: 'Autre', prefer: 'Préfère ne pas répondre', provider: 'Prestataire de soins', role: 'Rôle hospitalier', coordinator: 'Coordinateur', hospitalAdmin: 'Administrateur hospitalier', save: 'Créer le compte sécurisé', saving: 'Enregistrement…', saved: 'Compte créé avec succès.', updated: 'Compte mis à jour.', failed: 'Impossible de mettre à jour le compte.', empty: 'Aucun compte dans cette catégorie.', name: 'Nom', relationship: 'Prestataire / relation', status: 'Statut', accountRole: 'Rôle', actions: 'Actions', edit: 'Modifier le compte', saveChanges: 'Enregistrer', activate: 'Activer', suspend: 'Suspendre', close: 'Fermer', years: 'ans', select: 'Sélectionner…', requiredName: 'Saisissez le nom complet de la personne, avec au moins deux noms.',
  },
  ar: {
    title: { patients: 'حسابات المرضى', doctors: 'حسابات الأطباء', provider_staff: 'فريق المستشفى ومقدم الرعاية', laboratory_staff: 'فريق المختبر', radiology_staff: 'فريق مركز الأشعة' },
    description: 'أنشئ حسابات المستخدمين وراجعها بأمان. تُرسل كلمات المرور مباشرةً إلى نظام المصادقة ولا تُحفظ في جداول كيربريدج أو سجل التدقيق.',
    create: 'إنشاء حساب جديد', fullName: 'الاسم الكامل', email: 'البريد الإلكتروني لتسجيل الدخول', phone: 'رقم الهاتف', password: 'كلمة مرور مؤقتة', passwordHint: '12 حرفًا على الأقل، وتُرسل للمستخدم عبر وسيلة آمنة.', birth: 'تاريخ الميلاد', age: 'العمر المحسوب', gender: 'النوع', female: 'أنثى', male: 'ذكر', other: 'آخر', prefer: 'أفضل عدم الإفصاح', provider: 'المنشأة الطبية', role: 'الدور داخل المستشفى', coordinator: 'منسق رعاية', hospitalAdmin: 'مسؤول المستشفى', save: 'إنشاء الحساب بأمان', saving: 'جارٍ الحفظ…', saved: 'تم إنشاء الحساب بنجاح.', updated: 'تم تحديث الحساب بنجاح.', failed: 'تعذر تحديث الحساب.', empty: 'لا توجد حسابات في هذه الفئة حتى الآن.', name: 'الاسم', relationship: 'المنشأة أو جهة الارتباط', status: 'حالة الحساب', accountRole: 'الدور', actions: 'الإجراءات', edit: 'تعديل الحساب', saveChanges: 'حفظ التغييرات', activate: 'تفعيل', suspend: 'إيقاف', close: 'إغلاق', years: 'سنة', select: 'اختر…', requiredName: 'أدخل الاسم الكامل للشخص، على أن يتضمن اسمين على الأقل.',
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
  const [creating, setCreating] = useState(false);
  const [statusTarget, setStatusTarget] = useState<ManagedAccountRow | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<ManagedAccountRow | null>(null);
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
      setCreating(false);
      setDateOfBirth('');
      setMessage({ type: 'success', text: labels.saved });
      router.refresh();
    }
    setPending(false);
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setPending(true);
    setMessage(null);
    const values = new FormData(event.currentTarget);
    const fullName = String(values.get('fullName') ?? '').trim();
    const supabase = getSupabaseBrowserClient();
    const result = supabase && fullName.split(/\s+/).length > 1
      ? await supabase.functions.invoke('admin-account-management', { body: { action: 'update_profile', targetUserId: editing.user_id, accountType, fullName, phone: values.get('phone'), dateOfBirth: values.get('dateOfBirth'), gender: values.get('gender') } })
      : { error: new Error('invalid') };
    if (result.error) setMessage({ type: 'error', text: labels.failed });
    else {
      setEditing(null);
      setMessage({ type: 'success', text: labels.updated });
      router.refresh();
    }
    setPending(false);
  }

  async function toggleStatus(row: ManagedAccountRow) {
    setPending(true);
    setMessage(null);
    const supabase = getSupabaseBrowserClient();
    const nextStatus = row.account_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const result = supabase
      ? await supabase.functions.invoke('admin-account-management', { body: { action: 'set_status', targetUserId: row.user_id, accountStatus: nextStatus } })
      : { error: new Error('unavailable') };
    if (result.error) setMessage({ type: 'error', text: labels.failed });
    else {
      setMessage({ type: 'success', text: labels.updated });
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
      <Button className="mt-5" onClick={() => setCreating(true)} type="button">{labels.create}</Button>
      <Dialog className="max-w-3xl" open={creating} onClose={() => setCreating(false)} closeLabel={labels.close} title={labels.create}><Card variant="form">
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
      </Card></Dialog>
      {message && !creating ? <p role="status" className="mt-4 text-sm">{message.text}</p> : null}
      <ConfirmationDialog open={Boolean(statusTarget)} onClose={() => setStatusTarget(null)} onConfirm={() => { if (statusTarget) void toggleStatus(statusTarget); setStatusTarget(null); }} title={statusTarget?.account_status === 'ACTIVE' ? labels.suspend : labels.activate} description={statusTarget?.full_name ?? ''} confirmLabel={statusTarget?.account_status === 'ACTIVE' ? labels.suspend : labels.activate} cancelLabel={labels.close} closeLabel={labels.close} destructive />
      <Card className="mt-7">
        <CardContent className="overflow-x-auto p-0">
          {rows.length ? <table className="w-full min-w-[860px] text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50 text-start text-xs font-semibold text-slate-600"><th className="px-5 py-3 text-start">{labels.name}</th><th className="px-5 py-3 text-start">{labels.email}</th><th className="px-5 py-3 text-start">{labels.phone}</th><th className="px-5 py-3 text-start">{labels.accountRole}</th><th className="px-5 py-3 text-start">{labels.relationship}</th><th className="px-5 py-3 text-start">{labels.status}</th><th className="px-5 py-3 text-end">{labels.actions}</th></tr></thead><tbody>{rows.map((row) => <tr className="border-b border-slate-100 last:border-0" key={row.user_id}><td className="px-5 py-4 font-medium text-slate-950">{row.full_name}</td><td className="px-5 py-4 text-slate-600">{row.email}</td><td className="px-5 py-4 text-slate-600">{row.phone || '—'}</td><td className="px-5 py-4 text-slate-600">{row.role_label.replaceAll('_', ' ')}</td><td className="px-5 py-4 text-slate-600">{row.relationship_name || '—'}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.account_status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{row.account_status}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-1"><Button aria-label={labels.edit} onClick={() => setEditing(row)} size="sm" type="button" variant="ghost"><Pencil className="size-4" /></Button><Button aria-label={row.account_status === 'ACTIVE' ? labels.suspend : labels.activate} disabled={pending} onClick={() => setStatusTarget(row)} size="sm" type="button" variant="ghost"><Power className="size-4" /></Button></div></td></tr>)}</tbody></table> : <p className="p-8 text-center text-sm text-slate-500">{labels.empty}</p>}
        </CardContent>
      </Card>
      <Dialog closeLabel={labels.close} onClose={() => setEditing(null)} open={Boolean(editing)} title={labels.edit}>
        {editing ? <form className="grid gap-4" onSubmit={submitEdit}><FormField id="editFullName" label={labels.fullName} required><Input defaultValue={editing.full_name} id="editFullName" name="fullName" required /></FormField><FormField id="editPhone" label={labels.phone}><Input defaultValue={editing.phone ?? ''} id="editPhone" name="phone" /></FormField>{accountType === 'patients' ? <><FormField id="editBirth" label={labels.birth}><Input defaultValue={editing.date_of_birth ?? ''} id="editBirth" name="dateOfBirth" type="date" /></FormField><FormField id="editGender" label={labels.gender}><Select defaultValue={editing.gender ?? ''} id="editGender" name="gender"><option value="">{labels.select}</option><option value="FEMALE">{labels.female}</option><option value="MALE">{labels.male}</option><option value="OTHER">{labels.other}</option><option value="PREFER_NOT_TO_SAY">{labels.prefer}</option></Select></FormField></> : null}<Button loading={pending}>{labels.saveChanges}</Button></form> : null}
      </Dialog>
    </div>
  );
}
