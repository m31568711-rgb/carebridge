
import { revalidatePath } from '@/src/react-app/compat/cache';
import { z } from 'zod';
import { adminModuleKeys, adminModules, type AdminModuleKey } from './config';
import { validateAdminForm } from './validation';
import { isLocale } from '@/src/i18n/config';
import { requireRoles } from '@/src/lib/auth/context';
import { getSupabaseBrowserClient } from '@/src/lib/supabase/browser';

export interface AdminActionState {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string>;
}

const actionHeader = z.object({ module: z.enum(adminModuleKeys), locale: z.string(), record_id: z.string().optional() });

function safeDatabaseMessage(code?: string) {
  if (code === '23505') return 'duplicate';
  if (code === '23503') return 'referenced';
  if (code === '42501') return 'permission';
  return 'failed';
}

export async function saveAdminRecord(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const header = actionHeader.safeParse({ module: formData.get('module'), locale: formData.get('locale'), record_id: formData.get('record_id') || undefined });
  if (!header.success || !isLocale(header.data.locale)) return { status: 'error', message: 'invalidRequest' };
  const { module, locale, record_id: recordId } = header.data;
  const definition = adminModules[module];
  const context = await requireRoles(locale, ['SUPER_ADMIN', 'ADMIN']);
  const supabase = await getSupabaseBrowserClient();
  if (!supabase) return { status: 'error', message: 'configuration' };

  const validation = validateAdminForm(module, formData);
  if (!validation.success) return { status: 'error', message: 'validation', fieldErrors: validation.errors };
  const payload = { ...validation.payload };

  if (module === 'provider_documents') {
    payload.storage_bucket = 'provider-private';
    payload.uploaded_by = context.userId;
    if (payload.status && payload.status !== 'PENDING') {
      payload.reviewed_by = context.userId;
      payload.reviewed_at = new Date().toISOString();
    }
  }

  let result;
  if (recordId && definition.idFields.length === 1) {
    result = await supabase.from(definition.table).update(payload).eq(definition.idFields[0], recordId);
  } else if (definition.onConflict) {
    result = await supabase.from(definition.table).upsert(payload, { onConflict: definition.onConflict });
  } else {
    result = await supabase.from(definition.table).insert(payload);
  }

  if (result.error) return { status: 'error', message: safeDatabaseMessage(result.error.code), fieldErrors: {} };
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/admin/${module}`);
  return { status: 'success', message: 'saved' };
}

const statusInput = z.object({ module: z.enum(adminModuleKeys), locale: z.string(), id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i), active: z.enum(['true', 'false']) });

export async function setAdminRecordActive(formData: FormData) {
  const parsed = statusInput.safeParse({ module: formData.get('module'), locale: formData.get('locale'), id: formData.get('id'), active: formData.get('active') });
  if (!parsed.success || !isLocale(parsed.data.locale)) return;
  const { module, locale, id, active } = parsed.data;
  await requireRoles(locale, ['SUPER_ADMIN', 'ADMIN']);
  const supabase = await getSupabaseBrowserClient();
  if (!supabase) return;
  const definition = adminModules[module];
  if (!definition.statusField || definition.idFields.length !== 1) return;
  const value = definition.statusField === 'is_active' ? active === 'true' : active === 'true' ? 'ACTIVE' : 'INACTIVE';
  await supabase.from(definition.table).update({ [definition.statusField]: value }).eq(definition.idFields[0], id);
  revalidatePath(`/${locale}/admin/${module}`);
}

export async function deleteAdminRecord(formData: FormData) {
  const moduleValue = String(formData.get('module') ?? '');
  const localeValue = String(formData.get('locale') ?? '');
  if (!adminModuleKeys.includes(moduleValue as AdminModuleKey) || !isLocale(localeValue)) return;
  const moduleKey = moduleValue as AdminModuleKey;
  const definition = adminModules[moduleKey];
  if (!definition.idFields.length) return;
  await requireRoles(localeValue, ['SUPER_ADMIN', 'ADMIN']);
  const supabase = await getSupabaseBrowserClient();
  if (!supabase) return;
  let query = supabase.from(definition.table).delete();
  for (const key of definition.idFields) {
    const value = formData.get(key);
    if (typeof value !== 'string' || !value) return;
    query = query.eq(key, value);
  }
  await query;
  revalidatePath(`/${localeValue}/admin/${moduleKey}`);
}
