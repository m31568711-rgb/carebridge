import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');
const routeValidator = read('../scripts/live-validate-admin-routes.mjs');
const accountRoute = read('../app/[locale]/(portals)/admin/accounts/[accountType]/page.tsx');

describe('new Admin route runtime stability', () => {
  it('keeps account route validation in a server-compatible module', () => {
    expect(accountRoute).toContain("from '@/src/features/admin/account-types'");
    expect(accountRoute).not.toMatch(/isAccountType[^\n]+admin-account-management/);
  });

  it('keeps an authenticated EN, FR, and AR route validation for every new Admin module', () => {
    for (const locale of ['en', 'fr', 'ar']) expect(routeValidator).toContain(`'${locale}'`);
    for (const route of ['patients', 'doctors', 'provider_staff', 'laboratory_staff', 'radiology_staff', 'admin/accommodation', 'admin/travel']) {
      expect(routeValidator).toContain(`'${route}'`);
    }
    expect(routeValidator).toContain("marker: '@carebridge.test'");
    expect(routeValidator).toContain("role: 'SUPER_ADMIN'");
    expect(routeValidator).toContain('deleteUser(userId)');
  });
});
