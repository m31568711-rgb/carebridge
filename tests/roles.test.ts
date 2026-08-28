import { describe, expect, it } from 'vitest';
import { hasAllowedRole, portalRoles, resolvePortalForRoles, usesDiagnosticProviderLanding } from '@/src/config/roles';

describe('role routing', () => {
  it('routes each role to its intended portal', () => {
    expect(resolvePortalForRoles(['PATIENT'])).toBe('patient');
    expect(resolvePortalForRoles(['HOSPITAL_COORDINATOR'])).toBe('provider');
    expect(resolvePortalForRoles(['DOCTOR'])).toBe('doctor');
    expect(resolvePortalForRoles(['PHARMACY'])).toBe('provider');
    expect(resolvePortalForRoles(['PROVIDER'])).toBe('provider');
    expect(resolvePortalForRoles(['ADMIN'])).toBe('admin');
  });

  it('uses the diagnostic landing only for diagnostic provider role sets', () => {
    expect(usesDiagnosticProviderLanding(['PROVIDER'])).toBe(true);
    expect(usesDiagnosticProviderLanding(['PROVIDER', 'HOSPITAL_COORDINATOR'])).toBe(false);
    expect(usesDiagnosticProviderLanding(['PHARMACY'])).toBe(false);
  });

  it('gives privileged roles priority when a user has more than one role', () => {
    expect(resolvePortalForRoles(['PATIENT', 'SUPER_ADMIN'])).toBe('admin');
  });

  it('requires an explicitly allowed role', () => {
    expect(hasAllowedRole(['DOCTOR'], portalRoles.doctor)).toBe(true);
    expect(hasAllowedRole(['DOCTOR'], portalRoles.patient)).toBe(false);
  });
});
