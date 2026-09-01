import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

describe('authenticated navigation performance', () => {
  it('uses verified JWT claims instead of a remote user lookup in the request path', () => {
    expect(source('../proxy.ts')).toContain('auth.getClaims()');
    expect(source('../src/lib/auth/context.ts')).toContain('auth.getClaims()');
  });

  it('deduplicates the Supabase client and auth context during one server render', () => {
    expect(source('../src/lib/supabase/server.ts')).toContain('cache(async');
    expect(source('../src/lib/auth/context.ts')).toContain('cache(async');
  });

  it('provides a streaming boundary for dynamic portal routes', () => {
    const loading = source('../app/[locale]/(portals)/loading.tsx');
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('animate-pulse');
  });

  it('signs in through the same-origin server endpoint before navigation', () => {
    const form = source('../src/features/auth/auth-form.tsx');
    const route = source('../app/api/auth/login/route.ts');
    expect(form).toContain("fetch('/api/auth/login'");
    expect(route).toContain('supabase.auth.signInWithPassword(parsed.data)');
    expect(route).toContain("origin !== request.nextUrl.origin");
  });
});
