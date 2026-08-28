import { z } from 'zod';

const nullableUuid = z.string().uuid().or(z.literal('')).transform((value) => value || null);
export const offerSchema = z.object({
  case_id: z.string().uuid(), treatment_id: z.string().uuid(), recommendation_id: nullableUuid, doctor_id: nullableUuid,
  provider_type: z.enum(['HOSPITAL', 'DOCTOR', 'PHARMACY', 'RADIOLOGY_CENTER', 'MEDICAL_LABORATORY']),
  hospital_id: nullableUuid, pharmacy_id: nullableUuid, radiology_center_id: nullableUuid, medical_laboratory_id: nullableUuid,
  title: z.string().trim().min(3).max(180), description: z.string().trim().min(10).max(8000),
  estimated_cost: z.coerce.number().min(0).max(999999999999), currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  estimated_stay_days: z.coerce.number().int().min(0).max(365).optional(), proposed_start_date: z.string().optional(), proposed_end_date: z.string().optional(),
  included_services: z.string().max(4000), excluded_services: z.string().max(4000), provider_notes: z.string().max(4000),
  valid_until: z.string().datetime({ offset: true }).or(z.string().min(10)),
});

export const offerDecisionSchema = z.object({ offer_id: z.string().uuid(), decision: z.enum(['ACCEPTED', 'REJECTED']), decision_note: z.string().trim().max(2000) });
export const bookingUpdateSchema = z.object({ booking_id: z.string().uuid(), status: z.enum(['CONFIRMED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']), planned_arrival: z.string().optional(), planned_care_date: z.string().optional(), estimated_completion: z.string().optional(), provider_notes: z.string().max(4000) });
