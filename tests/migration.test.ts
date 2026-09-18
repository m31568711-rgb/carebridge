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
const clinicalFollowUpScopeFix = readFileSync(fileURLToPath(new URL('../supabase/migrations/202609090002_clinical_follow_up_scope_fix.sql', import.meta.url)), 'utf8');
const polishAttachments = readFileSync(fileURLToPath(new URL('../supabase/migrations/202608310001_clinical_consultation_attachments.sql', import.meta.url)), 'utf8');
const polishAttachmentPath = readFileSync(fileURLToPath(new URL('../supabase/migrations/202608310002_clinical_attachment_storage_path.sql', import.meta.url)), 'utf8');
const coreDemoPolish = readFileSync(fileURLToPath(new URL('../supabase/migrations/202608310003_core_demo_cycle_polish.sql', import.meta.url)), 'utf8');
const coreCityFix = readFileSync(fileURLToPath(new URL('../supabase/migrations/202608310004_core_city_trigger_fix.sql', import.meta.url)), 'utf8');
const coreNotificationFix = readFileSync(fileURLToPath(new URL('../supabase/migrations/202608310005_core_notification_trigger_fix.sql', import.meta.url)), 'utf8');
const providerRecommendationScope = readFileSync(fileURLToPath(new URL('../supabase/migrations/202608310006_provider_recommendation_scope.sql', import.meta.url)), 'utf8');
const adminAccountManagement = readFileSync(fileURLToPath(new URL('../supabase/migrations/202609020001_admin_account_management.sql', import.meta.url)), 'utf8');
const adminAccountServiceGrants = readFileSync(fileURLToPath(new URL('../supabase/migrations/202609020002_admin_account_service_grants.sql', import.meta.url)), 'utf8');
const customerAccountsFinance = readFileSync(fileURLToPath(new URL('../supabase/migrations/202609080001_customer_accounts_finance.sql', import.meta.url)), 'utf8');
const customerAccountsFinanceScopeFix = readFileSync(fileURLToPath(new URL('../supabase/migrations/202609080002_customer_accounts_finance_scope_fix.sql', import.meta.url)), 'utf8');
const crossRoleReflection = readFileSync(fileURLToPath(new URL('../supabase/migrations/202609090003_cross_role_journey_reflection.sql', import.meta.url)), 'utf8');
const unsettledServiceReassignment = readFileSync(fileURLToPath(new URL('../supabase/migrations/202609090004_unsettled_service_reassignment.sql', import.meta.url)), 'utf8');
const serviceAppointmentScope = readFileSync(fileURLToPath(new URL('../supabase/migrations/202609090005_service_appointment_scope.sql', import.meta.url)), 'utf8');

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
  it('lets the scope trigger validate a booking without granting callers direct execution',()=>{expect(clinicalFollowUpScopeFix).toContain('alter function public.protect_doctor_clinical_row() security definer');expect(clinicalFollowUpScopeFix).toContain("set search_path = ''");expect(clinicalFollowUpScopeFix).toContain('revoke all on function public.protect_doctor_clinical_row() from public, anon, authenticated');expect(clinicalFollowUpScopeFix).not.toContain('grant execute');});
});

describe('demo polish consultation attachments',()=>{
  it('keeps consultation attachments private and doctor-scoped',()=>{expect(polishAttachments).toContain('alter table public.clinical_attachments enable row level security;');expect(polishAttachments).toContain('public.can_manage_clinical_booking(booking_id)');expect(polishAttachments).not.toContain('is_booking_provider');});
  it('shares only attachments explicitly released to the patient',()=>{expect(polishAttachments).toContain('patient_id=auth.uid() and patient_visible');expect(polishAttachments).toContain("values('clinical-attachments','clinical-attachments',false,15728640");});
  it('validates exact storage scope without public access',()=>{expect(polishAttachments).toContain('a.object_path=object_name');expect(polishAttachments).toContain('public.can_access_clinical_attachment_object(name,true)');expect(polishAttachmentPath).toContain('array_length(p,1)<>2');expect(polishAttachments+polishAttachmentPath).not.toMatch(/grant .* to anon/);});
});

describe('core demo cycle polish',()=>{
  it('adds patient demographics and useful clinical history without a patient treatment field',()=>{expect(coreDemoPolish).toContain('add column if not exists date_of_birth');expect(coreDemoPolish).toContain('add column if not exists chronic_conditions');expect(coreDemoPolish).not.toMatch(/medical_cases add column[^;]*treatment_id/);});
  it('enforces country and city consistency in the database',()=>{expect(coreDemoPolish).toContain('validate_country_city_pair');expect(coreDemoPolish).toContain('selected city does not belong to selected country');expect(coreCityFix).toContain('row_data:=to_jsonb(new)');});
  it('notifies each role through authorized core records',()=>{expect(coreDemoPolish).toContain("'case.assigned'");expect(coreDemoPolish).toContain("'recommendation.available'");expect(coreDemoPolish).toContain("'case.ready_for_offer'");expect(coreNotificationFix).toContain('new_data jsonb:=to_jsonb(new)');});
  it('shares submitted recommendations only with the explicitly assigned provider',()=>{expect(providerRecommendationScope).toContain("status='SUBMITTED'");expect(providerRecommendationScope).toContain("a.status='ACTIVE'");expect(providerRecommendationScope).toContain('public.is_case_provider');});
});

