export const appRoles = [
  'SUPER_ADMIN',
  'ADMIN',
  'PATIENT',
  'HOSPITAL_ADMIN',
  'HOSPITAL_COORDINATOR',
  'DOCTOR',
  'PHARMACY',
  'PROVIDER',
] as const;

export type AppRole = (typeof appRoles)[number];

export type PortalKey = 'admin' | 'patient' | 'hospital' | 'doctor' | 'pharmacy' | 'provider';

export const portalRoles: Record<PortalKey, readonly AppRole[]> = {
  admin: ['SUPER_ADMIN', 'ADMIN'],
  patient: ['PATIENT'],
  hospital: ['HOSPITAL_ADMIN', 'HOSPITAL_COORDINATOR'],
  doctor: ['DOCTOR'],
  pharmacy: ['PHARMACY'],
  provider: ['PROVIDER', 'HOSPITAL_ADMIN', 'HOSPITAL_COORDINATOR', 'PHARMACY'],
};

export const rolePortal: Record<AppRole, PortalKey> = {
  SUPER_ADMIN: 'admin',
  ADMIN: 'admin',
  PATIENT: 'patient',
  HOSPITAL_ADMIN: 'provider',
  HOSPITAL_COORDINATOR: 'provider',
  DOCTOR: 'doctor',
  PHARMACY: 'provider',
  PROVIDER: 'provider',
};

const portalPriority: AppRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'HOSPITAL_ADMIN',
  'HOSPITAL_COORDINATOR',
  'DOCTOR',
  'PHARMACY',
  'PROVIDER',
  'PATIENT',
];

export function resolvePortalForRoles(roles: readonly AppRole[]): PortalKey {
  const role = portalPriority.find((candidate) => roles.includes(candidate));
  return role ? rolePortal[role] : 'patient';
}

export function hasAllowedRole(roles: readonly AppRole[], allowed: readonly AppRole[]) {
  return roles.some((role) => allowed.includes(role));
}
