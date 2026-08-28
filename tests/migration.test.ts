import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationPath = fileURLToPath(new URL('../supabase/migrations/202608270001_initial_foundation.sql', import.meta.url));
const migration = readFileSync(migrationPath, 'utf8');
const adminMigrationPath = fileURLToPath(new URL('../supabase/migrations/202608270002_admin_master_data.sql', import.meta.url));
const adminMigration = readFileSync(adminMigrationPath, 'utf8');
const apiGrantsMigrationPath = fileURLToPath(new URL('../supabase/migrations/202608270003_api_role_grants.sql', import.meta.url));
const apiGrantsMigration = readFileSync(apiGrantsMigrationPath, 'utf8');
const part3MigrationPath = fileURLToPath(new URL('../supabase/migrations/202608270004_patient_cases_discovery.sql', import.meta.url));
const part3Migration = readFileSync(part3MigrationPath, 'utf8');
const part4MigrationPath = fileURLToPath(new URL('../supabase/migrations/202608280001_offers_bookings_application.sql', import.meta.url));
const part4Migration = readFileSync(part4MigrationPath, 'utf8');
const part4HardeningPath = fileURLToPath(new URL('../supabase/migrations/202608280002_part4_rls_hardening.sql', import.meta.url));
const part4Hardening = readFileSync(part4HardeningPath, 'utf8');
const part4DoctorScopePath = fileURLToPath(new URL('../supabase/migrations/202608280003_part4_offer_doctor_scope.sql', import.meta.url));
const part4DoctorScope = readFileSync(part4DoctorScopePath, 'utf8');
const part4DoctorGrantPath = fileURLToPath(new URL('../supabase/migrations/202608280004_part4_offer_doctor_grant.sql', import.meta.url));
const part4DoctorGrant = readFileSync(part4DoctorGrantPath, 'utf8');
const part5Migration = readFileSync(fileURLToPath(new URL('../supabase/migrations/202608290001_care_operations_payments_travel.sql', import.meta.url)), 'utf8');
const part5NotificationFix = readFileSync(fileURLToPath(new URL('../supabase/migrations/202608290002_part5_payment_completion_notification.sql', import.meta.url)), 'utf8');
const part5TriggerFix = readFileSync(fileURLToPath(new URL('../supabase/migrations/202608290003_part5_polymorphic_event_triggers.sql', import.meta.url)), 'utf8');
const part5ProofFix = readFileSync(fileURLToPath(new URL('../supabase/migrations/202608290004_part5_payment_proof_path.sql', import.meta.url)), 'utf8');
const part6Migration = readFileSync(fileURLToPath(new URL('../supabase/migrations/202608300001_operational_clinical_workflow.sql', import.meta.url)), 'utf8');
const part6Hardening = readFileSync(fileURLToPath(new URL('../supabase/migrations/202608300002_part6_clinical_hardening.sql', import.meta.url)), 'utf8');

const exposedTables = [
  'countries', 'cities', 'profiles', 'user_roles', 'specialties', 'treatments',
  'hospitals', 'hospital_branches', 'hospital_specialties', 'hospital_treatments',
  'hospital_memberships', 'doctors', 'doctor_specialties', 'doctor_hospitals',
  'pharmacies', 'provider_documents', 'provider_accreditations', 'notifications',
  'audit_logs', 'app_settings',
];

describe('initial database migration', () => {
  it.each(exposedTables)('enables RLS on %s', (table) => {
    expect(migration).toContain(`alter table public.${table} enable row level security;`);
  });

  it('does not grant the generic audit function to browser roles', () => {
    expect(migration).toContain('grant execute on function public.insert_audit_event(public.audit_action, text, uuid, jsonb) to service_role;');
    expect(migration).not.toContain('grant execute on function public.insert_audit_event(public.audit_action, text, uuid, jsonb) to authenticated;');
  });

  it('limits notification recipients to the read timestamp column', () => {
    expect(migration).toContain('grant update (read_at) on public.notifications to authenticated;');
  });
});

