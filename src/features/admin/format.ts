import type { Locale } from '@/src/i18n/config';
import type { LookupMap } from './data';
import { lookupForColumn } from './data';

export function localizedValue(value: unknown, locale: Locale) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const record = value as Record<string, unknown>;
  return String(record[locale] ?? record.en ?? record.fr ?? record.ar ?? '');
}

const enumTranslations: Record<Locale, Record<string, string>> = {
  en: { DRAFT:'Draft',ACTIVE:'Active',INACTIVE:'Inactive',ARCHIVED:'Archived',PENDING_REVIEW:'Pending review',VERIFIED:'Verified',REJECTED:'Rejected',SUSPENDED:'Suspended',PENDING:'Pending',UNDER_REVIEW:'Under review',APPROVED:'Approved',EXPIRED:'Expired',BASIC:'Basic',CONVERSATIONAL:'Conversational',PROFESSIONAL:'Professional',NATIVE:'Native',HOSPITAL:'Hospital',DOCTOR:'Doctor',PHARMACY:'Pharmacy' },
  fr: { DRAFT:'Brouillon',ACTIVE:'Actif',INACTIVE:'Inactif',ARCHIVED:'Archivé',PENDING_REVIEW:'En attente',VERIFIED:'Vérifié',REJECTED:'Rejeté',SUSPENDED:'Suspendu',PENDING:'En attente',UNDER_REVIEW:'En cours de vérification',APPROVED:'Approuvé',EXPIRED:'Expiré',BASIC:'Notions',CONVERSATIONAL:'Conversationnel',PROFESSIONAL:'Professionnel',NATIVE:'Langue maternelle',HOSPITAL:'Hôpital',DOCTOR:'Médecin',PHARMACY:'Pharmacie' },
  ar: { DRAFT:'مسودة',ACTIVE:'نشط',INACTIVE:'غير نشط',ARCHIVED:'مؤرشف',PENDING_REVIEW:'بانتظار المراجعة',VERIFIED:'تم التحقق',REJECTED:'مرفوض',SUSPENDED:'موقوف',PENDING:'قيد الانتظار',UNDER_REVIEW:'قيد المراجعة',APPROVED:'معتمد',EXPIRED:'منتهي',BASIC:'أساسي',CONVERSATIONAL:'محادثة',PROFESSIONAL:'مهني',NATIVE:'لغة أم',HOSPITAL:'مستشفى',DOCTOR:'طبيب',PHARMACY:'صيدلية' },
};

export function formatEnum(value: string, locale: Locale) { return enumTranslations[locale][value] ?? value.replaceAll('_', ' ').toLowerCase(); }

export function formatCell(column: string, value: unknown, locale: Locale, lookups: LookupMap) {
  if (column.endsWith('_i18n')) return localizedValue(value, locale);
  const lookupKey = lookupForColumn(column);
  if (lookupKey && value) return lookups[lookupKey]?.find((option) => option.value === String(value))?.label ?? String(value).slice(0, 8);
  if (typeof value === 'boolean') return value ? (locale === 'ar' ? 'نعم' : locale === 'fr' ? 'Oui' : 'Yes') : (locale === 'ar' ? 'لا' : locale === 'fr' ? 'Non' : 'No');
  if (typeof value === 'number') return new Intl.NumberFormat(locale).format(value);
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' && /^[A-Z_]+$/.test(value)) return formatEnum(value, locale);
  return String(value);
}
