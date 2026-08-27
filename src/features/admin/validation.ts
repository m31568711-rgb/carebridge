import { z } from 'zod';
import { adminModules, type AdminFieldDefinition, type AdminModuleKey } from './config';

export interface AdminValidationResult {
  success: boolean;
  payload: Record<string, unknown>;
  errors: Record<string, string>;
}

// PostgreSQL accepts canonical UUIDs regardless of RFC version; deterministic demo IDs use that broader form.
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const email = z.string().email();
const url = z.string().url();

function parseField(field: AdminFieldDefinition, value: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (field.type === 'boolean') return raw === 'true' || raw === 'on';
  if (!raw) return field.required ? { error: 'required' } : null;
  if (field.type === 'select' && field.options && !field.options.includes(raw)) return { error: 'invalidOption' };
  if (field.type === 'number') {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return { error: 'invalidNumber' };
    if (field.min !== undefined && numeric < field.min) return { error: 'tooSmall' };
    if (field.max !== undefined && numeric > field.max) return { error: 'tooLarge' };
    return numeric;
  }
  if (field.type === 'email' && !email.safeParse(raw).success) return { error: 'invalidEmail' };
  if (field.type === 'url' && !url.safeParse(raw).success) return { error: 'invalidUrl' };
  if ((field.name.endsWith('_id') || field.name === 'user_id' || field.name === 'owner_user_id' || field.name === 'provider_id') && !uuid.safeParse(raw).success) return { error: 'invalidId' };
  if (field.type === 'json') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { error: 'invalidJson' };
      return parsed;
    } catch { return { error: 'invalidJson' }; }
  }
  return raw;
}

export function validateAdminForm(module: AdminModuleKey, formData: FormData): AdminValidationResult {
  const definition = adminModules[module];
  const payload: Record<string, unknown> = {};
  const grouped: Record<string, Record<string, string>> = {};
  const errors: Record<string, string> = {};

  for (const field of definition.fields) {
    const parsed = parseField(field, formData.get(field.name));
    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      errors[field.name] = String(parsed.error);
      continue;
    }
    if (field.group) {
      const locale = field.name.endsWith('_fr') ? 'fr' : field.name.endsWith('_ar') ? 'ar' : 'en';
      grouped[field.group] ??= {};
      if (typeof parsed === 'string' && parsed) grouped[field.group][locale] = parsed;
    } else {
      payload[field.name] = parsed;
    }
  }

  Object.assign(payload, grouped);

  if (module === 'countries') {
    if (typeof payload.iso2 === 'string') payload.iso2 = payload.iso2.toUpperCase();
    if (typeof payload.iso3 === 'string') payload.iso3 = payload.iso3.toUpperCase();
    if (typeof payload.currency_code === 'string') payload.currency_code = payload.currency_code.toUpperCase();
  }
  if (module === 'hospital_treatments' && typeof payload.currency === 'string') payload.currency = payload.currency.toUpperCase();
  if (module === 'provider_documents' || module === 'provider_accreditations') {
    const providerType = payload.provider_type;
    const providerId = payload.provider_id;
    delete payload.provider_id;
    payload.hospital_id = providerType === 'HOSPITAL' ? providerId : null;
    payload.doctor_id = providerType === 'DOCTOR' ? providerId : null;
    payload.pharmacy_id = providerType === 'PHARMACY' ? providerId : null;
    payload.radiology_center_id = providerType === 'RADIOLOGY_CENTER' ? providerId : null;
    payload.medical_laboratory_id = providerType === 'MEDICAL_LABORATORY' ? providerId : null;
  }

  return { success: Object.keys(errors).length === 0, payload, errors };
}

export function getInitialFieldValue(row: Record<string, unknown> | null, field: AdminFieldDefinition): string | boolean {
  if (!row) return field.type === 'boolean' ? false : '';
  if (field.group) {
    const locale = field.name.endsWith('_fr') ? 'fr' : field.name.endsWith('_ar') ? 'ar' : 'en';
    const group = row[field.group];
    return group && typeof group === 'object' && !Array.isArray(group) ? String((group as Record<string, unknown>)[locale] ?? '') : '';
  }
  if (field.name === 'provider_id') {
    return String(row.hospital_id ?? row.doctor_id ?? row.pharmacy_id ?? row.radiology_center_id ?? row.medical_laboratory_id ?? '');
  }
  const value = row[field.name];
  if (field.type === 'boolean') return Boolean(value);
  if (field.type === 'json') return value && typeof value === 'object' ? JSON.stringify(value, null, 2) : '';
  return value === null || value === undefined ? '' : String(value);
}