describe('patient cases and provider discovery migration', () => {
  it('keeps treatment selection out of patient cases and in doctor recommendations', () => {
    const caseTable = part3Migration.slice(part3Migration.indexOf('create table public.medical_cases'), part3Migration.indexOf('create table public.case_doctor_assignments'));
    expect(caseTable).not.toContain('treatment_id');
    expect(part3Migration).toContain('create table public.treatment_recommendations');
    expect(part3Migration).toContain('treatment_id uuid not null references public.treatments');
  });

  it.each(['medical_cases', 'case_doctor_assignments', 'case_documents', 'treatment_recommendations', 'radiology_centers', 'medical_laboratories'])('enables RLS on %s', (table) => {
    expect(part3Migration).toContain(`alter table public.${table} enable row level security;`);
  });

  it('uses a private constrained medical-document bucket with case-scoped policies', () => {
    expect(part3Migration).toContain("values ('patient-medical', 'patient-medical', false, 26214400");
    expect(part3Migration).toContain('public.can_access_case_object(name, true)');
    expect(part3Migration).not.toMatch(/grant select on table public\.medical_cases[^;]*to anon/);
  });

  it('discovers only active verified providers using server-side filters', () => {
    expect(part3Migration).toContain('create function public.search_providers');
    expect(part3Migration).toContain("r.status = 'ACTIVE' and r.verification_state = 'VERIFIED'");
    expect(part3Migration).toContain("l.status = 'ACTIVE' and l.verification_state = 'VERIFIED'");
    expect(part3Migration).toContain('p_offset integer default 0');
  });

  it('extends provider evidence relationships to both diagnostic provider types', () => {
    expect(part3Migration).toContain('add column radiology_center_id uuid references public.radiology_centers');
    expect(part3Migration).toContain('add column medical_laboratory_id uuid references public.medical_laboratories');
  });
});