describe('Admin account management',()=>{
  it('exposes account listings only through an admin-checked function',()=>{expect(adminAccountManagement).toContain('if not public.is_platform_admin()');expect(adminAccountManagement).toContain('join auth.users u');expect(adminAccountManagement).toContain('revoke all on function public.admin_list_accounts(text) from public;');});
  it('uses existing roles and provider relationships',()=>{expect(adminAccountManagement).toContain('public.user_roles');expect(adminAccountManagement).toContain('public.hospital_memberships');expect(adminAccountManagement).toContain('public.diagnostic_provider_memberships');});
  it('gives the trusted function only the service grants needed for normalized linkage',()=>{expect(adminAccountServiceGrants).toContain('grant select, update on table public.profiles to service_role;');expect(adminAccountServiceGrants).toContain('grant select, insert, delete on table public.user_roles to service_role;');expect(adminAccountServiceGrants).not.toContain('to authenticated');});
});

describe('customer accounts finance',()=>{
  it('stores base cost and the applied CareBridge fee on every new service item',()=>{expect(customerAccountsFinance).toContain('base_unit_amount');expect(customerAccountsFinance).toContain('carebridge_fee_percent');expect(customerAccountsFinance).toContain('carebridge_fee_amount');expect(customerAccountsFinance).toContain('carebridge_fee_percent in (0,30)');expect(customerAccountsFinance).toContain('quantity*base_unit_amount*(1+carebridge_fee_percent/100)');});
  it('preserves issued and paid financial history by allowing hard deletion only for drafts',()=>{expect(customerAccountsFinance).toContain('function public.protect_invoice_delete');expect(customerAccountsFinance).toContain("old.status<>'DRAFT'");expect(customerAccountsFinance).toContain('only draft invoices can be deleted');});
  it('does not introduce anonymous finance access',()=>{expect(customerAccountsFinance).not.toMatch(/grant .*invoice.*to anon/);expect(customerAccountsFinance).not.toMatch(/grant .*payment.*to anon/);});
  it('lets a finance-scoped admin validate invoice links without broad booking reads',()=>{expect(customerAccountsFinanceScopeFix).toContain('security definer');expect(customerAccountsFinanceScopeFix).toContain('public.can_manage_booking_finance');expect(customerAccountsFinanceScopeFix).not.toMatch(/grant .* to anon/);});
});

describe('cross-role Treatment Journey reflection',()=>{
  it('keeps provider settlement normalized against one Journey service',()=>{expect(crossRoleReflection).toContain('create table public.journey_service_settlements');expect(crossRoleReflection).toContain('journey_service_id uuid not null unique references public.journey_services');expect(crossRoleReflection).toContain('agreed_amount numeric(14,2)');});
  it('gives providers only their assigned service and settlement rows',()=>{expect(crossRoleReflection).toContain('public.can_view_assigned_journey_service');expect(crossRoleReflection).toContain("public.is_diagnostic_member('MEDICAL_LABORATORY'");expect(crossRoleReflection).toContain("public.is_diagnostic_member('RADIOLOGY_CENTER'");expect(crossRoleReflection).toContain('journey_service_settlements_provider_read');});
  it('removes provider access to customer invoices and margin',()=>{expect(crossRoleReflection).toContain("select public.has_admin_privilege('finance.manage')");expect(crossRoleReflection).not.toMatch(/can_manage_booking_finance[\s\S]{0,160}is_booking_provider/);});
  it('fixes security-definer search paths and grants only safe read RPCs',()=>{expect(crossRoleReflection).toContain("security definer set search_path=''");expect(crossRoleReflection).toContain('revoke all on function public.sync_journey_service_settlement()');expect(crossRoleReflection).toContain('grant execute on function public.can_view_assigned_journey_service');expect(crossRoleReflection).not.toMatch(/grant execute on function public\.notify_/);});
  it('reflects service, appointment and settlement events through notifications',()=>{expect(crossRoleReflection).toContain('journey_services_assignee_notify');expect(crossRoleReflection).toContain('appointments_assignee_notify');expect(crossRoleReflection).toContain('journey_service_settlements_notify');});
  it('does not grant cross-role finance or service data to anonymous users',()=>{expect(crossRoleReflection).not.toMatch(/grant (?:select|insert|update|delete)[^;]*(?:journey_services|journey_service_settlements|invoices)[^;]*to anon/);});
  it('permits safe reassignment only before any provider settlement exists',()=>{expect(unsettledServiceReassignment).toContain('old.settled_amount>0');expect(unsettledServiceReassignment).toContain("raise exception 'settled provider scope is immutable'");expect(unsettledServiceReassignment).toContain("set search_path=''");expect(unsettledServiceReassignment).not.toContain('grant execute');});
  it('scopes appointments to the exact assigned Journey service',()=>{expect(serviceAppointmentScope).toContain('public.can_manage_assigned_appointment');expect(serviceAppointmentScope).toContain('from public.journey_services s');expect(serviceAppointmentScope).toContain("s.status not in('CANCELLED','ARCHIVED')");expect(serviceAppointmentScope).toContain('appointments_manager_insert');expect(serviceAppointmentScope).toContain('appointments_scoped_update');});
  it('keeps appointment relationship validation privileged but non-callable',()=>{expect(serviceAppointmentScope).toContain('security definer');expect(serviceAppointmentScope).toContain("set search_path=''");expect(serviceAppointmentScope).toContain('revoke all on function public.can_manage_assigned_appointment(public.appointments),public.protect_appointment_change() from public,anon,authenticated');expect(serviceAppointmentScope).not.toMatch(/grant execute on function public\.protect_appointment_change/);});
});
