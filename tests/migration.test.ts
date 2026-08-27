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
