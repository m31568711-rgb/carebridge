import { z } from 'zod';

const optionalUuid = z.union([z.literal(''), z.uuid()]).transform((value) => value || null);
const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null);

export const medicalCaseSchema = z.object({
  specialty_id: z.uuid(),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(8000),
  symptoms_notes: optionalText(8000),
  chronic_conditions: optionalText(4000).optional().transform((value) => value ?? null),
  current_medications: optionalText(4000).optional().transform((value) => value ?? null),
  allergies: optionalText(4000).optional().transform((value) => value ?? null),
  preferred_country_id: optionalUuid,
  preferred_city_id: optionalUuid,
  location_preference: optionalText(500),
});

export const patientProfileSchema = z.object({
  first_name: z.string().trim().min(1).max(80), last_name: z.string().trim().min(1).max(80),
  date_of_birth: z.union([z.literal(''), z.iso.date()]).transform((value) => value || null),
  gender: z.enum(['', 'FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY']).transform((value) => value || null),
  country_id: optionalUuid, city_id: optionalUuid, address_text: optionalText(500), location_details: optionalText(500),
  google_place_id: optionalText(255),
  latitude: z.union([z.literal(''), z.coerce.number().min(-90).max(90)]).transform((value) => value === '' ? null : value),
  longitude: z.union([z.literal(''), z.coerce.number().min(-180).max(180)]).transform((value) => value === '' ? null : value),
}).refine((value) => (value.latitude === null) === (value.longitude === null), { path: ['latitude'] });

export const caseDocumentSchema = z.object({
  document_type: z.enum(['MEDICAL_REPORT', 'LAB_RESULT', 'RADIOLOGY', 'PRESCRIPTION', 'OTHER']),
  notes: optionalText(1000),
});

export const recommendationSchema = z.object({
  treatment_id: z.uuid(),
  recommendation_notes: z.string().trim().min(10).max(8000),
  next_steps: optionalText(4000),
});

export const allowedCaseMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/dicom'] as const;
export const maxCaseFileBytes = 25 * 1024 * 1024;

export function safeObjectFilename(filename: string) {
  const parts = filename.trim().toLowerCase().split('.');
  const extension = parts.length > 1 ? `.${parts.pop()?.replace(/[^a-z0-9]/g, '').slice(0, 10)}` : '';
  const base = parts.join('.').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'medical-file';
  return `${base}${extension}`;
}
