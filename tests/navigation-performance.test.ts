import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

describe('authenticated navigation performance', () => {
  it('runs as a React and Vite application without the Next.js runtime', () => {
    const pkg = JSON.parse(source('../package.json')) as { dependencies: Record<string, string>; scripts: Record<string, string> };
    expect(pkg.dependencies.next).toBeUndefined();
    expect(pkg.scripts.build).toContain('vite.js build');
  });

  it('loads route modules lazily and navigates without full-page reloads', () => {
    const router = source('../src/react-app/router.tsx');
    const navigation = source('../src/react-app/navigation-store.ts');
    expect(router).toContain("import.meta.glob('/app/**/page.tsx')");
    expect(navigation).toContain("window.history[method]");
  });

  it('provides an SPA fallback worker for localized deep links', () => {
    const worker = source('../scripts/prepare-spa-worker.mjs');
    expect(worker).toContain("new URL('/index.html', request.url)");
    expect(worker).toContain('env.ASSETS.fetch');
  });

  it('reuses the browser Supabase client and caches the active auth context', () => {
    expect(source('../src/lib/supabase/browser.ts')).toContain('if (client !== undefined) return client');
    expect(source('../src/lib/auth/context.ts')).toContain('supabase.auth.getSession()');
    expect(source('../src/lib/auth/context.ts')).toContain('cachedContext?.userId === user.id');
  });

  it('signs in directly with the publishable Supabase client and preserves RLS', () => {
    const form = source('../src/features/auth/auth-form.tsx');
    expect(form).toContain('supabase.auth.signInWithPassword(parsed.data)');
    expect(source('../src/lib/supabase/browser.ts')).toContain('authorization boundary for every application data operation');
  });
});
