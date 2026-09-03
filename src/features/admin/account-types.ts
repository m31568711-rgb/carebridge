export const accountTypes = ['patients', 'doctors', 'provider_staff', 'laboratory_staff', 'radiology_staff'] as const;

export type AccountType = (typeof accountTypes)[number];

export function isAccountType(value: string): value is AccountType {
  return accountTypes.includes(value as AccountType);
}
