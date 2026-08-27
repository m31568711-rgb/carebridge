export const appRoles = [
  'SUPER_ADMIN',
  'ADMIN',
  'PATIENT',
  'HOSPITAL_ADMIN',
  'HOSPITAL_COORDINATOR',
  'DOCTOR',
  'PHARMACY',
] as const;

export type AppRole = (typeof appRoles)[number];

export type PortalKey = 'admin' | 'patient' | 'hospital' | 'doctor' | 'pharmacy';

export const portalRoles: Record<PortalKey, readonly AppRole[]> = {
  admin: ['SUPER_ADMIN', 'ADMIN'],
  patient: ['PATIENT'],
  hospital: ['HOSPITAL_ADMIN', 'HOSPITAL_COORDINATOR'],
  doctor: ['DOCTOR'],
  pharmacy: ['PHARMACY'],
};

export const rolePortal: Record<AppRole, PortalKey> = {
  SUPER_ADMIN: 'admin',
  ADMIN: 'admin',
  PATIENT: 'patient',
  HOSPITAL_ADMIN: 'hospital',
  HOSPITAL_COORDINATOR: 'hospital',
  DOCTOR: 'doctor',
  PHARMACY: 'pharmacy',
};

const portalPriority: AppRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'HOSPITAL_ADMIN',
  'HOSPITAL_COORDINATOR',
  'DOCTOR',
  'PHARMACY',
  'PATIENT',
];

export function resolvePortalForRoles(roles: readonly AppRole[]): PortalKey {
  const role = portalPriority.find((candidate) => roles.includes(candidate));
  return role ? rolePortal[role] : 'patient';
}

export function hasAllowedRole(roles: readonly AppRole[], allowed: readonly AppRole[]) {
  return roles.some((role) => allowed.includes(role));
}
