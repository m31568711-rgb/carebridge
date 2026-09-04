import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { accommodationBookingSchema, accommodationDeleteSchema, accommodationPreferenceSchema, passportSchema, travelPlanSchema } from '@/src/features/travel/validation';

const migration=readFileSync(fileURLToPath(new URL('../supabase/migrations/202609030001_accommodation_travel_passport.sql',import.meta.url)),'utf8');
const reservationFix=readFileSync(fileURLToPath(new URL('../supabase/migrations/202609030002_accommodation_reservation_runtime_fix.sql',import.meta.url)),'utf8');
const notificationFix=readFileSync(fileURLToPath(new URL('../supabase/migrations/202609030003_accommodation_notification_runtime_fix.sql',import.meta.url)),'utf8');
const id='11111111-1111-4111-8111-111111111111';

describe('accommodation and travel validation',()=>{
 it('calculates capacity in a locked database reservation function',()=>{expect(migration).toContain('create function public.reserve_accommodation');expect(migration).toContain('pg_advisory_xact_lock');expect(migration).toContain("reserved_rooms + target_rooms > room_option.available_rooms");expect(migration).toContain('accommodation_bookings_one_current_journey_idx');expect(reservationFix).toContain("'CONFIRMED'::public.accommodation_booking_status");});
 it('keeps local journeys free of accommodation and passport requirements',()=>{expect(migration).toContain("journey_type <> 'INTERNATIONAL_MEDICAL_TRAVEL'");expect(migration).toContain("passport is only collected for CareBridge-arranged travel");expect(migration).not.toMatch(/alter table public\.bookings[\s\S]{0,500}passport/i);});
 it('keeps passport and ticket files private and scoped',()=>{expect(migration).toContain("('travel-documents','travel-documents',false");expect(migration).toContain("bucket_id='travel-documents' and public.can_access_travel_document");expect(migration).toContain('patient_passports_owner_admin_read');expect(migration).not.toMatch(/travel_documents[^;]*to anon/);});
 it('does not put passport values into audit metadata',()=>{const audit=migration.slice(migration.indexOf('create function public.audit_travel_sensitive_change'),migration.indexOf('create function public.notify_accommodation_change'));expect(audit).not.toContain('passport_number');expect(audit).not.toContain('full_name_as_passport');});
 it('routes accommodation notifications without reading fields absent from preference rows',()=>{expect(notificationFix).toContain('row_data:=to_jsonb(new)');expect(notificationFix).not.toContain('new.status');});
 it('supports no stay, later choice, patient choice, and CareBridge arrangement',()=>{for(const value of ['NOT_REQUIRED','PATIENT_WILL_CHOOSE'])expect(accommodationPreferenceSchema.safeParse({booking_id:id,arrangement:value}).success).toBe(true);for(const value of ['PATIENT_SELECTED','CAREBRIDGE_ARRANGED'])expect(accommodationBookingSchema.safeParse({booking_id:id,room_option_id:id,arrangement:value,check_in_date:'2026-10-01',check_out_date:'2026-10-05',number_of_rooms:1,guests:2}).success).toBe(true);});
 it('accepts only valid internal identifiers for accommodation deletion',()=>{expect(accommodationDeleteSchema.safeParse({target_id:id}).success).toBe(true);expect(accommodationDeleteSchema.safeParse({target_id:'not-an-id'}).success).toBe(false);});
 it('rejects invalid stays and incomplete round trips',()=>{expect(accommodationBookingSchema.safeParse({booking_id:id,room_option_id:id,arrangement:'PATIENT_SELECTED',check_in_date:'2026-10-05',check_out_date:'2026-10-01',number_of_rooms:1,guests:1}).success).toBe(false);expect(travelPlanSchema.safeParse({booking_id:id,travel_arrangement:'PATIENT_SELF_ARRANGED',trip_type:'ROUND_TRIP',booking_status:'DRAFT'}).success).toBe(false);});
 it('requires valid passport chronology',()=>{expect(passportSchema.safeParse({booking_id:id,full_name_as_passport:'Demo Patient',passport_number:'P1234567',nationality:'Egyptian',date_of_birth:'1990-01-01',issue_date:'2026-01-01',expiry_date:'2025-01-01'}).success).toBe(false);});
});
