import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

describe('business record lifecycle controls', () => {
  const config = source('../src/features/admin/config.ts');
  const actions = source('../src/features/admin/actions.ts');
  const accommodation = source('../src/features/travel/accommodation-ui.tsx');

  it('allows hard delete only for removable relationship records', () => {
    expect(config.match(/allowHardDelete: true/g)).toHaveLength(3);
    expect(config).toContain("key: 'hospital_specialties'");
    expect(config).toContain("key: 'doctor_specialties'");
    expect(config).toContain("key: 'doctor_languages'");
    expect(actions).toContain('if (!definition.allowHardDelete');
  });

  it('blocks accommodation deletion in the UI when a booking references it', () => {
    expect(accommodation).toContain('bookedRoomIds');
    expect(accommodation).toContain('bookedPropertyIds');
    expect(accommodation).toContain('blocked={blockedIds.has(o.id)}');
    expect(accommodation).toContain('if(blocked)return');
  });
});
