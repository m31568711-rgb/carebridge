import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationPath = fileURLToPath(new URL('../supabase/migrations/202608270001_initial_foundation.sql', import.meta.url));
const migration = readFileSync(migrationPath, 'utf8');

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
