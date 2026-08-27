import { describe, expect, it } from 'vitest';
import { hasAllowedRole, portalRoles, resolvePortalForRoles } from '@/src/config/roles';

describe('role routing', () => {
  it('routes each role to its intended portal', () => {
    expect(resolvePortalForRoles(['PATIENT'])).toBe('patient');
    expect(resolvePortalForRoles(['HOSPITAL_COORDINATOR'])).toBe('hospital');
    expect(resolvePortalForRoles(['DOCTOR'])).toBe('doctor');
    expect(resolvePortalForRoles(['PHARMACY'])).toBe('pharmacy');
    expect(resolvePortalForRoles(['ADMIN'])).toBe('admin');
  });

  it('gives privileged roles priority when a user has more than one role', () => {
    expect(resolvePortalForRoles(['PATIENT', 'SUPER_ADMIN'])).toBe('admin');
  });

  it('requires an explicitly allowed role', () => {
    expect(hasAllowedRole(['DOCTOR'], portalRoles.doctor)).toBe(true);
    expect(hasAllowedRole(['DOCTOR'], portalRoles.patient)).toBe(false);
  });
});
