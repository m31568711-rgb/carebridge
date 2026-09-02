import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const edgeFunction = source('../supabase/functions/admin-account-management/index.ts');
const authForm = source('../src/features/auth/auth-form.tsx');
const signupPage = source('../app/[locale]/(auth)/signup/page.tsx');
const supabaseConfig = source('../supabase/config.toml');

describe('Admin-only account provisioning', () => {
  it('disables public signup in UI and local Supabase configuration', () => {
    expect(authForm).not.toContain('auth.signUp');
    expect(signupPage).toContain('redirect(`/${value}/login`)');
    expect(supabaseConfig).not.toContain('enable_signup = true');
  });

  it('requires an Admin or SUPER_ADMIN before creating an Auth user', () => {
    expect(edgeFunction).toContain(".in('role', ['ADMIN', 'SUPER_ADMIN'])");
    expect(edgeFunction.indexOf(".in('role', ['ADMIN', 'SUPER_ADMIN'])")).toBeLessThan(edgeFunction.indexOf('auth.admin.createUser'));
  });

  it('links accounts through the existing normalized role/provider tables', () => {
    expect(edgeFunction).toContain("from('user_roles')");
    expect(edgeFunction).toContain("from('doctors')");
    expect(edgeFunction).toContain("from('hospital_memberships')");
    expect(edgeFunction).toContain("from('diagnostic_provider_memberships')");
  });

  it('never includes a password in application audit metadata', () => {
    const auditBlock = edgeFunction.slice(edgeFunction.indexOf("from('audit_logs')"));
    expect(auditBlock).not.toContain('password');
    expect(edgeFunction).toContain('auth.admin.deleteUser(createdUserId)');
  });
});