describe('admin and master-data migration', () => {
  it('normalizes clinician languages and protects them with RLS', () => {
    expect(adminMigration).toContain('create table public.doctor_languages');
    expect(adminMigration).toContain('alter table public.doctor_languages enable row level security;');
  });

  it('supports every provider verification state', () => {
    for (const state of ['DRAFT', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED']) {
      expect(adminMigration).toContain(`'${state}'`);
    }
  });

  it('keeps self-verification behind scoped database permissions', () => {
    expect(adminMigration).toContain("public.has_admin_privilege('providers.verify')");
    expect(adminMigration).toContain("raise exception 'verification fields require provider verification permission'");
  });

  it('audits provider and master-data changes without a client audit grant', () => {
    expect(adminMigration).toContain('create function public.audit_admin_change()');
    expect(adminMigration).toContain('create trigger hospitals_audit');
    expect(adminMigration).not.toContain('grant execute on function public.audit_admin_change() to authenticated');
  });
});

describe('offers and booking journey migration', () => {
  it.each(['case_provider_assignments', 'offers', 'bookings', 'booking_events'])('enables RLS on %s', (table) => {
    expect(part4Migration).toContain(`alter table public.${table} enable row level security;`);
  });

  it('scopes providers through explicit case assignments and organization ownership', () => {
    expect(part4Migration).toContain('create function public.is_case_provider');
    expect(part4Migration).toContain("a.status = 'ACTIVE'");
    expect(part4Migration).toContain('public.is_hospital_member(a.hospital_id)');
  });

  it('enforces one accepted offer and creates a normalized booking on acceptance', () => {
    expect(part4Migration).toContain("offers_one_accepted_per_case_uidx on public.offers(case_id) where status = 'ACCEPTED'");
    expect(part4Migration).toContain('create function public.create_booking_for_accepted_offer()');
    expect(part4Migration).toContain('insert into public.bookings');
  });

  it('locks sent offer content and records booking lifecycle events', () => {
    expect(part4Migration).toContain("raise exception 'sent offer contents are locked'");
    expect(part4Migration).toContain('create trigger bookings_history');
    expect(part4Migration).toContain('create trigger offers_audit');
    expect(part4Migration).toContain('create trigger bookings_audit');
  });

  it('keeps private journey records unavailable to anonymous users', () => {
    expect(part4Migration).not.toMatch(/grant (?:select|insert|update|delete)[^;]*public\.(?:offers|bookings|booking_events)[^;]*to anon/);
  });

  it('keeps drafts private and checks doctor assignments without broad table visibility', () => {
    expect(part4Hardening).toContain("target_offer.status not in ('DRAFT', 'WITHDRAWN')");
    expect(part4DoctorScope).toContain('create function public.is_doctor_assigned_to_case');
    expect(part4DoctorScope).toContain('security definer');
    expect(part4DoctorGrant).toContain('grant execute on function public.is_doctor_assigned_to_case(uuid, uuid) to authenticated;');
    expect(part4DoctorGrant).not.toContain('grant select on');
  });
});

describe('API role grants migration', () => {
  it('allows public directory reads without exposing private provider documents', () => {
    expect(apiGrantsMigration).toContain('public.hospitals');
    expect(apiGrantsMigration).not.toMatch(/provider_documents,[\s\S]*?to anon;/);
  });

  it('preserves column-restricted profile and notification updates', () => {
    expect(apiGrantsMigration).toContain('revoke update on table public.profiles from authenticated;');
    expect(apiGrantsMigration).toContain('grant update (read_at) on table public.notifications to authenticated;');
  });
});

describe('Part 5 care operations migration',()=>{
  it.each(['appointments','invoices','invoice_items','payment_records','payment_documents','travel_plans','transport_arrangements','journey_events'])('normalizes and protects %s',(table)=>{expect(part5Migration).toContain(`create table public.${table}`);expect(part5Migration).toContain(`alter table public.${table} enable row level security;`);});
  it('separates scheduling, finance, and travel authorization',()=>{expect(part5Migration).toContain('create function public.can_schedule_booking');expect(part5Migration).toContain('create function public.can_manage_booking_finance');expect(part5Migration).toContain('create function public.can_manage_booking_travel');expect(part5Migration).not.toMatch(/can_manage_booking_finance[\s\S]{0,180}is_booking_doctor/);});
  it('keeps payment proof private and constrained',()=>{expect(part5Migration).toContain("values('payment-proofs','payment-proofs',false,10485760");expect(part5Migration).toContain('public.can_access_payment_proof(name,true)');expect(part5Migration).toContain('create function public.protect_payment_document');});
  it('prevents browser-written totals and overpayments',()=>{expect(part5Migration).toContain("raise exception 'invoice totals are server managed'");expect(part5Migration).toContain("raise exception 'payment exceeds outstanding amount'");});
  it('does not grant private operations to anonymous users',()=>{expect(part5Migration).not.toMatch(/grant (?:select|insert|update|delete)[^;]*(?:appointments|invoices|payment_records|travel_plans)[^;]*to anon/);});
  it('notifies the patient when manual tracking reaches paid',()=>{expect(part5NotificationFix).toContain("target_patient,'payment.completed'");expect(part5NotificationFix).toContain("next_status='PAID'");});
  it('handles heterogeneous trigger rows without dereferencing missing columns',()=>{expect(part5TriggerFix).toContain('new_data jsonb:=to_jsonb(new)');expect(part5TriggerFix).not.toContain('new.status');expect(part5TriggerFix).toContain("then 'appointment' else 'booking'");});
  it('validates all three payment-proof path scope segments',()=>{expect(part5ProofFix).toContain('path_payment:=parts[3]::uuid');expect(part5ProofFix).toContain('from public.payment_records');});
});

describe('Part 6 operational clinical workflow migration',()=>{
  it.each(['clinical_encounters','prescriptions','prescription_items','lab_orders','lab_order_tests','lab_results','radiology_orders','radiology_results','clinical_result_documents','clinical_follow_ups'])('normalizes and protects %s',(table)=>{expect(part6Migration).toContain(`create table public.${table}`);expect(part6Migration).toContain(`alter table public.${table} enable row level security;`);});
  it('keeps doctor notes private and provider coordinators outside clinical scope',()=>{expect(part6Migration).toContain("select public.is_booking_doctor(target_booking) or public.has_admin_privilege('clinical.support')");expect(part6Migration).not.toMatch(/lab_orders_read[^;]+is_booking_provider/);expect(part6Migration).not.toMatch(/radiology_orders_read[^;]+is_booking_provider/);});
  it('releases results explicitly and protects exact private storage paths',()=>{expect(part6Migration).toContain('r.released_at is not null');expect(part6Migration).toContain("values('clinical-results','clinical-results',false,26214400");expect(part6Migration).toContain('protect_clinical_result_document');expect(part6Migration).toContain('array_length(parts,1)<>3');expect(part6Migration).not.toContain('createSignedUrl');});
  it('protects clinical completion from patient booking updates',()=>{expect(part6Migration).toContain('create function public.protect_booking_clinical_status');expect(part6Migration).toContain("raise exception 'clinical journey status change is not permitted'");});
  it('keeps sensitive contents out of general audit metadata',()=>{expect(part6Migration).toContain('execute function public.audit_admin_change()');expect(part6Migration).not.toMatch(/insert into public\.audit_logs[^;]*(?:clinical_notes|diagnosis_summary|result_notes|report_notes)/);});
  it('does not grant clinical data to anonymous users',()=>{expect(part6Migration).not.toMatch(/grant (?:select|insert|update|delete)[^;]*(?:clinical_encounters|prescriptions|lab_orders|radiology_orders|lab_results)[^;]*to anon/);});
  it('lets diagnostic triggers verify relationships without broad booking visibility',()=>{expect(part6Hardening).toContain('create function public.clinical_scope_matches');expect(part6Hardening).toContain('security definer');expect(part6Hardening).toContain("doctor cannot manage laboratory processing status");expect(part6Hardening).toContain("doctor cannot manage radiology processing status");});
  it('locks released results, result paths, and follow-up transitions',()=>{expect(part6Hardening).toContain("released laboratory result is immutable");expect(part6Hardening).toContain("released radiology result is immutable");expect(part6Hardening).toContain("object_name!~'^[0-9a-f-]{36}/(lab|radiology)");expect(part6Hardening).toContain("raise exception 'invalid follow-up transition'");});
});
